const express = require('express');
const Razorpay = require('razorpay');

const Transaction = require('../models/Transaction');
const Plan = require('../models/Plan');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// router.use(verifyToken);

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_R5dcC7mGZBJI9y',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '29KBqceNnQER5CxM4Aj4Zsen',
});

router.post('/createPaymentLink', verifyToken, async (req, res) => {
  try {
    const { planSlug, billingCycle } = req.body;

    const userId = req.user?.id;
    const customerName = req.user?.name || 'NEW-Customer';
    const customerEmail = req.user?.email || 'new-customer@jatinder.com';

    // Validate required fields
    if (!planSlug || !billingCycle || !customerEmail) {
      return res.status(400).json({
        error: 'Missing required fields: planSlug, billingCycle, and customerEmail are required',
      });
    }

    // Fetch plan details from database
    const plan = await Plan.getBySlug(planSlug);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Get price for the specific billing cycle
    const cyclePrice = plan.getPriceForCycle(billingCycle);
    if (!cyclePrice) {
      return res.status(400).json({ error: 'Invalid billing cycle for this plan' });
    }

    // Convert to paise (multiply by 100)
    const amountInPaise = Math.round(cyclePrice * 100);

    // Generate human readable ID for the transaction
    let lastTransaction = await Transaction.find({}).sort({ createdAt: -1 }).limit(1);
    let humanReadableID = '';

    if (lastTransaction.length > 0) {
      const lastHumanReadableID = lastTransaction[0].humanReadableID;
      if (lastHumanReadableID && lastHumanReadableID.includes('_')) {
        const lastTransactionNumber = lastHumanReadableID.split('_');
        humanReadableID = `payment_${parseInt(lastTransactionNumber.slice(-1)) + 1}`;
      } else {
        humanReadableID = `payment_${String(1).padStart(4, '0')}`;
      }
    } else {
      humanReadableID = `payment_${String(1).padStart(4, '0')}`;
    }

    const options = {
      amount: amountInPaise, // in paise
      currency: plan.currency || 'USD',
      accept_partial: false,
      description: `${plan.name} - ${billingCycle} subscription`,
      customer: {
        name: customerName || 'Customer',
        email: customerEmail,
      },
      notify: {
        sms: false,
        email: true,
      },
      reminder_enable: true,
      callback_url:
        process.env.RAZORPAY_WEBHOOK_URL ||
        'https://backend.empireinfratech.ae/api/payment/razorpay/link/verify',
      callback_method: 'get',
      // Pass transaction ID and other details for verification
      notes: {
        // transactionId: transaction._id,
        planSlug: planSlug,
        billingCycle: billingCycle,
        userId: userId || '',
      },
    };

    const paymentLink = await razorpay.paymentLink.create(options);
    // console.log('Payment link:', paymentLink, transaction.metadata);

    // Create initial transaction record
    const transaction = new Transaction({
      amount: cyclePrice,
      status: 'PENDING',
      paymentType: 'RAZORPAY_LINK',
      date: Date.now(),
      humanReadableID: humanReadableID,
      customerEmail: customerEmail,
      customerName: customerName || 'Customer',
      razorpayPaymentLink: paymentLink.short_url,
      razorpayPaymentLinkId: paymentLink.id,
      // Store plan details for reference
      metadata: {
        planSlug: planSlug,
        planName: plan.name,
        billingCycle: billingCycle,
        planPrice: cyclePrice,
        userId: userId,
        razorpayPaymentLinkDetails: paymentLink,
      },
    });

    await transaction.save();

    res.json({
      link: paymentLink.short_url,
      transactionId: transaction._id,
      humanReadableID: humanReadableID,
      plan: {
        name: plan.name,
        price: cyclePrice,
        billingCycle: billingCycle,
        currency: plan.currency,
      },
    });
  } catch (error) {
    console.error('Payment link error:', error);
    res.status(500).json({ error });
  }
});

