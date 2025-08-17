const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const logger = require('../utils/logger/winstonLogger');

// Function to check and update expired subscriptions
const checkExpiredSubscriptions = async () => {
  try {
    const expiredSubscriptions = await Subscription.find({
      status: 'active',
      endDate: { $lt: new Date() },
    });

    for (const subscription of expiredSubscriptions) {
      subscription.status = 'expired';
      await subscription.save();

      // Update user's subscription status
      const user = await User.findById(subscription.user);
      if (user) {
        user.subscriptionStatus = 'expired';
        await user.save();
      }

      logger.info(`Subscription ${subscription._id} expired for user ${subscription.user}`);
    }

    logger.info(`Processed ${expiredSubscriptions.length} expired subscriptions`);
  } catch (error) {
    logger.error('Error checking expired subscriptions:', error);
  }
};

// Function to process upcoming renewals
const processUpcomingRenewals = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingRenewals = await Subscription.find({
      status: 'active',
      autoRenew: true,
      nextBillingDate: { $lte: tomorrow },
    });

    for (const subscription of upcomingRenewals) {
      try {
        // Create renewal order
        const renewalOrder = new Order({
          user: subscription.user,
          subscription: subscription._id,
          orderType: 'renewal',
          items: [
            {
              name: `${subscription.planSnapshot.name} Renewal`,
              description: `Renewal for ${subscription.billingCycle} billing cycle`,
              quantity: 1,
              unitPrice: subscription.planSnapshot.price,
              totalPrice: subscription.planSnapshot.price,
              type: 'subscription_plan',
            },
          ],
          subtotal: subscription.planSnapshot.price,
          discount: subscription.discount,
          tax: subscription.tax,
          totalAmount: subscription.finalAmount,
          paymentMethod: subscription.paymentMethod,
          status: 'pending',
          paymentStatus: 'pending',
        });

        await renewalOrder.save();

        // Attempt to process payment (this would integrate with your payment gateway)
        // For now, we'll just log the renewal
        logger.info(
          `Created renewal order ${renewalOrder._id} for subscription ${subscription._id}`
        );

        // Update next billing date
        subscription.nextBillingDate = subscription.calculateNextBillingDate();
        await subscription.save();
      } catch (error) {
        logger.error(`Error processing renewal for subscription ${subscription._id}:`, error);
      }
    }

    logger.info(`Processed ${upcomingRenewals.length} upcoming renewals`);
  } catch (error) {
    logger.error('Error processing upcoming renewals:', error);
  }
};

// Function to send renewal reminders
const sendRenewalReminders = async () => {
  try {
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 7); // 7 days before renewal

    const subscriptionsNeedingReminders = await Subscription.find({
      status: 'active',
      autoRenew: true,
      nextBillingDate: { $lte: reminderDate },
    }).populate('user', 'name email');

    for (const subscription of subscriptionsNeedingReminders) {
      // Here you would integrate with your email service
      // For now, we'll just log the reminder
      logger.info(
        `Sending renewal reminder to ${subscription.user.email} for subscription ${subscription._id}`
      );

      // You can add email sending logic here
      // await emailService.sendRenewalReminder(subscription);
    }

    logger.info(`Sent ${subscriptionsNeedingReminders.length} renewal reminders`);
  } catch (error) {
    logger.error('Error sending renewal reminders:', error);
  }
};

// Function to generate subscription reports
const generateSubscriptionReports = async () => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Monthly subscription statistics
    const monthlyStats = await Subscription.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          newSubscriptions: { $sum: 1 },
          totalRevenue: { $sum: '$finalAmount' },
          avgSubscriptionValue: { $avg: '$finalAmount' },
        },
      },
    ]);

    // Plan distribution
    const planDistribution = await Subscription.aggregate([
      {
        $match: {
          status: 'active',
        },
      },
      {
        $group: {
          _id: '$planName',
          count: { $sum: 1 },
        },
      },
    ]);

    // Churn rate calculation
    const cancelledThisMonth = await Subscription.countDocuments({
      status: 'cancelled',
      cancelledAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const activeAtStartOfMonth = await Subscription.countDocuments({
      status: 'active',
      createdAt: { $lt: startOfMonth },
    });

    const churnRate =
      activeAtStartOfMonth > 0 ? (cancelledThisMonth / activeAtStartOfMonth) * 100 : 0;

    const report = {
      month: today.toISOString().slice(0, 7),
      stats: monthlyStats[0] || { newSubscriptions: 0, totalRevenue: 0, avgSubscriptionValue: 0 },
      planDistribution,
      churnRate: churnRate.toFixed(2),
    };

    logger.info('Monthly subscription report:', report);

    // You can store this report in a database or send it via email
    // await saveReport(report);
  } catch (error) {
    logger.error('Error generating subscription reports:', error);
  }
};

// Schedule cron jobs
const initSubscriptionCronJobs = () => {
  // Check expired subscriptions daily at 2 AM
  cron.schedule('0 2 * * *', () => {
    logger.info('Running expired subscriptions check');
    checkExpiredSubscriptions();
  });

  // Process upcoming renewals daily at 6 AM
  cron.schedule('0 6 * * *', () => {
    logger.info('Running upcoming renewals check');
    processUpcomingRenewals();
  });

  // Send renewal reminders daily at 10 AM
  cron.schedule('0 10 * * *', () => {
    logger.info('Running renewal reminders');
    sendRenewalReminders();
  });

  // Generate monthly reports on the 1st of each month at 8 AM
  cron.schedule('0 8 1 * *', () => {
    logger.info('Generating monthly subscription report');
    generateSubscriptionReports();
  });

  logger.info('Subscription management cron jobs initialized');
};

module.exports = {
  initSubscriptionCronJobs,
  checkExpiredSubscriptions,
  processUpcomingRenewals,
  sendRenewalReminders,
  generateSubscriptionReports,
};
