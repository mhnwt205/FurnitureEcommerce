import prisma from '../prismaClient.js';
import { z } from 'zod';
import { attachPricingToProducts } from '../services/promotionPricing.service.js';
import { generateUniqueGuestOrderManagementToken } from '../services/guestOrderToken.service.js';
import { deliverOrderConfirmationEmail } from '../services/orderConfirmationEmail.service.js';
import { GuestOrderTokenError } from '../services/guestOrderToken.service.js';
import {
  getGuestManagedOrderById,
  getGuestOrderManagementDto,
  resolveGuestManagedOrder
} from '../services/guestOrderManagement.service.js';
import {
  CANCELLATION_REASON_CODES,
  ORDER_CANCELLATION_ERROR,
  OrderCancellationError,
  cancelAuthenticatedCustomerOrder,
  cancelGuestOrderById,
  canDirectlyCancelOrder,
  isRefundRequiredForCancellation
} from '../services/orderCancellation.service.js';
import {
  ORDER_REFUND_ERROR,
  OrderRefundError,
  REFUND_STATUS,
  getAdminRefundByRequestId,
  listAdminRefunds,
  resolveManualRefund,
  startManualRefundProcessing,
  toRefundAwareOrderFlags
} from '../services/orderRefund.service.js';
import {
  createVNPayPaymentUrlForOrder,
  getRequestIpAddress
} from '../services/vnpayPayment.service.js';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const optionalEmailSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string' && value.trim() === '') return undefined;
    return value;
  },
  z.string().trim().email().max(255).transform((value) => value.toLowerCase()).optional()
);

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1)
});

const createOrderSchema = z.object({
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: optionalEmailSchema,
  address: z.string().trim().min(1),
  note: z.string().trim().optional(),
  paymentMethod: z.string().trim().min(1),
  items: z.array(orderItemSchema).min(1)
});

const lookupOrderSchema = z.object({
  orderCode: z.string().trim().min(3).max(50).regex(/^[A-Za-z0-9._:-]+$/),
  phone: z.string().trim().min(8).max(30)
});

const cancelOrderSchema = z.object({
  reasonCode: z.enum(CANCELLATION_REASON_CODES),
  reasonText: z.string().trim().max(1000).optional()
}).superRefine((value, ctx) => {
  if (value.reasonCode === 'other' && !value.reasonText) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reasonText'],
      message: 'reasonText is required when reasonCode is other'
    });
  }
});

const guestManagementTokenSchema = z.object({
  token: z.string().trim().min(16).max(512)
});

const guestCancelOrderSchema = guestManagementTokenSchema.merge(cancelOrderSchema);

const adminRefundStatusSchema = z.object({
  status: z.enum([
    REFUND_STATUS.PENDING,
    REFUND_STATUS.PROCESSING,
    REFUND_STATUS.SUCCEEDED,
    REFUND_STATUS.FAILED,
    REFUND_STATUS.UNKNOWN,
    'all'
  ]).optional()
});

const adminRefundParamsSchema = z.object({
  requestId: z.string().trim().min(3).max(255).regex(/^[A-Za-z0-9._:-]+$/)
});

const adminRefundStartSchema = z.object({
  adminNote: z.string().trim().max(1000).optional()
});

const adminRefundResolveSchema = z.object({
  result: z.enum([
    REFUND_STATUS.SUCCEEDED,
    REFUND_STATUS.FAILED,
    REFUND_STATUS.UNKNOWN
  ]),
  providerTransactionId: z.string().trim().max(255).optional(),
  providerResponseCode: z.string().trim().max(100).optional(),
  adminNote: z.string().trim().max(1000).optional()
});

const normalizeLookupOrderCode = (orderCode) => String(orderCode || '').trim().toUpperCase();

const normalizeLookupPhone = (phone) => {
  const compact = String(phone || '').trim().replace(/[\s().-]/g, '');
  if (compact.startsWith('+84')) return `0${compact.slice(3)}`;
  if (compact.startsWith('84') && compact.length >= 10) return `0${compact.slice(2)}`;
  return compact;
};

const isReasonableLookupPhone = (phone) => /^(?:0?\d{8,10})$/.test(phone);

