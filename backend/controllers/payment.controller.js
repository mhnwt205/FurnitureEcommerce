import prisma from '../prismaClient.js';
import { createVNPayUrl, verifyVNPaySignature } from '../config/vnpay.js';

export const createPaymentUrl = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    if (!orderId) {
      return res.status(400).json({ message: 'Missing orderId' });
    }

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Order is already paid' });
    }

    // Generate TxnRef
    const txnRef = `VNP-${order.id}-${Date.now()}`;

    // Save TxnRef to DB
    await prisma.order.update({
      where: { id: order.id },
      data: { vnpayTxnRef: txnRef }
    });

    // Create VNPay URL
    const ipAddr = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

    const paymentUrl = createVNPayUrl(
      ipAddr,
      txnRef,
      order.totalAmount,
      `Thanh toan don hang ${order.orderCode}`
    );

    res.status(200).json({
      success: true,
      paymentUrl
    });

  } catch (error) {
    console.error('Create VNPay URL error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const vnpayIPN = async (req, res) => {
  try {
    let vnp_Params = req.query;
    
    // Check signature
    const isValidSignature = verifyVNPaySignature({ ...vnp_Params });

    if (isValidSignature) {
      const txnRef = vnp_Params['vnp_TxnRef'];
      const responseCode = vnp_Params['vnp_ResponseCode'];
      const transactionNo = vnp_Params['vnp_TransactionNo'];
      const amount = Number(vnp_Params['vnp_Amount']) / 100; // VNPay amount is multiplied by 100

      // Find order by TxnRef
      const order = await prisma.order.findFirst({
        where: { vnpayTxnRef: txnRef }
      });

      if (!order) {
        return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
      }

      if (Math.round(order.totalAmount) !== Math.round(amount)) {
        return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
      }

      if (order.paymentStatus === 'paid') {
        return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
      }

      // 00 means success in VNPay
      if (responseCode === '00') {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'paid',
            paidAt: new Date(),
            vnpayTransactionNo: transactionNo
          }
        });
      } else {
        // Failed
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'failed'
          }
        });
      }

      return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
    } else {
      return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
    }
  } catch (error) {
    console.error('VNPay IPN error:', error);
    res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};

export const verifyPaymentResult = async (req, res) => {
  try {
    let vnp_Params = req.query;
    
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
      return res.status(200).json({ success: false, status: 'invalid_amount', message: 'Invalid amount' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(200).json({ success: true, status: 'paid', orderId: order.id, message: 'Payment successful' });
    }

    if (responseCode === '00') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'paid',
          paidAt: new Date(),
          vnpayTransactionNo: transactionNo
        }
      });
      return res.status(200).json({ success: true, status: 'paid', orderId: order.id, message: 'Payment successful' });
    } else {
      if (order.paymentStatus !== 'failed') {
         await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'failed'
          }
        });
      }
      return res.status(200).json({ success: false, status: 'failed', orderId: order.id, message: 'Payment failed or cancelled' });
    }
  } catch (error) {
    console.error('Verify payment result error:', error);
    res.status(500).json({ success: false, status: 'error', message: 'Internal server error' });
  }
};
