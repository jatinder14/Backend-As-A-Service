const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const User = require('../models/User');
const Order = require('../models/Order');
// const Payment = require('../models/Payment');
const logger = require('../utils/logger/winstonLogger');

class SubscriptionService {
  // Create a new subscription
  static async createSubscription(userId, planId, billingCycle, paymentMethod, options = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const plan = await Plan.findById(planId);
      if (!plan || plan.status !== 'active') {
        throw new Error('Invalid or inactive plan');
      }

      // Check if user already has an active subscription
      const existingSubscription = await Subscription.findOne({
        user: userId,
        status: { $in: ['active', 'pending'] },
      });

      if (existingSubscription) {
        throw new Error('User already has an active subscription');
      }

      // Get price for the selected billing cycle
      const cyclePrice = plan.getPriceForCycle(billingCycle);
      const discountedPrice = plan.getDiscountedPriceForCycle(billingCycle);

      // Calculate billing dates
      const startDate = new Date();
      const endDate = this.calculateEndDate(startDate, billingCycle);
      const nextBillingDate = this.calculateNextBillingDate(startDate, billingCycle);

      // Calculate amounts
      const totalAmount = discountedPrice;
      const discount = options.discount || cyclePrice - discountedPrice;
      const tax = options.tax || 0;
      const finalAmount = totalAmount - discount + tax;

      // Create plan snapshot
      const planSnapshot = {
        name: plan.name,
        description: plan.description,
        price: cyclePrice,
        currency: plan.currency,
        features: plan.features.map(f => f.name),
        limits: plan.limits,
      };

      const subscription = new Subscription({
        user: userId,
        plan: planId,
        planSnapshot,
        billingCycle,
        paymentMethod,
        totalAmount,
        discount,
        tax,
        finalAmount,
        startDate,
        endDate,
        nextBillingDate,
        autoRenew: options.autoRenew !== false,
        notes: options.notes,
      });

      await subscription.save();

      // Update user's subscription status
      user.currentSubscription = subscription._id;
      user.subscriptionStatus = 'active';
      user.subscriptionExpiryDate = endDate;
      await user.save();

      logger.info(`Created subscription ${subscription._id} for user ${userId}`);
      return subscription;
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Upgrade or downgrade subscription
  static async changeSubscription(subscriptionId, newPlanId, options = {}) {
    try {
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found', options);
      }

      const newPlan = await Plan.findById(newPlanId);
      if (!newPlan || newPlan.status !== 'active') {
        throw new Error('Invalid or inactive plan');
      }

      // Get price for the current billing cycle
      const newCyclePrice = newPlan.getPriceForCycle(subscription.billingCycle);
      const newDiscountedPrice = newPlan.getDiscountedPriceForCycle(subscription.billingCycle);

      // Calculate proration if needed
      // const prorationAmount = options.prorate ? this.calculateProration(subscription, newPlan) : 0;

      // Create upgrade/downgrade order
      const orderType =
        newDiscountedPrice > subscription.planSnapshot.price ? 'upgrade' : 'downgrade';

      const order = new Order({
        user: subscription.user,
        subscription: subscription._id,
        orderType,
        items: [
          {
            name: `${newPlan.name} ${orderType}`,
            description: `${orderType} from ${subscription.planSnapshot.name} to ${newPlan.name}`,
            quantity: 1,
            unitPrice: Math.abs(newDiscountedPrice - subscription.planSnapshot.price),
            totalPrice: Math.abs(newDiscountedPrice - subscription.planSnapshot.price),
            type: 'subscription_plan',
          },
        ],
        subtotal: Math.abs(newDiscountedPrice - subscription.planSnapshot.price),
        discount: 0,
        tax: 0,
        totalAmount: Math.abs(newDiscountedPrice - subscription.planSnapshot.price),
        paymentMethod: subscription.paymentMethod,
        status: 'pending',
        paymentStatus: 'pending',
      });

      await order.save();

      // Update subscription with new plan snapshot
      const newPlanSnapshot = {
        name: newPlan.name,
        description: newPlan.description,
        price: newCyclePrice,
        currency: newPlan.currency,
        features: newPlan.features.map(f => f.name),
        limits: newPlan.limits,
      };

      subscription.plan = newPlanId;
      subscription.planSnapshot = newPlanSnapshot;
      subscription.totalAmount = newDiscountedPrice;
      subscription.finalAmount = newDiscountedPrice;

      await subscription.save();

      logger.info(`Changed subscription ${subscriptionId} to ${newPlan.name}`);
      return { subscription, order };
    } catch (error) {
      logger.error('Error changing subscription:', error);
      throw error;
    }
  }