const maskEmail = (email) => {
  const value = String(email || '').trim();
  const [local, domain] = value.split('@');
  if (!local || !domain) return null;
  return `${local[0]}***@${domain}`;
};

const maskPhone = (phone) => {
  const value = String(phone || '').replace(/\D/g, '');
  if (!value) return null;
  return `******${value.slice(-4)}`;
};

const maskFullName = (fullName) => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  return parts.map((part, index) => {
    if (part.length <= 1) return part;
    if (index === 0) return part;
    return `${part[0]}***`;
  }).join(' ');
};

const maskAddress = (address) => {
  const value = String(address || '').trim();
  if (!value) return null;
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.slice(-2).join(', ');
  if (value.length <= 12) return '***';
  return `***${value.slice(-12)}`;
};

const toSafeStatusHistoryDto = (history = []) => history.map((entry) => ({
  id: entry.id,
  fromStatus: entry.fromStatus || null,
  toStatus: entry.toStatus,
  createdAt: entry.createdAt
}));

const stripInternalOrderFields = (order) => {
  if (!order) return order;
  const {
    managementTokenHash,
    managementTokenExpiresAt,
    managementTokenRevokedAt,
    confirmationEmailStatus,
    confirmationEmailClaimedAt,
    confirmationEmailAttemptCount,
    confirmationEmailLastErrorAt,
    confirmationEmailLastErrorCode,
    vnpayTxnRef,
    activeRefundRequestId,
    cancellationProcessingAt,
    activeRefundRequest,
    paymentRefunds,
    ...safeOrder
  } = order;
  return safeOrder;
};

const toCustomerOrderDto = (order) => {
  const refundFlags = toRefundAwareOrderFlags(order);
  return {
    ...stripInternalOrderFields(order),
    statusHistory: order.statusHistory ? toSafeStatusHistoryDto(order.statusHistory) : undefined,
    canCancel: canDirectlyCancelOrder(order) && !refundFlags.refundPending,
    ...refundFlags,
    cancellation: order.cancelledAt ? {
      cancelledAt: order.cancelledAt,
      reasonCode: order.cancellationReasonCode || null,
      reasonText: order.cancellationReasonText || null
    } : null
  };
};

const toAdminOrderDto = (order) => {
  const refundFlags = toRefundAwareOrderFlags(order);
  return {
    ...stripInternalOrderFields(order),
    customerType: order.userId ? 'authenticated' : 'guest',
    customerEmail: order.customerEmail,
    user: order.user || null,
    statusHistory: order.statusHistory ? toSafeStatusHistoryDto(order.statusHistory) : undefined,
    canCancel: canDirectlyCancelOrder(order) && !refundFlags.refundPending,
    ...refundFlags,
    cancellation: order.cancelledAt ? {
      cancelledAt: order.cancelledAt,
      cancelledBy: order.cancelledBy || null,
      reasonCode: order.cancellationReasonCode || null,
      reasonText: order.cancellationReasonText || null,
      inventoryRestored: Boolean(order.inventoryRestoredAt)
    } : null
  };
};

const toPublicOrderLookupDto = (order) => ({
  orderCode: order.orderCode,
  createdAt: order.createdAt,
  status: order.status,
  paymentStatus: order.paymentStatus,
  paymentMethod: order.paymentMethod,
  totalAmount: order.totalAmount,
  customer: {
    fullNameMasked: maskFullName(order.fullName),
    phoneMasked: maskPhone(order.phone),
    emailMasked: maskEmail(order.customerEmail),
    addressMasked: maskAddress(order.address)
  },
  items: (order.orderItems || []).map((item) => ({
    productName: item.productName,
    quantity: item.quantity,
    finalPrice: item.finalPrice ?? item.price,
    subtotal: item.subtotal
  })),
  statusHistory: (order.statusHistory || []).map((entry) => ({
    status: entry.toStatus,
    createdAt: entry.createdAt
  })),
  cancellation: order.cancelledAt ? {
    cancelledAt: order.cancelledAt,
    reasonCode: order.cancellationReasonCode || null,
    reasonText: order.cancellationReasonText || null
  } : null
});

