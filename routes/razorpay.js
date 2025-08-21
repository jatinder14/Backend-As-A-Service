const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const Transaction = require('../models/Transaction');
const Plan = require('../models/Plan');
const Refund = require('../models/Refund');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// router.use(verifyToken);

// Validate environment variables
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn(
    'Warning: Razorpay credentials not found in environment variables. Using test credentials.'
  );
}

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
        'https://backend.empireinfratech.ae/api/payment/razorpay/verifyPayment',
      callback_method: 'get',
      // Pass transaction ID and other details for verification
      notes: {
        // transactionId: transaction._id,
        planSlug: planSlug,
        billingCycle: billingCycle,
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
      userId: userId, // REQUIRED: Associate transaction with user
      razorpayPaymentLink: paymentLink.short_url,
      razorpayPaymentLinkId: paymentLink.id,
      // Store plan details for reference
      metadata: {
        planSlug: planSlug,
        planName: plan.name,
        billingCycle: billingCycle,
        planPrice: cyclePrice,
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
          razorpayPaymentLinkId: razorpay_payment_link_id,
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
      userId: userId, // REQUIRED: Associate transaction with user
      // Store plan details for reference
      metadata: {
        planSlug: planSlug,
        planName: plan.name,
        billingCycle: billingCycle,
        planPrice: cyclePrice,
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

router.post('/webhook', async (req, res) => {
  try {
    console.log('Webhook received:', req.body);
    const responseData = req.body;
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      console.log('No signature provided');
      return res.status(400).json({ error: 'No signature provided' });
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(responseData))
      .digest('hex');

    if (expectedSignature !== signature) {
      console.log('Invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log('Webhook signature verified successfully');

    // Handle different webhook events
    const event = responseData.event;
    const payload = responseData.payload;

    switch (event) {
      case 'payment.captured':
      case 'payment.authorized':
        await handlePaymentSuccess(payload);
        break;

      case 'payment.failed':
        await handlePaymentFailure(payload);
        break;

      case 'refund.created':
        await handleRefundCreated(payload);
        break;

      case 'refund.processed':
        await handleRefundProcessed(payload);
        break;

      case 'refund.failed':
        await handleRefundFailed(payload);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return res.json({ status: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Helper functions for webhook event handling
async function handlePaymentSuccess(payload) {
  const payment = payload.payment.entity;
  const orderId = payment.order_id;

  if (orderId) {
    const transaction = await Transaction.findOne({ razorpayOrderId: orderId });
    if (transaction) {
      transaction.status = 'COMPLETED';
      transaction.razorpayPaymentId = payment.id;
      await transaction.save();

      // Update user payment status
      await updateUserPaymentStatus(transaction.userId, transaction, 'completed');

      console.log(`Payment successful for transaction: ${transaction._id}`);
    }
  }
}

async function handlePaymentFailure(payload) {
  const payment = payload.payment.entity;
  const orderId = payment.order_id;

  if (orderId) {
    const transaction = await Transaction.findOne({ razorpayOrderId: orderId });
    if (transaction) {
      transaction.status = 'FAILED';
      transaction.razorpayPaymentId = payment.id;
      await transaction.save();
      console.log(`Payment failed for transaction: ${transaction._id}`);
    }
  }
}

async function handleRefundCreated(payload) {
  const refund = payload.refund.entity;
  const paymentId = refund.payment_id;

  // Find the original transaction
  const transaction = await Transaction.findOne({ razorpayPaymentId: paymentId });
  if (transaction) {
    // Create refund record
    const refundRecord = new Refund({
      refundId: refund.id,
      refundedAmount: (refund.amount / 100).toString(), // Convert from paise to rupees
      razorpayPaymentId: paymentId,
      isRefunded: 'pending',
      created_at: new Date(refund.created_at * 1000).toISOString(),
      transationId: transaction._id.toString(),
    });

    await refundRecord.save();
    console.log(`Refund created: ${refund.id}`);
  }
}

async function handleRefundProcessed(payload) {
  const refund = payload.refund.entity;

  const refundRecord = await Refund.findOne({ refundId: refund.id });
  if (refundRecord) {
    refundRecord.isRefunded = 'completed';
    await refundRecord.save();

    // Update user refund status
    const transaction = await Transaction.findOne({ razorpayPaymentId: refund.payment_id });
    if (transaction) {
      await updateUserPaymentStatus(transaction.userId, transaction, 'refunded');
    }

    console.log(`Refund processed: ${refund.id}`);
  }
}

// Update user payment status and history
async function updateUserPaymentStatus(userId, transaction, status) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const paymentRecord = {
      transactionId: transaction._id,
      amount: transaction.amount,
      status: status,
      date: new Date(),
      planName: transaction.metadata?.planName,
      billingCycle: transaction.metadata?.billingCycle,
    };

    // Add to payment history
    user.paymentHistory.push(paymentRecord);

    if (status === 'completed') {
      // Update payment status flags
      user.isPaidCustomer = true;
      user.subscriptionStatus = 'active';
      user.totalAmountPaid = (user.totalAmountPaid || 0) + transaction.amount;

      if (!user.firstPaymentDate) {
        user.firstPaymentDate = new Date();
      }
      user.lastPaymentDate = new Date();

      // Set subscription expiry based on billing cycle
      const billingCycle = transaction.metadata?.billingCycle;
      if (billingCycle) {
        const expiryDate = new Date();
        switch (billingCycle) {
          case 'monthly':
            expiryDate.setMonth(expiryDate.getMonth() + 1);
            break;
          case 'quarterly':
            expiryDate.setMonth(expiryDate.getMonth() + 3);
            break;
          case 'yearly':
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            break;
          default:
            expiryDate.setMonth(expiryDate.getMonth() + 1);
        }
        user.subscriptionExpiryDate = expiryDate;
      }
    } else if (status === 'refunded') {
      user.totalRefunded = (user.totalRefunded || 0) + transaction.amount;

      // If fully refunded and no other active payments, update status
      if (user.totalRefunded >= user.totalAmountPaid) {
        user.isPaidCustomer = false;
        user.subscriptionStatus = 'cancelled';
      }
    }

    await user.save();
    console.log(`Updated payment status for user: ${userId}`);
  } catch (error) {
    console.error('Error updating user payment status:', error);
  }
}

async function handleRefundFailed(payload) {
  const refund = payload.refund.entity;

  const refundRecord = await Refund.findOne({ refundId: refund.id });
  if (refundRecord) {
    refundRecord.isRefunded = 'failed';
    await refundRecord.save();
    console.log(`Refund failed: ${refund.id}`);
  }
}

router.post('/refund', verifyToken, async (req, res) => {
  try {
    const { paymentId, amount, transactionId, reason } = req.body;

    // Validate required fields
    if (!paymentId && !transactionId) {
      return res.status(400).json({
        status: false,
        message: 'Either paymentId or transactionId is required',
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: false,
        message: 'Valid refund amount is required',
      });
    }

    let razorpayPaymentId = paymentId;
    let transaction = null;

    // If transactionId is provided, find the payment ID from transaction
    if (transactionId) {
      transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        return res.status(404).json({
          status: false,
          message: 'Transaction not found',
        });
      }
      razorpayPaymentId = transaction.razorpayPaymentId;
    } else if (paymentId) {
      // Find transaction by payment ID
      transaction = await Transaction.findOne({ razorpayPaymentId: paymentId });
    }

    if (!transaction) {
      return res.status(404).json({
        status: false,
        message: 'Transaction not found',
      });
    }

    // SECURITY CHECK: Ensure user can only refund their own transactions
    if (req.user?.role !== 'admin' && transaction.userId.toString() !== req.user?.id) {
      return res.status(403).json({
        status: false,
        message: 'Access denied - You can only request refunds for your own transactions',
      });
    }

    if (!razorpayPaymentId) {
      return res.status(400).json({
        status: false,
        message: 'Razorpay payment ID not found',
      });
    }

    // Verify payment exists in Razorpay
    try {
      const payment = await razorpay.payments.fetch(razorpayPaymentId);
      console.log('Payment details:', payment);

      // Check if payment is captured
      if (payment.status !== 'captured') {
        return res.status(400).json({
          status: false,
          message: 'Payment is not captured, cannot process refund',
        });
      }
    } catch (error) {
      console.error('Error fetching payment:', error);
      return res.status(404).json({
        status: false,
        message: 'Payment not found in Razorpay',
      });
    }

    // Convert amount to paise
    const refundAmountInPaise = Math.round(Math.abs(amount) * 100);
    console.log(`Refund amount in paise: ${refundAmountInPaise}`);

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

    console.log('Razorpay refund response:', refundResponse);

    // Create refund record in database
    const refundRecord = new Refund({
      refundId: refundResponse.id,
      refundedAmount: (refundResponse.amount / 100).toString(),
      isRefunded: 'pending', // Will be updated via webhook
      razorpayPaymentId: refundResponse.payment_id,
      created_at: new Date(refundResponse.created_at * 1000).toISOString(),
      transationId: transaction?._id?.toString() || '',
    });

    await refundRecord.save();

    // Update transaction status if found
    if (transaction) {
      transaction.status = 'REFUND_INITIATED';
      await transaction.save();
    }

    return res.json({
      status: true,
      message: `Refund of ₹${amount} initiated successfully`,
      refundId: refundResponse.id,
      refundAmount: amount,
      refundStatus: 'initiated',
    });
  } catch (error) {
    console.error('Refund processing error:', error);

    let errorMessage = 'We encountered an unexpected error while processing your refund';

    if (error.statusCode === 404) {
      errorMessage = 'Payment not found';
    } else if (error.statusCode === 400) {
      errorMessage = error.error?.description || 'Invalid refund request';
    }

    return res.status(500).json({
      status: false,
      message: errorMessage,
    });
  }
});

router.get('/fetchPayment/:id', verifyToken, async (req, res) => {
  try {
    const paymentId = req.params.id;
    console.log(`Fetching payment: ${paymentId}`);

    const payment = await razorpay.payments.fetch(paymentId);
    console.log('Payment details:', payment);

    return res.json({
      status: true,
      payment: payment,
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return res.status(500).json({
      status: false,
      message: 'Error fetching payment details',
      error: error.message,
    });
  }
});

// Get user's payment status and subscription info
router.get('/user/payment-status', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user?.id).select(
      'isPaidCustomer subscriptionStatus subscriptionExpiryDate totalAmountPaid totalRefunded firstPaymentDate lastPaymentDate paymentHistory'
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's transactions
    const transactions = await Transaction.find({ userId: req.user?.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('amount status humanReadableID date metadata.planName metadata.billingCycle');

    // Get user's refunds
    const userTransactionIds = transactions.map(t => t._id.toString());
    const refunds = await Refund.find({ transationId: { $in: userTransactionIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('refundId refundedAmount status isRefunded created_at');

    res.json({
      paymentStatus: {
        isPaidCustomer: user.isPaidCustomer,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiryDate: user.subscriptionExpiryDate,
        totalAmountPaid: user.totalAmountPaid || 0,
        totalRefunded: user.totalRefunded || 0,
        firstPaymentDate: user.firstPaymentDate,
        lastPaymentDate: user.lastPaymentDate,
        isSubscriptionActive:
          user.subscriptionStatus === 'active' &&
          user.subscriptionExpiryDate &&
          new Date(user.subscriptionExpiryDate) > new Date(),
      },
      recentTransactions: transactions,
      recentRefunds: refunds,
      paymentHistory: user.paymentHistory.slice(-10), // Last 10 payment records
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get subscription status (legacy endpoint)
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

// Test webhook endpoint for development
router.post('/webhook/test', async (req, res) => {
  try {
    console.log('Test webhook received:', {
      headers: req.headers,
      body: req.body,
    });

    res.json({
      status: true,
      message: 'Test webhook received successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
