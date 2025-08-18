const express = require('express');
const Razorpay = require('razorpay');

const Transaction = require('../models/Transaction');

const router = express.Router();

// router.use(verifyToken, hrOrAdmin);

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_R5dcC7mGZBJI9y',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '29KBqceNnQER5CxM4Aj4Zsen',
});

router.post('/link/create-payment', async (req, res) => {
  try {
    const { amount, currency, customerName, customerEmail } = req.body;

    const options = {
      amount: amount, // in paise
      currency: currency,
      accept_partial: false,
      description: 'ChatInsight Premium Subscription',
      customer: {
        name: customerName || 'Test User',
        email: customerEmail || 'test@example.com',
      },
      notify: {
        sms: false,
        email: true,
      },
      reminder_enable: true,
      callback_url:
        process.env.RAZORPAY_WEBHOOK_URL ||
        'https://backend.empireinfratech.ae/api/payment/razorpay/link/verify', // Your verify route
      callback_method: 'get',
    };

    const paymentLink = await razorpay.paymentLink.create(options);

    res.json({ link: paymentLink.short_url });
  } catch (error) {
    console.error('Payment link error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.all('/link/verify', async (req, res) => {
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
    // console.log('🔹 Body string:', body);

    if (
      Razorpay.validateWebhookSignature(body, razorpay_signature, process.env.RAZORPAY_KEY_SECRET)
    ) {
      return res.json({
        success: true,
        message: 'Payment verified successfully',
      });
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
router.post('/create-order', async (req, res) => {
  try {
    const { plan, amount, currency } = req.body;

    const options = {
      amount: amount, // amount in paise
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        plan: plan,
        service: 'ChatInsight Premium',
      },
    };

    const order = await razorpay.orders.create(options);

    res.json({
      order,
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/create-payment', async (req, res) => {
  try {
    const { transactionId, data } = req;
    console.log('[Payment] data......................', data);

    let lastTransaction = await Transaction.find({}).sort({ createdAt: -1 }).limit(1);
    let humanReadableID = '';

    if (lastTransaction) {
      const lastHumanReadableID = lastTransaction.humanReadableID;

      if (lastHumanReadableID) {
        const lastTransactionNumber = lastHumanReadableID.split('-');

        //get humanReadable id
        humanReadableID = `transactionId_${parseInt(lastTransactionNumber.slice(-1)) + 1}`;
      } else {
        humanReadableID = `transactionId_${String(1).padStart(4, '0')}`;
      }
    } else {
      humanReadableID = `transactionId_${String(1).padStart(4, '0')}`;
    }

    let options = {
      amount: parseInt(data.amount) * 100,
      currency: 'INR',
      receipt: humanReadableID,
    };
    console.log('[Payment] option......................', options);

    let orderDetail = await razorpay.orders.create(options);

    const transaction = {
      amount: data.amount,
      status: 'COMPLETED',
      type: 'ON-ORDER',
      transactionId: transactionId,
      orderId: orderDetail.id,
      humanReadableID: humanReadableID,
    };
    const intentTransaction = new Transaction(transaction);
    await intentTransaction.save();

    return res.json({
      orderDetail,
      intentTransaction,
      transactionIdx: intentTransaction._id,
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
