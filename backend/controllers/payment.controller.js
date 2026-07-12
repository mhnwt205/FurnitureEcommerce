import prisma from '../prismaClient.js';
import { verifyVNPaySignature } from '../config/vnpay.js';
import {
  createVNPayPaymentUrlForOrder,
  getRequestIpAddress,
  toPublicPaymentOrderDto
} from '../services/vnpayPayment.service.js';
import {
  finalizeSuccessfulVNPayPayment,
  markVNPayPaymentFailed
} from '../services/vnpayPaymentFinalization.service.js';

export const createPaymentUrl = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    if (!orderId) {
      return res.status(400).json({ message: 'Missing orderId' });
    }

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId, 10) }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const paymentUrl = await createVNPayPaymentUrlForOrder({
      order,
      ipAddr: getRequestIpAddress(req)
    });

    res.status(200).json({
      success: true,
      paymentUrl
    });
  } catch (error) {
    if (error.code === 'ORDER_ALREADY_PAID') {
      return res.status(400).json({ message: 'Order is already paid' });
    }

    if (error.code === 'VNPAY_PAYMENT_METHOD_REQUIRED') {
      return res.status(400).json({ message: 'Order payment method is not VNPay' });
    }

    console.error('Create VNPay URL error:', { name: error?.name, code: error?.code });
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const vnpayIPN = async (req, res) => {
  try {
    const vnp_Params = req.query;
    const isValidSignature = verifyVNPaySignature({ ...vnp_Params });

    if (!isValidSignature) {
      return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
    }

    const txnRef = vnp_Params['vnp_TxnRef'];
    const responseCode = vnp_Params['vnp_ResponseCode'];
    const transactionNo = vnp_Params['vnp_TransactionNo'];
    const amount = Number(vnp_Params['vnp_Amount']) / 100;

    const order = await prisma.order.findFirst({
      where: { vnpayTxnRef: txnRef }
    });

    if (!order) {
      return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
    }

    if (Math.round(order.totalAmount) !== Math.round(amount)) {
      return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
    }

    if (responseCode === '00') {
      const wasPaid = order.paymentStatus === 'paid';
      await finalizeSuccessfulVNPayPayment({
        orderId: order.id,
        transactionNo
      });

      if (wasPaid) {
        return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
      }

      return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
    }

    await markVNPayPaymentFailed({ orderId: order.id });
    return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (error) {
    console.error('VNPay IPN error:', { name: error?.name, code: error?.code });
    res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};

const toVerifyPaymentResponse = ({ success, status, message, order }) => ({
  success,
  status,
  orderId: order?.id,
  order: order ? toPublicPaymentOrderDto(order) : undefined,
  message
});

export const verifyPaymentResult = async (req, res) => {
  try {
    const vnp_Params = req.query;
    const isValidSignature = verifyVNPaySignature({ ...vnp_Params });
    if (!isValidSignature) {
      return res.status(200).json({ success: false, status: 'invalid_signature', message: 'Invalid VNPay signature' });
    }

    const txnRef = vnp_Params['vnp_TxnRef'];
    const responseCode = vnp_Params['vnp_ResponseCode'];
    const transactionNo = vnp_Params['vnp_TransactionNo'];
    const amount = Number(vnp_Params['vnp_Amount']) / 100;

    const order = await prisma.order.findFirst({
      where: { vnpayTxnRef: txnRef }
    });

    if (!order) {
      return res.status(200).json({ success: false, status: 'order_not_found', message: 'Order not found' });
    }

    if (Math.round(order.totalAmount) !== Math.round(amount)) {
      return res.status(200).json(toVerifyPaymentResponse({
        success: false,
        status: 'invalid_amount',
        order,
        message: 'Invalid amount'
      }));
    }

    if (responseCode === '00') {
      const { order: finalizedOrder } = await finalizeSuccessfulVNPayPayment({
        orderId: order.id,
        transactionNo
      });

      return res.status(200).json(toVerifyPaymentResponse({
        success: true,
        status: 'paid',
        order: finalizedOrder,
        message: 'Payment successful'
      }));
    }

    const failedOrder = await markVNPayPaymentFailed({ orderId: order.id });
    return res.status(200).json(toVerifyPaymentResponse({
      success: false,
      status: 'failed',
      order: failedOrder || order,
      message: 'Payment failed or cancelled'
    }));
  } catch (error) {
    console.error('Verify payment result error:', { name: error?.name, code: error?.code });
    res.status(500).json({ success: false, status: 'error', message: 'Internal server error' });
  }
};
