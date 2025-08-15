const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');

const router = express.Router();

// router.use(verifyToken, hrOrAdmin);

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_R5dcC7mGZBJI9y',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '29KBqceNnQER5CxM4Aj4Zsen',
});

// Create Razorpay order
router.post('/create-order', async (req, res) => {
    try {
        const { plan, amount, currency } = req.body;

        const options = {
            amount: amount, // amount in paise
            currency: currency,
            receipt: `receipt_${Date.now()}`,
            notes: {
                plan: plan,
                service: 'ChatInsight Premium'
            }
        };

        const order = await razorpay.orders.create(options);

        res.json({
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            // key_id: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verify Razorpay payment
router.post('/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Create signature for verification
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Payment is verified
            // Fetch payment details
            const payment = await razorpay.payments.fetch(razorpay_payment_id);

            if (payment.status === 'captured') {
                // Activate subscription in database
                // Update user subscription status
                res.json({
                    success: true,
                    subscription: { plan: 'premium', isActive: true },
                    payment_id: razorpay_payment_id
                });
            } else {
                res.json({ success: false, error: 'Payment not captured' });
            }
        } else {
            res.json({ success: false, error: 'Invalid signature' });
        }
    } catch (error) {
        console.error('Razorpay verification error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get subscription status
router.get('/subscription/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get from database
        const subscription = await getUserSubscription(userId);

        res.json(subscription);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update usage
router.post('/subscription/usage', async (req, res) => {
    try {
        const { userId, increment } = req.body;

        // Update usage in database
        const updatedSubscription = await updateUserUsage(userId, increment);

        res.json(updatedSubscription);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;