const express = require('express');
const Refund = require('../models/Refund');
const { verifyToken, adminRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// Get user's own refunds
router.get('/myRefunds', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = {
      'metadata.userId': req.user?.id,
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

    // Check if user can access this refund
    if (req.user?.role !== 'admin' && refund.metadata?.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied' });
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
    if (refund.status === 'COMPLETED') {
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
