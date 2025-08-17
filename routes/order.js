const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

// Get all orders with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, status, orderType, userId, paymentStatus } = req.query;
        const skip = (page - 1) * limit;

        let query = {};
        
        if (status) query.status = status;
        if (orderType) query.orderType = orderType;
        if (userId) query.user = userId;
        if (paymentStatus) query.paymentStatus = paymentStatus;

        const orders = await Order.find(query)
            .populate('user', 'name email')
            .populate('subscription', 'planName planDetails')
            .populate('cancelledBy', 'name')
            .populate('refundedBy', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(query);

        res.json({
            orders,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get order by ID
router.get('/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email phone')
            .populate('subscription', 'planName planDetails')
            .populate('cancelledBy', 'name')
            .populate('refundedBy', 'name');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create new order
router.post('/', async (req, res) => {
    try {
        const {
            userId,
            subscriptionId,
            orderType,
            items,
            paymentMethod,
            billingAddress,
            shippingAddress,
            notes
        } = req.body;

        // Validate user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Validate subscription if provided
        if (subscriptionId) {
            const subscription = await Subscription.findById(subscriptionId);
            if (!subscription) {
                return res.status(404).json({ message: 'Subscription not found' });
            }
        }

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
        const discount = 0; // Can be calculated based on promotions
        const tax = 0; // Can be calculated based on location
        const totalAmount = subtotal - discount + tax;

        // Create order
        const order = new Order({
            user: userId,
            subscription: subscriptionId,
            orderType,
            items,
            subtotal,
            discount,
            tax,
            totalAmount,
            paymentMethod,
            billingAddress,
            shippingAddress,
            notes
        });

        await order.save();

        res.status(201).json(order);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update order
router.put('/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Update allowed fields
        const allowedUpdates = [
            'status', 'paymentStatus', 'notes', 'expectedDeliveryDate',
            'actualDeliveryDate', 'billingAddress', 'shippingAddress'
        ];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                order[field] = req.body[field];
            }
        });

        await order.save();
        res.json(order);
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Cancel order
router.patch('/:id/cancel', async (req, res) => {
    try {
        const { reason } = req.body;
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status === 'completed') {
            return res.status(400).json({ message: 'Cannot cancel completed order' });
        }

        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.cancelledBy = req.user.id;
        order.cancellationReason = reason;

        await order.save();

        res.json(order);
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Process payment for order
router.post('/:id/process-payment', async (req, res) => {
    try {
        const { paymentMethod, externalPaymentId, gatewayResponse } = req.body;
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Create payment record
        const payment = new Payment({
            user: order.user,
            order: order._id,
            subscription: order.subscription,
            amount: order.totalAmount,
            currency: order.currency,
            paymentMethod,
            paymentType: order.orderType === 'subscription' ? 'subscription' : 'one_time',
            externalPaymentId,
            gatewayResponse,
            status: 'completed',
            processedAt: new Date()
        });

        await payment.save();

        // Update order status
        order.status = 'completed';
        order.paymentStatus = 'paid';
        order.externalPaymentId = externalPaymentId;
        await order.save();

        // If this is a subscription order, update subscription status
        if (order.subscription) {
            const subscription = await Subscription.findById(order.subscription);
            if (subscription) {
                subscription.paymentStatus = 'completed';
                subscription.status = 'active';
                await subscription.save();
            }
        }

        res.json({ order, payment });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Refund order
router.post('/:id/refund', async (req, res) => {
    try {
        const { refundAmount, reason } = req.body;
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.paymentStatus !== 'paid') {
            return res.status(400).json({ message: 'Order is not paid' });
        }

        const refundAmountNum = parseFloat(refundAmount);
        if (refundAmountNum > order.totalAmount) {
            return res.status(400).json({ message: 'Refund amount cannot exceed order total' });
        }

        // Create refund payment record
        const refundPayment = new Payment({
            user: order.user,
            order: order._id,
            subscription: order.subscription,
            amount: refundAmountNum,
            currency: order.currency,
            paymentMethod: order.paymentMethod,
            paymentType: 'refund',
            status: 'completed',
            refundAmount: refundAmountNum,
            refundReason: reason,
            refundedAt: new Date(),
            refundedBy: req.user.id,
            processedAt: new Date()
        });

        await refundPayment.save();

        // Update order
        order.refundAmount = refundAmountNum;
        order.refundReason = reason;
        order.refundedAt = new Date();
        order.refundedBy = req.user.id;

        if (refundAmountNum === order.totalAmount) {
            order.paymentStatus = 'refunded';
        } else {
            order.paymentStatus = 'partially_refunded';
        }

        await order.save();

        res.json({ order, refundPayment });
    } catch (error) {
        console.error('Error processing refund:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get order statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: 'pending' });
        const completedOrders = await Order.countDocuments({ status: 'completed' });
        const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

        // Revenue statistics
        const revenueStats = await Order.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' },
                    avgOrderValue: { $avg: '$totalAmount' }
                }
            }
        ]);

        // Order type distribution
        const orderTypeDistribution = await Order.aggregate([
            { $group: { _id: '$orderType', count: { $sum: 1 } } }
        ]);

        // Payment method distribution
        const paymentMethodDistribution = await Order.aggregate([
            { $group: { _id: '$paymentMethod', count: { $sum: 1 } } }
        ]);

        res.json({
            totalOrders,
            pendingOrders,
            completedOrders,
            cancelledOrders,
            revenueStats: revenueStats[0] || { totalRevenue: 0, avgOrderValue: 0 },
            orderTypeDistribution,
            paymentMethodDistribution
        });
    } catch (error) {
        console.error('Error fetching order stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get user's order history
router.get('/user/:userId/history', async (req, res) => {
    try {
        const orders = await Order.find({ user: req.params.userId })
            .populate('subscription', 'planName planDetails')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error('Error fetching user order history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get orders by subscription
router.get('/subscription/:subscriptionId', async (req, res) => {
    try {
        const orders = await Order.find({ subscription: req.params.subscriptionId })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error('Error fetching subscription orders:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;



