const User = require('../models/User');

// Middleware to check if user is a paid customer
const requirePaidCustomer = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.id).select(
      'isPaidCustomer subscriptionStatus subscriptionExpiryDate'
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        requiresPayment: true,
      });
    }

    // Check if user is a paid customer with active subscription
    const isSubscriptionActive =
      user.subscriptionStatus === 'active' &&
      user.subscriptionExpiryDate &&
      new Date(user.subscriptionExpiryDate) > new Date();

    if (!user.isPaidCustomer || !isSubscriptionActive) {
      return res.status(403).json({
        error: 'This feature requires an active subscription',
        requiresPayment: true,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpired:
          user.subscriptionExpiryDate && new Date(user.subscriptionExpiryDate) <= new Date(),
      });
    }

    // Add subscription info to request for use in route handlers
    req.subscription = {
      isPaidCustomer: user.isPaidCustomer,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionExpiryDate: user.subscriptionExpiryDate,
      isActive: isSubscriptionActive,
    };

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Error checking subscription status' });
  }
};

// Middleware to check subscription status (non-blocking, just adds info)
const checkSubscriptionStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.id).select(
      'isPaidCustomer subscriptionStatus subscriptionExpiryDate'
    );

    if (user) {
      const isSubscriptionActive =
        user.subscriptionStatus === 'active' &&
        user.subscriptionExpiryDate &&
        new Date(user.subscriptionExpiryDate) > new Date();

      req.subscription = {
        isPaidCustomer: user.isPaidCustomer,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiryDate: user.subscriptionExpiryDate,
        isActive: isSubscriptionActive,
      };
    }

    next();
  } catch (error) {
    console.error('Subscription status check error:', error);
    // Don't block the request, just continue without subscription info
    next();
  }
};

// Check if user has trial access
const checkTrialAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.id).select(
      'isPaidCustomer subscriptionStatus createdAt'
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If paid customer, allow access
    if (user.isPaidCustomer && user.subscriptionStatus === 'active') {
      req.accessType = 'paid';
      return next();
    }

    // Check if within trial period (e.g., 7 days from registration)
    const trialPeriodDays = 7;
    const trialEndDate = new Date(user.createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + trialPeriodDays);

    if (new Date() <= trialEndDate) {
      req.accessType = 'trial';
      req.trialEndsAt = trialEndDate;
      return next();
    }

    // Trial expired and not paid
    return res.status(403).json({
      error: 'Trial period expired. Please subscribe to continue using this feature.',
      requiresPayment: true,
      trialExpired: true,
      trialEndDate: trialEndDate,
    });
  } catch (error) {
    console.error('Trial access check error:', error);
    res.status(500).json({ error: 'Error checking trial access' });
  }
};

module.exports = {
  requirePaidCustomer,
  checkSubscriptionStatus,
  checkTrialAccess,
};
