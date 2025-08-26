const express = require('express');
const Razorpay = require('razorpay');
const Refund = require('../models/Refund');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { verifyToken, adminRole } = require('../middleware/auth');
const {
  addRefundToUser,
  updateRefundStatus,
  getUserRecentRefunds,
} = require('../utils/userPaymentSync');

const router = express.Router();

// Input validation middleware
const validateRefundInput = (req, res, next) => {
  const { transactionId, paymentId, amount, reason } = req.body;

  // Check required fields
  if (!transactionId && !paymentId) {
    return res.status(400).json({
      error: 'Either transactionId or paymentId is required',
    });
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      error: 'Valid refund amount (positive number) is required',
    });
  }

  // Validate amount format (max 2 decimal places)
  if (!/^\d+(\.\d{1,2})?$/.test(amount.toString())) {
    return res.status(400).json({
      error: 'Amount should have maximum 2 decimal places',
    });
  }

  // Validate reason length if provided
  if (reason && reason.length > 500) {
    return res.status(400).json({
      error: 'Reason should not exceed 500 characters',
    });
  }

  next();
};

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_R5dcC7mGZBJI9y',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '29KBqceNnQER5CxM4Aj4Zsen',
});

// Apply authentication to all routes
router.use(verifyToken);

// Create a new refund
router.post('/', validateRefundInput, async (req, res) => {
  try {
    const { transactionId, paymentId, amount, reason } = req.body;

    // Validate user authentication
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'User authentication required',
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
    if (req.user?.role !== 'admin') {
      if (!transaction) {
        return res.status(404).json({
          error: 'Transaction not found or access denied',
        });
      }
      if (transaction.userId?.toString() !== req.user?.id) {
        return res.status(403).json({
          error: 'Access denied - You can only request refunds for your own transactions',
        });
      }
    }

    // Verify payment exists and is refundable
    let payment;
    try {
      payment = await razorpay.payments.fetch(razorpayPaymentId);
    } catch (error) {
      console.error('Failed to fetch payment:', error);
      return res.status(404).json({
        error: 'Payment not found in Razorpay',
      });
    }

    if (payment.status !== 'captured') {
      return res.status(400).json({
        error: `Payment status is '${payment.status}', cannot process refund. Only captured payments can be refunded.`,
      });
    }

    // Check if refund amount doesn't exceed payment amount
    const paymentAmountInRupees = payment.amount / 100;
    if (amount > paymentAmountInRupees) {
      return res.status(400).json({
        error: `Refund amount (₹${amount}) cannot exceed payment amount (₹${paymentAmountInRupees})`,
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
      userId: req.user.id, // Direct user reference
      transactionId: transaction?._id, // Use ObjectId, not string
      amount: refundResponse.amount / 100, // Store as number
      refundedAmount: (refundResponse.amount / 100).toString(), // Legacy field
      isRefunded: 'pending',
      status: 'PENDING',
      razorpayPaymentId: refundResponse.payment_id,
      created_at: new Date(refundResponse.created_at * 1000).toISOString(),
      reason: reason || 'Customer requested refund',
      processedBy: req.user.id,
      processedAt: new Date(),
      metadata: {
        originalAmount: transaction?.amount,
        planName: transaction?.metadata?.planName,
        originalTransactionId: transaction?._id,
        userEmail: req.user.email,
        userName: req.user.name,
      },
    });

    await refundRecord.save();

    // Update transaction status
    if (transaction) {
      transaction.status = 'REFUND_INITIATED';
      await transaction.save();
    }

    // Add refund to user's refund history (hybrid approach)
    try {
      await addRefundToUser(req.user.id, refundRecord);
    } catch (syncError) {
      console.error('Failed to sync refund to user model:', syncError);
      // Don't fail the request if sync fails
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
    let statusCode = 500;

    if (error.statusCode === 404) {
      errorMessage = 'Payment not found';
      statusCode = 404;
    } else if (error.statusCode === 400) {
      errorMessage = error.error?.description || 'Invalid refund request';
      statusCode = 400;
    } else if (error.name === 'ValidationError') {
      errorMessage = 'Invalid refund data: ' + error.message;
      statusCode = 400;
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid ID format';
      statusCode = 400;
    }

    res.status(statusCode).json({ error: errorMessage });
  }
});

// Get user's own refunds (fast access from User model)
router.get('/myRefunds/quick', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get recent refunds from User model (faster)
    const recentRefunds = await getUserRecentRefunds(req.user?.id, parseInt(limit));

    res.json({
      refunds: recentRefunds,
      source: 'user_model',
      note: 'For detailed refund information, use /myRefunds endpoint',
    });
  } catch (error) {
    console.error('Get user quick refunds error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's own refunds (detailed from Refund collection)
router.get('/myRefunds', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Direct query using userId - much simpler and faster!
    const filter = {
      userId: req.user?.id,
    };

    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [refunds, total] = await Promise.all([
      Refund.find(filter)
        .populate('transactionId', 'razorpayPaymentId amount createdAt metadata')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-metadata.razorpayPaymentLinkDetails'), // Hide sensitive data
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
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Search in refundId, user email, or user name
    if (search) {
      // First try to find users matching the search term
      const matchingUsers = await User.find({
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      const userIds = matchingUsers.map(u => u._id);

      filter.$or = [
        { refundId: { $regex: search, $options: 'i' } },
        { userId: { $in: userIds } }, // Search by user
        // Legacy fields for backward compatibility
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [refunds, total] = await Promise.all([
      Refund.find(filter)
        .populate('userId', 'name email customerType')
        .populate('transactionId', 'razorpayPaymentId amount createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
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

    // Check if user can access this refund - direct userId check!
    if (req.user?.role !== 'admin' && refund.userId.toString() !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied - You can only view your own refunds' });
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

// Check refund status by refund ID
router.get('/status/:refundId', async (req, res) => {
  try {
    const { refundId } = req.params;

    // Find refund by Razorpay refund ID
    const refund = await Refund.findOne({ refundId });

    if (!refund) {
      return res.status(404).json({ error: 'Refund not found' });
    }

    // Check if user can access this refund - direct userId check!
    if (req.user?.role !== 'admin' && refund.userId.toString() !== req.user?.id) {
      return res.status(403).json({
        error: 'Access denied - You can only check status of your own refunds',
      });
    }

    // Fetch latest status from Razorpay
    try {
      const razorpayRefund = await razorpay.refunds.fetch(refundId);

      // Update local status if different
      if (razorpayRefund.status !== refund.status) {
        const oldStatus = refund.status;
        refund.status = razorpayRefund.status.toUpperCase();
        refund.isRefunded = razorpayRefund.status === 'processed' ? 'completed' : 'pending';
        await refund.save();

        // Update user's refund history if status changed
        if (oldStatus !== refund.status) {
          try {
            await updateRefundStatus(refund.userId, refund.refundId, refund.status);
          } catch (syncError) {
            console.error('Failed to sync refund status to user model:', syncError);
          }
        }
      }

      res.json({
        refundId: refund.refundId,
        status: refund.status,
        amount: refund.amount || parseFloat(refund.refundedAmount),
        razorpayStatus: razorpayRefund.status,
        processedAt: refund.processedAt,
        reason: refund.reason,
      });
    } catch (error) {
      console.error('Error fetching refund from Razorpay:', error);
      // Return local status if Razorpay fetch fails
      res.json({
        refundId: refund.refundId,
        status: refund.status,
        amount: refund.amount || parseFloat(refund.refundedAmount),
        processedAt: refund.processedAt,
        reason: refund.reason,
        note: 'Status from local database (Razorpay fetch failed)',
      });
    }
  } catch (error) {
    console.error('Check refund status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Performance comparison endpoint (admin only)
router.get('/performance/compare/:userId', adminRole, async (req, res) => {
  try {
    const { userId } = req.params;
    const startTime = Date.now();

    // Method 1: Old approach (via Transaction lookup)
    const queryStart = Date.now();
    const userTransactions = await Transaction.find({ userId }).select('_id');
    const transactionIds = userTransactions.map(t => t._id.toString());
    const queryRefunds = await Refund.find({
      transactionId: { $in: transactionIds },
    })
      .sort({ createdAt: -1 })
      .limit(10);
    const queryTime = Date.now() - queryStart;

    // Method 2: New approach (direct userId query)
    const directStart = Date.now();
    const directRefunds = await Refund.find({ userId }).sort({ createdAt: -1 }).limit(10);
    const directTime = Date.now() - directStart;

    // Method 3: User model approach
    const userModelStart = Date.now();
    const userRefunds = await getUserRecentRefunds(userId, 10);
    const userModelTime = Date.now() - userModelStart;

    const totalTime = Date.now() - startTime;

    res.json({
      performance: {
        oldApproach: {
          time: queryTime,
          results: queryRefunds.length,
          method: 'Multiple queries: Transaction lookup + Refund query',
        },
        newApproach: {
          time: directTime,
          results: directRefunds.length,
          method: 'Direct userId query to Refund collection',
        },
        userModel: {
          time: userModelTime,
          results: userRefunds.length,
          method: 'Single query to User model (embedded data)',
        },
        improvements: {
          directVsOld:
            queryTime > 0 ? `${(((queryTime - directTime) / queryTime) * 100).toFixed(1)}%` : 'N/A',
          userModelVsOld:
            queryTime > 0
              ? `${(((queryTime - userModelTime) / queryTime) * 100).toFixed(1)}%`
              : 'N/A',
        },
        totalTime,
      },
      recommendation:
        'Direct userId queries are much faster than transaction lookups. User model is fastest for recent data.',
    });
  } catch (error) {
    console.error('Performance comparison error:', error);
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
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [totalRefunds, completedRefunds, pendingRefunds, totalRevenue, revenueByPlan] =
      await Promise.all([
        Refund.countDocuments(dateFilter),
        Refund.countDocuments({ ...dateFilter, status: 'COMPLETED' }),
        Refund.countDocuments({ ...dateFilter, status: 'PENDING' }),
        Refund.aggregate([
          { $match: { ...dateFilter, status: 'COMPLETED' } },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $toDouble: {
                    $ifNull: ['$amount', '$refundedAmount'],
                  },
                },
              },
            },
          },
        ]),
        Refund.aggregate([
          { $match: { ...dateFilter, status: 'COMPLETED' } },
          {
            $group: {
              _id: '$metadata.planName',
              count: { $sum: 1 },
              revenue: {
                $sum: {
                  $toDouble: {
                    $ifNull: ['$amount', '$refundedAmount'],
                  },
                },
              },
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
