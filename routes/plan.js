const express = require('express');
const router = express.Router();
const Plan = require('../models/Plan');
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');

router.use(verifyToken, adminRole);

// Get all plans with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      isCustom,
      sortBy = 'sortOrder',
      order = 'asc',
    } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (status) query.status = status;
    if (isCustom !== undefined) query.isCustom = isCustom === 'true';

    const sortOrder = order === 'desc' ? -1 : 1;

    const plans = await Plan.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Plan.countDocuments(query);

    res.json({
      plans,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get active plans (public endpoint)
router.get('/active', async (req, res) => {
  try {
    const plans = await Plan.find({ status: 'active' })
      .sort({ sortOrder: 1 })
      .select('-metadata -createdBy -updatedBy');

    res.json(plans);
  } catch (error) {
    console.error('Error fetching active plans:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get plan by ID
router.get('/:id', async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get plan by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const plan = await Plan.findOne({ slug: req.params.slug, status: 'active' })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Error fetching plan by slug:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new plan (admin only)
router.post('/', async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      shortDescription,
      price,
      currency = 'USD',
      billingCycles,
      features,
      limits,
      addons,
      trialDays = 0,
      setupFee = 0,
      cancellationPolicy = 'end_of_billing_period',
      customCancellationDays = 0,
      metadata,
    } = req.body;

    // Validate required fields
    if (!name || !description || !price || !billingCycles || !features || !limits) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if plan with same name or slug already exists
    const existingPlan = await Plan.findOne({
      $or: [{ name }, { slug }],
    });

    if (existingPlan) {
      return res.status(400).json({ message: 'Plan with this name or slug already exists' });
    }

    const plan = new Plan({
      name,
      slug,
      description,
      shortDescription,
      price,
      currency,
      billingCycles,
      features,
      limits,
      addons,
      trialDays,
      setupFee,
      cancellationPolicy,
      customCancellationDays,
      metadata,
      createdBy: req.user.id,
    });

    await plan.save();

    res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update plan (admin only)
router.put('/:id', async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Update allowed fields
    const allowedUpdates = [
      'name',
      'slug',
      'description',
      'shortDescription',
      'price',
      'currency',
      'billingCycles',
      'features',
      'limits',
      'addons',
      'status',
      'sortOrder',
      'trialDays',
      'setupFee',
      'cancellationPolicy',
      'customCancellationDays',
      'metadata',
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        plan[field] = req.body[field];
      }
    });

    plan.updatedBy = req.user.id;
    await plan.save();

    res.json(plan);
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete plan (admin only)
router.delete('/:id', async (req, res) => {
  try {
    // Check if user has admin privileges
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Check if plan has active subscriptions
    const Subscription = require('../models/Subscription');
    const activeSubscriptions = await Subscription.countDocuments({
      plan: plan._id,
      status: { $in: ['active', 'pending'] },
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        message: `Cannot delete plan. It has ${activeSubscriptions} active subscriptions.`,
      });
    }

    await plan.deleteOne();
    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Duplicate plan (admin only)
router.post('/:id/duplicate', async (req, res) => {
  try {
    // Check if user has admin privileges
    const originalPlan = await Plan.findById(req.params.id);

    if (!originalPlan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required for duplicated plan' });
    }

    // Generate a unique slug based on the new name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    let slug = baseSlug;
    let counter = 1;

    // Check if slug already exists and make it unique
    while (await Plan.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create new plan based on original
    const duplicatedPlan = new Plan({
      ...originalPlan.toObject(),
      _id: undefined,
      name,
      description: description || originalPlan.description,
      slug,
      status: 'inactive', // Start as inactive
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    await duplicatedPlan.save();

    res.status(201).json(duplicatedPlan);
  } catch (error) {
    console.error('Error duplicating plan:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get plan statistics
router.get('/stats/overview', async (req, res) => {
  try {
    // Check if user has admin privileges

    const totalPlans = await Plan.countDocuments();
    const activePlans = await Plan.countDocuments({ status: 'active' });
    const inactivePlans = await Plan.countDocuments({ status: 'inactive' });
    const deprecatedPlans = await Plan.countDocuments({ status: 'deprecated' });

    // Plan usage statistics
    const Subscription = require('../models/Subscription');
    const planUsage = await Subscription.aggregate([
      {
        $group: {
          _id: '$plan',
          subscriptionCount: { $sum: 1 },
          activeSubscriptions: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'plans',
          localField: '_id',
          foreignField: '_id',
          as: 'plan',
        },
      },
      {
        $unwind: '$plan',
      },
      {
        $project: {
          planName: '$plan.name',
          planSlug: '$plan.slug',
          subscriptionCount: 1,
          activeSubscriptions: 1,
        },
      },
    ]);

    res.json({
      totalPlans,
      activePlans,
      inactivePlans,
      deprecatedPlans,
      planUsage,
    });
  } catch (error) {
    console.error('Error fetching plan stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Compare plans
router.post('/compare', async (req, res) => {
  try {
    const { planIds } = req.body;

    if (!planIds || !Array.isArray(planIds) || planIds.length < 2) {
      return res.status(400).json({ message: 'At least 2 plan IDs are required for comparison' });
    }

    const plans = await Plan.find({
      _id: { $in: planIds },
      status: 'active',
    }).sort({ sortOrder: 1 });

    if (plans.length < 2) {
      return res
        .status(400)
        .json({ message: 'At least 2 active plans are required for comparison' });
    }

    // Create comparison data
    const comparison = {
      plans: plans.map(plan => ({
        id: plan._id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        billingCycles: plan.billingCycles,
        features: plan.features,
        limits: plan.limits,
        trialDays: plan.trialDays,
        setupFee: plan.setupFee,
      })),
      features: [],
      limits: [],
    };

    // Extract unique features and limits for comparison
    const allFeatures = new Set();
    const allLimits = new Set();

    plans.forEach(plan => {
      plan.features.forEach(feature => allFeatures.add(feature.name));
      Object.keys(plan.limits).forEach(limit => allLimits.add(limit));
    });

    comparison.features = Array.from(allFeatures);
    comparison.limits = Array.from(allLimits);

    res.json(comparison);
  } catch (error) {
    console.error('Error comparing plans:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