  // Cancel subscription
  static async cancelSubscription(subscriptionId, reason, cancelledBy) {
    try {
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
      subscription.cancelledBy = cancelledBy;
      subscription.cancellationReason = reason;

      await subscription.save();

      // Update user's subscription status
      const user = await User.findById(subscription.user);
      if (user) {
        user.subscriptionStatus = 'cancelled';
        await user.save();
      }

      logger.info(`Cancelled subscription ${subscriptionId}`);
      return subscription;
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // Renew subscription
  static async renewSubscription(subscriptionId) {
    try {
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const newStartDate = new Date();
      const newEndDate = this.calculateEndDate(newStartDate, subscription.billingCycle);
      const newNextBillingDate = this.calculateNextBillingDate(
        newStartDate,
        subscription.billingCycle
      );

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

      logger.info(`Renewed subscription ${subscriptionId}`);
      return subscription;
    } catch (error) {
      logger.error('Error renewing subscription:', error);
      throw error;
    }
  }

  // Check user's subscription status and limits
  static async checkUserAccess(userId) {
    try {
      const user = await User.findById(userId).populate('currentSubscription');
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.currentSubscription || user.subscriptionStatus !== 'active') {
        return {
          hasAccess: false,
          reason: 'No active subscription',
          currentPlan: null,
          limits: null,
        };
      }

      const subscription = user.currentSubscription;
      const limits = subscription.planSnapshot.limits;

      // Check if subscription is expired
      if (new Date() > subscription.endDate) {
        return {
          hasAccess: false,
          reason: 'Subscription expired',
          currentPlan: subscription.planSnapshot.name,
          limits,
        };
      }

      // For now, just check if user has an active subscription
      // Usage tracking has been removed - implement specific limits as needed
      let hasAccess = true;
      let reason = null;

      // Basic access control - can be extended with specific limits later
      if (!subscription || subscription.status !== 'active') {
        hasAccess = false;
        reason = 'No active subscription';
      }

      return {
        hasAccess,
        reason,
        currentPlan: subscription.planSnapshot.name,
        limits,
        // Removed usage stats - implement specific tracking as needed
      };
    } catch (error) {
      logger.error('Error checking user access:', error);
      throw error;
    }
  }

  // Update user activity (simplified from usage stats)
  static async updateUserActivity(userId) {
    try {
      await User.findByIdAndUpdate(userId, {
        lastActivity: new Date(),
      });

      logger.info(`Updated last activity for user ${userId}`);
    } catch (error) {
      logger.error('Error updating user activity:', error);
      throw error;
    }
  }

  // Calculate end date based on billing cycle
  static calculateEndDate(startDate, billingCycle) {
    const endDate = new Date(startDate);

    switch (billingCycle) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        throw new Error('Invalid billing cycle');
    }

    return endDate;
  }

  // Calculate next billing date
  static calculateNextBillingDate(startDate, billingCycle) {
    return this.calculateEndDate(startDate, billingCycle);
  }

  // Calculate proration amount
  static calculateProration(subscription, newPlan) {
    const now = new Date();
    const daysRemaining = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil(
      (subscription.endDate - subscription.startDate) / (1000 * 60 * 60 * 24)
    );

    const currentPlanDailyRate = subscription.planSnapshot.price / totalDays;
    const newPlanDailyRate = newPlan.getPriceForCycle(subscription.billingCycle) / totalDays;

    return (newPlanDailyRate - currentPlanDailyRate) * daysRemaining;
  }

  // Get subscription statistics
  static async getSubscriptionStats() {
    try {
      const stats = await Subscription.aggregate([
        {
          $group: {
            _id: null,
            totalSubscriptions: { $sum: 1 },
            activeSubscriptions: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
            },
            totalRevenue: { $sum: '$finalAmount' },
            avgSubscriptionValue: { $avg: '$finalAmount' },
          },
        },
      ]);

      const planDistribution = await Subscription.aggregate([
        { $group: { _id: '$planName', count: { $sum: 1 } } },
      ]);

      return {
        ...stats[0],
        planDistribution,
      };
    } catch (error) {
      logger.error('Error getting subscription stats:', error);
      throw error;
    }
  }
}

module.exports = SubscriptionService;
