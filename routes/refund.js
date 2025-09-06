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

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_R5dcC7mGZBJI9y',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '29KBqceNnQER5CxM4Aj4Zsen',
});

// Apply authentication to all routes
router.use(verifyToken);

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

// Helper endpoint to get valid transaction IDs for testing
router.get('/helper/transactions', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // Get recent transactions for the authenticated user
    const transactions = await Transaction.find({
      userId: req.user?.id,
      status: { $in: ['COMPLETED', 'SUCCESS'] } // Only successful transactions can be refunded
    })
      .select('_id razorpayPaymentId amount createdAt metadata')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      message: 'Available transactions for refund testing',
      transactions: transactions.map(t => ({
        transactionId: t._id,
        paymentId: t.razorpayPaymentId,
        amount: t.amount,
        date: t.createdAt,
        planName: t.metadata?.planName
      }))
    });
  } catch (error) {
    console.error('Get helper transactions error:', error);
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
