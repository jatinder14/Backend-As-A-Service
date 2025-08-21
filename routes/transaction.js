const express = require('express');
const Transaction = require('../models/Transaction');
const { verifyToken, adminRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// Get user's own transactions
router.get('/myTransactions', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = {
      userId: req.user?.id,
    };

    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-razorpaySignature -metadata.razorpayPaymentLinkDetails'), // Hide sensitive data
      Transaction.countDocuments(filter),
    ]);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get user transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all transactions with pagination and filters
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
        { transactionId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Check if user can access this transaction
    if (req.user?.role !== 'admin' && transaction.userId.toString() !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update transaction (admin only)
router.put('/:id', adminRole, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating certain critical fields
    const restrictedFields = ['_id', 'razorpayPaymentId', 'razorpaySignature', 'createdAt'];
    restrictedFields.forEach(field => delete updates[field]);

    const transaction = await Transaction.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({
      message: 'Transaction updated successfully',
      transaction,
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete transaction (admin only)
router.delete('/:id', adminRole, async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Prevent deletion of completed transactions
    if (transaction.status === 'COMPLETED') {
      return res.status(400).json({
        error: 'Cannot delete completed transactions. Consider updating status instead.',
      });
    }

    await Transaction.findByIdAndDelete(id);

    res.json({
      message: 'Transaction deleted successfully',
      deletedTransaction: {
        id: transaction._id,
        humanReadableID: transaction.humanReadableID,
        status: transaction.status,
      },
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transaction statistics (admin only)
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

    const [
      totalTransactions,
      completedTransactions,
      pendingTransactions,
      totalRevenue,
      revenueByPlan,
    ] = await Promise.all([
      Transaction.countDocuments(dateFilter),
      Transaction.countDocuments({ ...dateFilter, status: 'COMPLETED' }),
      Transaction.countDocuments({ ...dateFilter, status: 'PENDING' }),
      Transaction.aggregate([
        { $match: { ...dateFilter, status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
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
        totalTransactions,
        completedTransactions,
        pendingTransactions,
        successRate:
          totalTransactions > 0
            ? ((completedTransactions / totalTransactions) * 100).toFixed(2)
            : 0,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
      revenueByPlan,
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// // Get transaction by human readable ID
// router.get('/lookup/:humanReadableId', async (req, res) => {
//   try {
//     const { humanReadableId } = req.params;

//     const transaction = await Transaction.findOne({
//       humanReadableID: humanReadableId
//     });

//     if (!transaction) {
//       return res.status(404).json({ error: 'Transaction not found' });
//     }

//     // Check if user can access this transaction
//     if (req.user?.role !== 'admin' && transaction.metadata?.userId !== req.user?.id) {
//       return res.status(403).json({ error: 'Access denied' });
//     }

//     res.json(transaction);
//   } catch (error) {
//     console.error('Lookup transaction error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

module.exports = router;
