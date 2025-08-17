const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
// const auth = require('../middleware/auth');

// Get all subscriptions with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, status, planId, userId } = req.query;
        const skip = (page - 1) * limit;

        let query = {};

        if (status) query.status = status;
        if (planId) query.plan = planId;
        if (userId) query.user = userId;

        const subscriptions = await Subscription.find(query)
            .populate('user', 'name email')
            .populate('plan', 'name slug')
            .populate('cancelledBy', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Subscription.countDocuments(query);

        res.json({
            subscriptions,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get subscription by ID
router.get('/:id', async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id)
            .populate('user', 'name email phone')
            .populate('plan', 'name slug description features limits')
            .populate('cancelledBy', 'name');

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        res.json(subscription);
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create new subscription
router.post('/', async (req, res) => {
    try {
        const {
            userId,
            planId,
            billingCycle,
            paymentMethod,
            discount = 0,
            tax = 0,
            autoRenew = true,
            notes
        } = req.body;

        // Validate user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Validate plan exists and is active
        const Plan = require('../models/Plan');
        const plan = await Plan.findById(planId);
        if (!plan || plan.status !== 'active') {
            return res.status(404).json({ message: 'Plan not found or inactive' });
        }

        // Use subscription service to create subscription
        const SubscriptionService = require('../services/subscriptionService');
        const subscription = await SubscriptionService.createSubscription(
            userId,
            planId,
            billingCycle,
            paymentMethod,
            {
                discount,
                tax,
                autoRenew,
                notes
            }
        );

        res.status(201).json(subscription);
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update subscription
router.put('/:id', async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        // Update allowed fields
        const allowedUpdates = [
            'planDetails', 'billingCycle', 'autoRenew', 'notes',
            'paymentMethod', 'status', 'nextBillingDate'
        ];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                subscription[field] = req.body[field];
            }
        });

        await subscription.save();
        res.json(subscription);
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Cancel subscription
router.patch('/:id/cancel', async (req, res) => {
    try {
        const { reason } = req.body;
        const subscription = await Subscription.findById(req.params.id);

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        subscription.status = 'cancelled';
        subscription.cancelledAt = new Date();
        subscription.cancelledBy = req.user.id;
        subscription.cancellationReason = reason;

        await subscription.save();

        // Update user's subscription status
        const user = await User.findById(subscription.user);
        if (user) {
            user.subscriptionStatus = 'cancelled';
            await user.save();
        }

        res.json(subscription);
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Renew subscription
router.patch('/:id/renew', async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        // Calculate new dates
        const newStartDate = new Date();
        const newEndDate = subscription.calculateNextBillingDate();
        const newNextBillingDate = subscription.calculateNextBillingDate();

        subscription.startDate = newStartDate;
        subscription.endDate = newEndDate;
        subscription.nextBillingDate = newNextBillingDate;
        subscription.status = 'active';

        await subscription.save();

        // Update user's subscription status
        const user = await User.findById(subscription.user);
        if (user) {
            user.subscriptionStatus = 'active';
            user.subscriptionExpiryDate = newEndDate;
            await user.save();
        }

        res.json(subscription);
    } catch (error) {
        console.error('Error renewing subscription:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get subscription statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const totalSubscriptions = await Subscription.countDocuments();
        const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
        const cancelledSubscriptions = await Subscription.countDocuments({ status: 'cancelled' });
        const expiredSubscriptions = await Subscription.countDocuments({ status: 'expired' });

        // Revenue statistics
        const revenueStats = await Subscription.aggregate([
            { $match: { status: 'active' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$finalAmount' },
                    avgRevenue: { $avg: '$finalAmount' }
                }
            }
        ]);

        // Plan distribution
        const planDistribution = await Subscription.aggregate([
            {
                $lookup: {
                    from: 'plans',
                    localField: 'plan',
                    foreignField: '_id',
                    as: 'planData'
                }
            },
            {
                $unwind: '$planData'
            },
            {
                $group: {
                    _id: '$planData.name',
                    count: { $sum: 1 },
                    planSlug: { $first: '$planData.slug' }
                }
            }
        ]);

        res.json({
            totalSubscriptions,
            activeSubscriptions,
            cancelledSubscriptions,
            expiredSubscriptions,
            revenueStats: revenueStats[0] || { totalRevenue: 0, avgRevenue: 0 },
            planDistribution
        });
    } catch (error) {
        console.error('Error fetching subscription stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get user's subscription history
router.get('/user/:userId/history', async (req, res) => {
    try {
        const subscriptions = await Subscription.find({ user: req.params.userId })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        res.json(subscriptions);
    } catch (error) {
        console.error('Error fetching user subscription history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get upcoming renewals
router.get('/upcoming/renewals', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + parseInt(days));

        const upcomingRenewals = await Subscription.find({
            status: 'active',
            nextBillingDate: { $lte: futureDate }
        })
            .populate('user', 'name email')
            .sort({ nextBillingDate: 1 });

        res.json(upcomingRenewals);
    } catch (error) {
        console.error('Error fetching upcoming renewals:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
