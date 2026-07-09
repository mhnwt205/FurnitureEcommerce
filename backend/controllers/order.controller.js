import prisma from '../prismaClient.js';
import { z } from 'zod';
import { attachPricingToProducts } from '../services/promotionPricing.service.js';

const orderItemSchema = z.object({
  productId: z.number(),
  quantity: z.number().min(1)
});

const createOrderSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
  note: z.string().optional(),
  paymentMethod: z.string().min(1),
  items: z.array(orderItemSchema).min(1)
});

export const createOrder = async (req, res) => {
  try {
    const validatedData = createOrderSchema.parse(req.body);
    const userId = req.user.id;

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

    const newOrder = await prisma.$transaction(async (tx) => {
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
          userId,
          fullName: validatedData.fullName,
          phone: validatedData.phone,
          address: validatedData.address,
          note: validatedData.note,
          paymentMethod: validatedData.paymentMethod,
          totalAmount,
          status: 'pending',
          orderItems: {
            create: orderItemsData
          },
          statusHistory: {
            create: [
              {
                toStatus: 'pending',
                note: 'Đơn hàng được tạo',
                changedById: userId,
                changedByName: req.user.fullName || req.user.email || 'Khách hàng'
              }
            ]
          }
        },
        include: {
          orderItems: true
        }
      });
    });

    res.status(201).json({ message: 'Order created successfully', order: newOrder });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }

    if (error.message?.startsWith('INSUFFICIENT_STOCK:')) {
      const productId = error.message.split(':')[1];
      return res.status(400).json({ message: `Product with ID ${productId} does not have enough stock` });
    }

    console.error('Create order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: {
          include: {
            product: { select: { imageUrl: true, images: { select: { imageUrl: true, isPrimary: true } } } },
            reviews: { where: { userId }, select: { id: true, rating: true, createdAt: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(orders);
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
      data: orders,
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
    const order = await prisma.order.findUnique({
      where: { id, userId },
      include: {
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
    res.status(200).json(order);
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
    res.status(200).json(order);
  } catch (error) {
    console.error('Get admin order detail error:', error);
    res.status(500).json({ message: 'Internal server error' });
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

    // Rules
    const allowedFlows = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['shipping', 'cancelled'],
      shipping: ['delivered'],
      delivered: ['completed']
    };

    if (currentStatus === 'completed' || currentStatus === 'cancelled') {
      return res.status(400).json({ message: 'Không thể cập nhật đơn hàng đã Hoàn thành hoặc Đã hủy' });
    }

    if (!allowedFlows[currentStatus] || !allowedFlows[currentStatus].includes(status)) {
      return res.status(400).json({ message: `Chuyển trạng thái không hợp lệ: ${currentStatus} -> ${status}` });
    }

    if (status === 'cancelled' && (!cancelReason || cancelReason.trim() === '')) {
      return res.status(400).json({ message: 'Bắt buộc nhập lý do hủy đơn hàng' });
    }

    const updateData = {
      status,
      statusHistory: {
        create: {
          fromStatus: currentStatus,
          toStatus: status,
          note: note || '',
          cancelReason: status === 'cancelled' ? cancelReason : null,
          changedById: userId,
          changedByName: userName
        }
      }
    };

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

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        statusHistory: { orderBy: { createdAt: 'desc' } }
      }
    });

    res.status(200).json({ message: 'Order status updated', order: updatedOrder });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
