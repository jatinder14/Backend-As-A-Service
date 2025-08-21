const express = require('express');
const Razorpay = require('razorpay');
const Refund = require('../models/Refund');
const Transaction = require('../models/Transaction');
const { verifyToken, adminRole } = require('../middleware/auth');

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_R5dcC7mGZBJI9y',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '29KBqceNnQER5CxM4Aj4Zsen',
});

// Apply authentication to all routes
router.use(verifyToken);

// Create a new refund
router.post('/create', async (req, res) => {
  try {
    const { transactionId, paymentId, amount, reason } = req.body;

    // Validate required fields
    if (!transactionId && !paymentId) {
      return res.status(400).json({
        error: 'Either transactionId or paymentId is required',
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Valid refund amount is required',
      });
    }

    let razorpayPaymentId = paymentId;
    let transaction = null;

    // Find transaction and payment ID
    if (transactionId) {
      transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      razorpayPaymentId = transaction.razorpayPaymentId;
    } else if (paymentId) {
      transaction = await Transaction.findOne({ razorpayPaymentId: paymentId });
    }

    if (!razorpayPaymentId) {
      return res.status(400).json({ error: 'Razorpay payment ID not found' });
    }

    // Check if user has permission to refund this transaction
    if (req.user?.role !== 'admin' && transaction?.userId?.toString() !== req.user?.id) {
      return res
        .status(403)
        .json({ error: 'Access denied - You can only request refunds for your own transactions' });
    }

    // Verify payment exists and is refundable
    const payment = await razorpay.payments.fetch(razorpayPaymentId);
    if (payment.status !== 'captured') {
      return res.status(400).json({
        error: 'Payment is not captured, cannot process refund',
      });
    }

    // Convert amount to paise
    const refundAmountInPaise = Math.round(Math.abs(amount) * 100);

    // Process refund with Razorpay
    const refundResponse = await razorpay.payments.refund(razorpayPaymentId, {
      amount: refundAmountInPaise,
      speed: 'optimum',
      notes: {
        reason: reason || 'Customer requested refund',
        transactionId: transaction?._id?.toString() || '',
        processedBy: req.user?.id || 'system',
      },
    });

    // Create refund record
    const refundRecord = new Refund({
      refundId: refundResponse.id,
      refundedAmount: (refundResponse.amount / 100).toString(),
      isRefunded: 'pending',
      status: 'PENDING',
      razorpayPaymentId: refundResponse.payment_id,
      created_at: new Date(refundResponse.created_at * 1000).toISOString(),
      transationId: transaction?._id?.toString() || '',
      reason: reason || 'Customer requested refund',
      processedBy: req.user?.id,
      processedAt: new Date(),
      metadata: {
        originalAmount: transaction?.amount,
        planName: transaction?.metadata?.planName,
        originalTransactionId: transaction?._id,
      },
    });

    await refundRecord.save();

    // Update transaction status
    if (transaction) {
      transaction.status = 'REFUND_INITIATED';
      await transaction.save();
    }

    res.json({
      message: 'Refund initiated successfully',
      refund: {
        id: refundRecord._id,
        refundId: refundResponse.id,
        amount: amount,
        status: 'PENDING',
      },
    });
  } catch (error) {
    console.error('Create refund error:', error);

    let errorMessage = 'Error processing refund';
    if (error.statusCode === 404) {
      errorMessage = 'Payment not found';
    } else if (error.statusCode === 400) {
      errorMessage = error.error?.description || 'Invalid refund request';
    }

    res.status(500).json({ error: errorMessage });
  }
});