router.all('/verifyPayment', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_payment_link_id,
      razorpay_payment_link_reference_id,
      razorpay_payment_link_status,
      razorpay_signature,
    } = req.method === 'GET' ? req.query : req.body;

    let body = '';

    if (req.method === 'GET') {
      if (
        !razorpay_payment_link_id ||
        !razorpay_payment_id ||
        !razorpay_signature ||
        !razorpay_payment_link_status
      ) {
        return res.status(400).json({ success: false, error: 'Missing parameters' });
      }

      body = `${razorpay_payment_link_id}|${razorpay_payment_link_reference_id}|${razorpay_payment_link_status}|${razorpay_payment_id}`;
    } else if (req.method === 'POST') {
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Missing parameters' });
      }

      body = `${razorpay_order_id}|${razorpay_payment_id}`;
    }

    if (
      Razorpay.validateWebhookSignature(body, razorpay_signature, process.env.RAZORPAY_KEY_SECRET)
    ) {
      let transaction = null;

      if (req.method === 'GET') {
        // Payment link verification - find by payment link ID
        transaction = await Transaction.findOne({
          paymentLinkId: razorpay_payment_link_id,
        });

        if (transaction) {
          console.log('Payment link transaction found:', transaction._id);
          // Update existing transaction
          transaction.status = razorpay_payment_link_status === 'paid' ? 'COMPLETED' : 'PENDING';
          transaction.razorpayPaymentId = razorpay_payment_id;
          transaction.razorpaySignature = razorpay_signature;
          transaction.paymentLinkStatus = razorpay_payment_link_status;
          await transaction.save();

          return res.json({
            success: true,
            message: 'Payment link verified and updated successfully',
            transactionId: transaction._id,
            status: transaction.status,
          });
        } else {
          console.log('Payment link not found in our system:', razorpay_payment_link_id);
          return res.status(404).json({
            success: false,
            error: 'Payment link not found in our system',
            paymentLinkId: razorpay_payment_link_id,
          });
        }
      } else if (req.method === 'POST') {
        // Regular order verification - find by order ID
        transaction = await Transaction.findOne({
          razorpayOrderId: razorpay_order_id,
        });

        if (transaction) {
          console.log('Order transaction found:', transaction._id);
          // Update existing transaction
          transaction.status = 'COMPLETED';
          transaction.razorpayPaymentId = razorpay_payment_id;
          transaction.razorpaySignature = razorpay_signature;
          await transaction.save();

          return res.json({
            success: true,
            message: 'Order payment verified and updated successfully',
            transactionId: transaction._id,
            status: transaction.status,
          });
        } else {
          console.log('Order not found in our system:', razorpay_order_id);
          return res.status(404).json({
            success: false,
            error: 'Order not found in our system',
            orderId: razorpay_order_id,
          });
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid signature',
      });
    }
  } catch (error) {
    console.error('Razorpay verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Razorpay order
router.post('/createOrder', verifyToken, async (req, res) => {
  try {
    const { planSlug, billingCycle } = req.body;

    const userId = req.user?.id;
    const customerName = req.user?.name;
    const customerEmail = req.user?.email;

    // Validate required fields
    if (!planSlug || !billingCycle) {
      return res.status(400).json({
        error: 'Missing required fields: planSlug and billingCycle are required',
      });
    }

    // Fetch plan details from database
    const plan = await Plan.getBySlug(planSlug);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Get price for the specific billing cycle
    const cyclePrice = plan.getPriceForCycle(billingCycle);
    if (!cyclePrice) {
      return res.status(400).json({ error: 'Invalid billing cycle for this plan' });
    }

    // Convert to paise (multiply by 100)
    const amountInPaise = Math.round(cyclePrice * 100);

    // Generate human readable ID for the transaction
    let lastTransaction = await Transaction.find({}).sort({ createdAt: -1 }).limit(1);
    let humanReadableID = '';

    if (lastTransaction.length > 0) {
      const lastHumanReadableID = lastTransaction[0].humanReadableID;
      if (lastHumanReadableID && lastHumanReadableID.includes('_')) {
        const lastTransactionNumber = lastHumanReadableID.split('_');
        humanReadableID = `order_${parseInt(lastTransactionNumber.slice(-1)) + 1}`;
      } else {
        humanReadableID = `order_${String(1).padStart(4, '0')}`;
      }
    } else {
      humanReadableID = `order_${String(1).padStart(4, '0')}`;
    }

    const options = {
      amount: amountInPaise, // amount in paise
      currency: plan.currency || 'USD',
      receipt: humanReadableID,
      notes: {
        planSlug: planSlug,
        planName: plan.name,
        billingCycle: billingCycle,
        userId: userId || '',
        service: 'ChatInsight Premium',
      },
    };

    const order = await razorpay.orders.create(options);
    console.log('order', order);

    // Create transaction record
    const transaction = new Transaction({
      amount: cyclePrice,
      status: 'PENDING',
      paymentType: 'RAZORPAY_ORDER',
      date: Date.now(),
      humanReadableID: humanReadableID,
      razorpayOrderId: order.id,
      customerEmail: customerEmail,
      customerName: customerName,
      // Store plan details for reference
      metadata: {
        planSlug: planSlug,
        planName: plan.name,
        billingCycle: billingCycle,
        planPrice: cyclePrice,
        userId: userId,
        razorpayOrderDetails: order,
      },
    });

    await transaction.save();

    res.json({
      order,
      transactionId: transaction._id,
      humanReadableID: humanReadableID,
      plan: {
        name: plan.name,
        price: cyclePrice,
        billingCycle: billingCycle,
        currency: plan.currency,
      },
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get subscription status
router.get('/subscription/status/:userId', async (req, res) => {
  try {
    // const { userId } = req.params;

    // Get from database
    // const subscription = await getUserSubscription(userId);
    const subscription = { error: 'getUserSubscription function not implemented' };

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update usage
router.post('/subscription/usage', async (req, res) => {
  try {
    // const { userId, increment } = req.body;

    // Update usage in database
    // const updatedSubscription = await updateUserUsage(userId, increment);
    const updatedSubscription = { error: 'updateUserUsage function not implemented' };

    res.json(updatedSubscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
