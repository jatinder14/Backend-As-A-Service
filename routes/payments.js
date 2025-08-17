const express = require('express');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const Booking = require('../models/Booking');
const router = express.Router();

// Get all payments with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, paymentType, userId, paymentMethod } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (status) query.status = status;
    if (paymentType) query.paymentType = paymentType;
    if (userId) query.user = userId;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    const payments = await Payment.find(query)
      .populate('user', 'name email')
      .populate('order', 'orderId totalAmount')
      .populate('subscription', 'planName')
      .populate('bookingId')
      .populate('refundedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    res.json({
      payments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get payment by ID
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('order', 'orderId totalAmount items')
      .populate('subscription', 'planName planDetails')
      .populate('bookingId')
      .populate('refundedBy', 'name');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new payment
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      orderId,
      subscriptionId,
      bookingId,
      amount,
      currency = 'USD',
      paymentMethod,
      paymentType = 'one_time',
      externalPaymentId,
      gatewayResponse,
      notes,
    } = req.body;

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate order if provided
    if (orderId) {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
    }

    // Validate subscription if provided
    if (subscriptionId) {
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        return res.status(404).json({ message: 'Subscription not found' });
      }
    }

    // Validate booking if provided
    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
    }

    const payment = new Payment({
      user: userId,
      order: orderId,
      subscription: subscriptionId,
      bookingId,
      amount,
      currency,
      paymentMethod,
      paymentType,
      externalPaymentId,
      gatewayResponse,
      notes,
    });

    await payment.save();
    res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update payment
router.put('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update allowed fields
    const allowedUpdates = ['status', 'gatewayResponse', 'failureReason', 'notes', 'processedAt'];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        payment[field] = req.body[field];
      }
    });

    await payment.save();
    res.json(payment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Process refund
router.post('/:id/refund', async (req, res) => {
  try {
    const { refundAmount, reason } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ message: 'Payment is not completed' });
    }

    const refundAmountNum = parseFloat(refundAmount);
    if (refundAmountNum > payment.amount) {
      return res.status(400).json({ message: 'Refund amount cannot exceed payment amount' });
    }

    // Create refund payment record
    const refundPayment = new Payment({
      user: payment.user,
      order: payment.order,
      subscription: payment.subscription,
      bookingId: payment.bookingId,
      amount: refundAmountNum,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      paymentType: 'refund',
      status: 'completed',
      refundAmount: refundAmountNum,
      refundReason: reason,
      refundedAt: new Date(),
      refundedBy: req.user.id,
      processedAt: new Date(),
    });

    await refundPayment.save();

    // Update original payment
    payment.refundAmount = refundAmountNum;
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    payment.refundedBy = req.user.id;

    if (refundAmountNum === payment.amount) {
      payment.status = 'refunded';
    }

    await payment.save();

    res.json({ originalPayment: payment, refundPayment });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get payment statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalPayments = await Payment.countDocuments();
    const completedPayments = await Payment.countDocuments({ status: 'completed' });
    const failedPayments = await Payment.countDocuments({ status: 'failed' });
    const refundedPayments = await Payment.countDocuments({ paymentType: 'refund' });

    // Revenue statistics
    const revenueStats = await Payment.aggregate([
      { $match: { status: 'completed', paymentType: { $ne: 'refund' } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          avgPayment: { $avg: '$amount' },
        },
      },
    ]);

    // Payment method distribution
    const paymentMethodDistribution = await Payment.aggregate([
      { $group: { _id: '$paymentMethod', count: { $sum: 1 } } },
    ]);

    // Payment type distribution
    const paymentTypeDistribution = await Payment.aggregate([
      { $group: { _id: '$paymentType', count: { $sum: 1 } } },
    ]);

    res.json({
      totalPayments,
      completedPayments,
      failedPayments,
      refundedPayments,
      revenueStats: revenueStats[0] || { totalRevenue: 0, avgPayment: 0 },
      paymentMethodDistribution,
      paymentTypeDistribution,
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's payment history
router.get('/user/:userId/history', async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.params.userId })
      .populate('order', 'orderId totalAmount')
      .populate('subscription', 'planName')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching user payment history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete payment (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    await payment.deleteOne();
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