// Get user's own refunds
router.get('/myRefunds', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Find refunds for transactions that belong to this user
    const userTransactions = await Transaction.find({ userId: req.user?.id }).select('_id');
    const transactionIds = userTransactions.map(t => t._id.toString());

    const filter = {
      transationId: { $in: transactionIds },
    };

    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [refunds, total] = await Promise.all([
      Refund.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-razorpaySignature -metadata.razorpayPaymentLinkDetails'), // Hide sensitive data
      Refund.countDocuments(filter),
    ]);

    res.json({
      refunds,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get user refunds error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all refunds with pagination and filters
router.get('/', adminRole, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, paymentType, startDate, endDate, search } = req.query;

    // Build filter object
    const filter = {};

    if (status) filter.status = status;
    if (paymentType) filter.paymentType = paymentType;

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate).getTime();
      if (endDate) filter.date.$lte = new Date(endDate).getTime();
    }

    // Search in humanReadableID, customerEmail, or customerName
    if (search) {
      filter.$or = [
        { humanReadableID: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { refundId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [refunds, total] = await Promise.all([
      Refund.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Refund.countDocuments(filter),
    ]);

    res.json({
      refunds,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get refunds error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single refund by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const refund = await Refund.findById(id);

    if (!refund) {
      return res.status(404).json({ error: 'Refund not found' });
    }

    // Check if user can access this refund by verifying transaction ownership
    if (req.user?.role !== 'admin') {
      const transaction = await Transaction.findById(refund.transationId);
      if (!transaction || transaction.userId.toString() !== req.user?.id) {
        return res
          .status(403)
          .json({ error: 'Access denied - You can only view your own refunds' });
      }
    }

    res.json(refund);
  } catch (error) {
    console.error('Get refund error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update refund (admin only)
router.put('/:id', adminRole, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating certain critical fields
    const restrictedFields = ['_id', 'razorpayPaymentId', 'razorpaySignature', 'createdAt'];
    restrictedFields.forEach(field => delete updates[field]);

    const refund = await Refund.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!refund) {
      return res.status(404).json({ error: 'Refund not found' });
    }

    res.json({
      message: 'Refund updated successfully',
      refund,
    });
  } catch (error) {
    console.error('Update refund error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete refund (admin only)
router.delete('/:id', adminRole, async (req, res) => {
  try {
    const { id } = req.params;

    const refund = await Refund.findById(id);

    if (!refund) {
      return res.status(404).json({ error: 'Refund not found' });
    }

    // Prevent deletion of completed refunds
    if (refund.status === 'COMPLETED' || refund.isRefunded === 'completed') {
      return res.status(400).json({
        error: 'Cannot delete completed refunds. Consider updating status instead.',
      });
    }

    await Refund.findByIdAndDelete(id);

    res.json({
      message: 'Refund deleted successfully',
      deletedRefund: {
        id: refund._id,
        humanReadableID: refund.humanReadableID,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error('Delete refund error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get refund statistics (admin only)
router.get('/stats/summary', adminRole, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate).getTime();
      if (endDate) dateFilter.date.$lte = new Date(endDate).getTime();
    }

    const [totalRefunds, completedRefunds, pendingRefunds, totalRevenue, revenueByPlan] =
      await Promise.all([
        Refund.countDocuments(dateFilter),
        Refund.countDocuments({ ...dateFilter, status: 'COMPLETED' }),
        Refund.countDocuments({ ...dateFilter, status: 'PENDING' }),
        Refund.aggregate([
          { $match: { ...dateFilter, status: 'COMPLETED' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Refund.aggregate([
          { $match: { ...dateFilter, status: 'COMPLETED' } },
          {
            $group: {
              _id: '$metadata.planName',
              count: { $sum: 1 },
              revenue: { $sum: '$amount' },
            },
          },
          { $sort: { revenue: -1 } },
        ]),
      ]);

    res.json({
      summary: {
        totalRefunds,
        completedRefunds,
        pendingRefunds,
        successRate: totalRefunds > 0 ? ((completedRefunds / totalRefunds) * 100).toFixed(2) : 0,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
      revenueByPlan,
    });
  } catch (error) {
    console.error('Get refund stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// // Get refund by human readable ID
// router.get('/lookup/:humanReadableId', async (req, res) => {
//   try {
//     const { humanReadableId } = req.params;

//     const refund = await Refund.findOne({
//       humanReadableID: humanReadableId
//     });

//     if (!refund) {
//       return res.status(404).json({ error: 'Refund not found' });
//     }

//     // Check if user can access this refund
//     if (req.user?.role !== 'admin' && refund.metadata?.userId !== req.user?.id) {
//       return res.status(403).json({ error: 'Access denied' });
//     }

//     res.json(refund);
//   } catch (error) {
//     console.error('Lookup refund error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

module.exports = router;