const toCreateOrderDto = (order) => {
  const {
    managementTokenHash,
    managementTokenExpiresAt,
    managementTokenRevokedAt,
    ...safeOrder
  } = order;

  return safeOrder;
};

const isVNPayPaymentMethod = (paymentMethod) => String(paymentMethod || '').toUpperCase() === 'VNPAY';

const getCreateOrderCustomerContext = (req, validatedData) => {
  if (req.user) {
    const customerEmail = normalizeEmail(req.user.email);
    if (!customerEmail) {
      throw new Error('AUTHENTICATED_USER_EMAIL_MISSING');
    }

    return {
      customerType: 'authenticated',
      userId: req.user.id,
      customerEmail,
      changedByName: req.user.fullName || req.user.email || 'Khach hang'
    };
  }

  if (!validatedData.email) {
    throw new Error('GUEST_EMAIL_REQUIRED');
  }

  return {
    customerType: 'guest',
    userId: null,
    customerEmail: validatedData.email,
    changedByName: validatedData.fullName || validatedData.email || 'Khach hang'
  };
};

export const createOrder = async (req, res) => {
  try {
    const validatedData = createOrderSchema.parse(req.body);
    const customerContext = getCreateOrderCustomerContext(req, validatedData);

    const productIds = [...new Set(validatedData.items.map((item) => item.productId))];
    const quantityByProductId = new Map();

    for (const item of validatedData.items) {
      quantityByProductId.set(
        item.productId,
        (quantityByProductId.get(item.productId) || 0) + item.quantity
      );
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });
    const pricedProducts = await attachPricingToProducts(products);
    const productMap = new Map(pricedProducts.map((product) => [product.id, product]));

    for (const productId of productIds) {
      const product = productMap.get(productId);
      if (!product) {
        return res.status(404).json({ message: `Product with ID ${productId} not found` });
      }

      if (!product.isActive) {
        return res.status(400).json({ message: `Product with ID ${productId} is not available` });
      }

      const requestedQuantity = quantityByProductId.get(productId) || 0;
      if (product.stock < requestedQuantity) {
        return res.status(400).json({ message: `Product with ID ${productId} does not have enough stock` });
      }
    }

    let totalAmount = 0;
    const orderItemsData = validatedData.items.map((item) => {
      const product = productMap.get(item.productId);
      const originalPrice = Number(product.price);
      const finalPrice = Number(product.finalPrice ?? product.displayPrice ?? product.price);
      const discountAmount = Number(product.discountAmount ?? Math.max(originalPrice - finalPrice, 0));
      const subtotal = Number((finalPrice * item.quantity).toFixed(2));

      totalAmount = Number((totalAmount + subtotal).toFixed(2));

      return {
        productId: product.id,
        productName: product.name,
        price: finalPrice,
        originalPrice,
        discountAmount,
        finalPrice,
        promotionId: product.promotion?.id ?? null,
        promotionName: product.promotion?.name ?? null,
        quantity: item.quantity,
        subtotal
      };
    });

    const orderCode = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    let rawManagementToken = null;

    const newOrder = await prisma.$transaction(async (tx) => {
      let guestManagementToken = null;
      if (customerContext.customerType === 'guest' && !isVNPayPaymentMethod(validatedData.paymentMethod)) {
        guestManagementToken = await generateUniqueGuestOrderManagementToken(tx);
        rawManagementToken = guestManagementToken.rawToken;
      }

      for (const [productId, quantity] of quantityByProductId.entries()) {
        const stockUpdate = await tx.product.updateMany({
          where: {
            id: productId,
            stock: { gte: quantity }
          },
          data: {
            stock: { decrement: quantity }
          }
        });

        if (stockUpdate.count !== 1) {
          throw new Error(`INSUFFICIENT_STOCK:${productId}`);
        }
      }

      return tx.order.create({
        data: {
          orderCode,
          userId: customerContext.userId,
          customerEmail: customerContext.customerEmail,
          fullName: validatedData.fullName,
          phone: validatedData.phone,
          address: validatedData.address,
          note: validatedData.note,
          paymentMethod: validatedData.paymentMethod,
          totalAmount,
          status: 'pending',
          confirmationEmailStatus: 'pending',
          managementTokenHash: guestManagementToken?.tokenHash ?? null,
          managementTokenExpiresAt: guestManagementToken?.expiresAt ?? null,
          managementTokenRevokedAt: null,
          orderItems: {
            create: orderItemsData
          },
          statusHistory: {
            create: [
              {
                toStatus: 'pending',
                note: 'Đơn hàng được tạo',
                changedById: customerContext.userId,
                changedByName: customerContext.changedByName
              }
            ]
          }
        },
        include: {
          orderItems: true
        }
      });
    });

    const responseBody = {
      message: 'Order created successfully',
      customerType: customerContext.customerType,
      order: toCreateOrderDto(newOrder)
    };

    if (customerContext.customerType === 'guest') {

      if (isVNPayPaymentMethod(validatedData.paymentMethod)) {
        responseBody.orderCreated = true;
        try {
          responseBody.paymentUrl = await createVNPayPaymentUrlForOrder({
            order: newOrder,
            ipAddr: getRequestIpAddress(req)
          });
          responseBody.paymentInitiationStatus = 'succeeded';
        } catch {
          responseBody.paymentUrl = null;
          responseBody.paymentInitiationStatus = 'failed';
          responseBody.message = 'Order created, but payment could not be started. Please keep your order code for support.';
        }
      }
    }

    if (!isVNPayPaymentMethod(validatedData.paymentMethod)) {
      try {
        const emailResult = await deliverOrderConfirmationEmail(newOrder.id, { rawManagementToken });
        responseBody.confirmationEmailStatus = emailResult.status;
      } catch {
        responseBody.confirmationEmailStatus = 'failed';
      }
    }

    res.status(201).json(responseBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }

    if (error.message === 'GUEST_EMAIL_REQUIRED') {
      return res.status(400).json({ message: 'Guest email is required' });
    }

    if (error.message === 'AUTHENTICATED_USER_EMAIL_MISSING') {
      return res.status(400).json({ message: 'Authenticated user email is required' });
    }

    if (error.message?.startsWith('INSUFFICIENT_STOCK:')) {
      const productId = error.message.split(':')[1];
      return res.status(400).json({ message: `Product with ID ${productId} does not have enough stock` });
    }

    if (error.message === 'GUEST_MANAGEMENT_TOKEN_COLLISION') {
      return res.status(500).json({ message: 'Internal server error' });
    }

    console.error('Create order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
export const lookupOrder = async (req, res) => {
  try {
    const parsed = lookupOrderSchema.parse(req.body);
    const orderCode = normalizeLookupOrderCode(parsed.orderCode);
    const phone = normalizeLookupPhone(parsed.phone);

    if (!isReasonableLookupPhone(phone)) {
      return res.status(400).json({ message: 'Thông tin tra cứu không hợp lệ.' });
    }

    const order = await prisma.order.findFirst({
      where: { orderCode, phone },
      include: {
        orderItems: true,
        statusHistory: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng phù hợp.' });
    }

    return res.status(200).json({ order: toPublicOrderLookupDto(order) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Thông tin tra cứu không hợp lệ.' });
    }

    console.error('Lookup order error:', { name: error?.name, code: error?.code });
    return res.status(500).json({ message: 'Internal server error' });
  }
};
export const cancelMyOrder = async (req, res) => {
  try {
    const orderCode = normalizeLookupOrderCode(req.params.orderCode);
    if (!orderCode || orderCode.length > 50) {
      return res.status(400).json({ message: 'Thông tin hủy đơn không hợp lệ.' });
    }

    const parsed = cancelOrderSchema.parse(req.body);
    const result = await cancelAuthenticatedCustomerOrder({
      orderCode,
      actorUserId: req.user.id,
      actorName: req.user.fullName || req.user.email || 'Customer',
      reasonCode: parsed.reasonCode,
      reasonText: parsed.reasonText
    });

    if (result.outcome === 'refund_pending' || result.outcome === 'refund_already_pending') {
      return res.status(202).json({
        message: 'Yêu cầu hủy và hoàn tiền đã được ghi nhận.',
        code: 'REFUND_PENDING',
        refund: result.refund,
        order: result.order
      });
    }

    return res.status(200).json({
      message: result.outcome === 'already_cancelled' ? 'Đơn hàng đã được hủy trước đó.' : 'Đơn hàng đã được hủy thành công.',
      order: result.order
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Thông tin hủy đơn không hợp lệ.' });
    }

    if (error instanceof OrderCancellationError) {
      if (error.code === ORDER_CANCELLATION_ERROR.NOT_FOUND) {
        return res.status(404).json({ message: 'Không tìm thấy đơn hàng phù hợp.' });
      }
      if (error.code === ORDER_CANCELLATION_ERROR.REFUND_REQUIRED) {
        return res.status(422).json({ code: 'REFUND_REQUIRED', message: 'Đơn hàng đã thanh toán cần xử lý hoàn tiền.' });
      }
      if (error.code === ORDER_CANCELLATION_ERROR.ALREADY_CANCELLED_CONFLICT) {
        return res.status(409).json({ message: 'Đơn hàng đã được hủy.' });
      }
      if (error.code === ORDER_CANCELLATION_ERROR.NOT_CANCELLABLE) {
        return res.status(409).json({ message: 'Đơn hàng đã được xử lý và hiện không thể hủy.' });
      }
    }

    console.error('Cancel order error:', { name: error?.name, code: error?.code });
    return res.status(500).json({ message: 'Internal server error' });
  }
};
const invalidGuestManagementLinkResponse = (res) => (
  res.status(404).json({ message: 'Liên kết quản lý đơn hàng không hợp lệ hoặc đã hết hạn.' })
);

export const getGuestManagedOrder = async (req, res) => {
  try {
    const { token } = guestManagementTokenSchema.parse(req.body);
    const order = await resolveGuestManagedOrder(token);
    return res.status(200).json({ order: getGuestOrderManagementDto(order) });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof GuestOrderTokenError) {
      return invalidGuestManagementLinkResponse(res);
    }

    console.error('Guest order manage error:', { name: error?.name, code: error?.code });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const cancelGuestManagedOrder = async (req, res) => {
  try {
    const parsed = guestCancelOrderSchema.parse(req.body);
    const order = await resolveGuestManagedOrder(parsed.token);
    const result = await cancelGuestOrderById({
      orderId: order.id,
      actorName: order.fullName || 'Guest customer',
      reasonCode: parsed.reasonCode,
      reasonText: parsed.reasonText
    });
    const refreshedOrder = await getGuestManagedOrderById(order.id);

    if (result.outcome === 'refund_pending' || result.outcome === 'refund_already_pending') {
      return res.status(202).json({
        message: 'Yêu cầu hủy và hoàn tiền đã được ghi nhận.',
        code: 'REFUND_PENDING',
        refund: result.refund,
        order: getGuestOrderManagementDto(refreshedOrder)
      });
    }

    return res.status(200).json({
      message: result.outcome === 'already_cancelled' ? 'Đơn hàng đã được hủy trước đó.' : 'Đơn hàng đã được hủy thành công.',
      order: getGuestOrderManagementDto(refreshedOrder)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Thông tin hủy đơn không hợp lệ.' });
    }

    if (error instanceof GuestOrderTokenError) {
      return invalidGuestManagementLinkResponse(res);
    }

    if (error instanceof OrderCancellationError) {
      if (error.code === ORDER_CANCELLATION_ERROR.REFUND_REQUIRED) {
        return res.status(422).json({ code: 'REFUND_REQUIRED', message: 'Đơn hàng đã thanh toán cần xử lý hoàn tiền.' });
      }
      if (error.code === ORDER_CANCELLATION_ERROR.ALREADY_CANCELLED_CONFLICT) {
        return res.status(409).json({ message: 'Đơn hàng đã được hủy.' });
      }
      if (error.code === ORDER_CANCELLATION_ERROR.NOT_CANCELLABLE) {
        return res.status(409).json({ message: 'Đơn hàng đã được xử lý và hiện không thể hủy.' });
      }
      if (error.code === ORDER_CANCELLATION_ERROR.NOT_FOUND) {
        return invalidGuestManagementLinkResponse(res);
      }
    }

    console.error('Guest cancel order error:', { name: error?.name, code: error?.code });
    return res.status(500).json({ message: 'Internal server error' });
  }
};
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        activeRefundRequest: { select: { requestId: true, status: true } },
        orderItems: {
          include: {
            product: { select: { imageUrl: true, images: { select: { imageUrl: true, isPrimary: true } } } },
            reviews: { where: { userId }, select: { id: true, rating: true, createdAt: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(orders.map(toCustomerOrderDto));
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAdminOrders = async (req, res) => {
  try {
    const { page, limit, search, status, dateFrom, dateTo, customerId } = req.query;

    const whereClause = {};

    if (search) {
      whereClause.OR = [
        { orderCode: { contains: search } },
        { fullName: { contains: search } },
        { phone: { contains: search } },
        { customerEmail: { contains: search } },
        { user: { email: { contains: search } } }
      ];
    }

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (customerId) {
      whereClause.userId = parseInt(customerId);
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = to;
      }
    }

    const pageNum = parseInt(page) || 1;
    // Default limit 10 if not provided
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [total, orders] = await prisma.$transaction([
      prisma.order.count({ where: whereClause }),
      prisma.order.findMany({
        where: whereClause,
        include: {
          orderItems: true,
          user: { select: { email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limitNum
      })
    ]);

    res.status(200).json({
      data: orders.map(toAdminOrderDto),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get admin orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id);
    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: {
        activeRefundRequest: { select: { requestId: true, status: true } },
        orderItems: {
          include: {
            product: { select: { imageUrl: true, images: { select: { imageUrl: true, isPrimary: true } } } },
            reviews: { where: { userId }, select: { id: true, rating: true, createdAt: true } }
          }
        },
        statusHistory: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.status(200).json(toCustomerOrderDto(order));
  } catch (error) {
    console.error('Get my order detail error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAdminOrderById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        activeRefundRequest: { select: { requestId: true, status: true } },
        orderItems: {
          include: {
            product: { select: { imageUrl: true, images: { select: { imageUrl: true, isPrimary: true } } } },
            reviews: { select: { id: true, rating: true, createdAt: true } }
          }
        },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        user: { select: { email: true, fullName: true, phone: true } }
      }
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.status(200).json(toAdminOrderDto(order));
  } catch (error) {
    console.error('Get admin order detail error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const handleAdminRefundError = (res, error) => {
  if (error instanceof OrderRefundError) {
    if (error.code === ORDER_REFUND_ERROR.NOT_FOUND) {
      return res.status(404).json({ message: 'Refund request not found' });
    }
    if (error.code === ORDER_REFUND_ERROR.ACTIVE_REFUND_INVARIANT) {
      return res.status(409).json({ code: 'REFUND_INVARIANT_ERROR', message: 'Refund request is not linked to the active order claim.' });
    }
    if (error.code === ORDER_REFUND_ERROR.CLAIM_RACE_LOST) {
      return res.status(409).json({ code: 'REFUND_STATE_CHANGED', message: 'Refund state changed. Please reload and try again.' });
    }
    return res.status(409).json({ code: 'REFUND_NOT_ELIGIBLE', message: 'Refund request is not eligible for this action.' });
  }

  console.error('Admin refund error:', { name: error?.name, code: error?.code });
  return res.status(500).json({ message: 'Internal server error' });
};

export const getAdminRefunds = async (req, res) => {
  try {
    const parsed = adminRefundStatusSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid refund status filter' });
    }

    const refunds = await listAdminRefunds({ status: parsed.data.status || 'all' });
    return res.status(200).json({ data: refunds });
  } catch (error) {
    return handleAdminRefundError(res, error);
  }
};

export const getAdminRefundDetail = async (req, res) => {
  try {
    const parsed = adminRefundParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid refund request id' });
    }

    const refund = await getAdminRefundByRequestId(parsed.data.requestId);
    return res.status(200).json({ refund });
  } catch (error) {
    return handleAdminRefundError(res, error);
  }
};

export const startAdminRefundProcessing = async (req, res) => {
  try {
    const params = adminRefundParamsSchema.safeParse(req.params);
    const body = adminRefundStartSchema.safeParse(req.body || {});
    if (!params.success || !body.success) {
      return res.status(400).json({ message: 'Invalid refund processing request' });
    }

    const refund = await startManualRefundProcessing({
      requestId: params.data.requestId,
      adminUser: req.user,
      adminNote: body.data.adminNote
    });

    return res.status(200).json({ message: 'Refund request is now being processed.', refund });
  } catch (error) {
    return handleAdminRefundError(res, error);
  }
};

export const resolveAdminRefund = async (req, res) => {
  try {
    const params = adminRefundParamsSchema.safeParse(req.params);
    const body = adminRefundResolveSchema.safeParse(req.body || {});
    if (!params.success || !body.success) {
      return res.status(400).json({ message: 'Invalid refund resolution request' });
    }

    const refund = await resolveManualRefund({
      requestId: params.data.requestId,
      result: body.data.result,
      adminUser: req.user,
      providerTransactionId: body.data.providerTransactionId,
      providerResponseCode: body.data.providerResponseCode,
      adminNote: body.data.adminNote
    });

    const messages = {
      [REFUND_STATUS.SUCCEEDED]: 'Refund confirmed succeeded and order cancellation finalized.',
      [REFUND_STATUS.FAILED]: 'Refund marked failed. The order remains paid and not cancelled.',
      [REFUND_STATUS.UNKNOWN]: 'Refund marked unknown. The order remains locked for reconciliation.'
    };

    return res.status(200).json({ message: messages[body.data.result], refund });
  } catch (error) {
    return handleAdminRefundError(res, error);
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, note, cancelReason } = req.body;
    const userId = req.user.id;
    const userName = req.user.fullName || req.user.email || 'Admin/Staff';

    if (isNaN(id) || !status) {
      return res.status(400).json({ message: 'Invalid ID or status' });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const currentStatus = order.status;
    if (currentStatus === status) {
      return res.status(400).json({ message: 'Status is already ' + status });
    }

    if (status === 'cancelled') {
      return res.status(409).json({ message: 'Admin cancellation must use the cancellation domain service.' });
    }

    // Rules
    const allowedFlows = {
      pending: ['confirmed'],
      confirmed: ['preparing'],
      preparing: ['shipping'],
      shipping: ['delivered'],
      delivered: ['completed']
    };

    if (currentStatus === 'completed' || currentStatus === 'cancelled') {
      return res.status(400).json({ message: 'Không thể cập nhật đơn hàng đã hoàn thành hoặc đã hủy' });
    }

    if (!allowedFlows[currentStatus] || !allowedFlows[currentStatus].includes(status)) {
      return res.status(400).json({ message: `Chuyển trạng thái không hợp lệ: ${currentStatus} -> ${status}` });
    }


    const updateData = { status };

    if (status === 'delivered' && !order.deliveredAt) {
      updateData.deliveredAt = new Date();
    }

    if (order.paymentMethod === 'COD') {
      if (status === 'delivered') {
        if (order.paymentStatus !== 'paid') {
          if (order.paymentStatus !== 'refunded') {
            updateData.paymentStatus = 'paid';
            updateData.paidAt = new Date();
          }
        }
      }
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const transition = await tx.order.updateMany({
        where: { id, status: currentStatus, activeRefundRequestId: null },
        data: updateData
      });

      if (transition.count !== 1) return null;

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: currentStatus,
          toStatus: status,
          note: note || '',
          cancelReason: null,
          changedById: userId,
          changedByName: userName
        }
      });

      return tx.order.findUnique({
        where: { id },
        include: {
          statusHistory: { orderBy: { createdAt: 'desc' } }
        }
      });
    });

    if (!updatedOrder) {
      const latest = await prisma.order.findUnique({ where: { id }, select: { activeRefundRequestId: true } });
      if (latest?.activeRefundRequestId) {
        return res.status(409).json({ code: 'REFUND_IN_PROGRESS', message: 'Order has an active refund request and cannot progress.' });
      }
      return res.status(409).json({ message: 'Order state changed. Please reload and try again.' });
    }

    res.status(200).json({ message: 'Order status updated', order: updatedOrder });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
