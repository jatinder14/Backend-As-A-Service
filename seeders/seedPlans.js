const Plan = require('../models/Plan');
const logger = require('../utils/logger/winstonLogger');

const defaultPlans = [
  {
    name: 'Basic Plan',
    slug: 'basic-plan',
    description: 'Essential features for small businesses and startups',
    monthlyPrice: 29.99,
    quarterlyPrice: 79.99, // ~11% discount
    yearlyPrice: 299.99, // ~17% discount
    currency: 'USD',
    features: [
      'Up to 10 Properties',
      'Basic Analytics',
      'Email Support',
      'Standard Templates',
      'Mobile App Access'
    ],
    status: 'active',
    isPopular: false,
  },
  {
    name: 'Premium Plan',
    slug: 'premium-plan',
    description: 'Advanced features for growing businesses',
    monthlyPrice: 79.99,
    quarterlyPrice: 219.99, // ~8% discount
    yearlyPrice: 799.99, // ~17% discount
    currency: 'USD',
    features: [
      'Up to 50 Properties',
      'Advanced Analytics',
      'Priority Support',
      'Custom Templates',
      'API Access',
      'Advanced Reporting',
      'Bulk Operations',
      'Advanced Search'
    ],
    status: 'active',
    isPopular: true,
  },
  {
    name: 'Enterprise Plan',
    slug: 'enterprise-plan',
    description: 'Full-featured solution for large organizations',
    monthlyPrice: 199.99,
    quarterlyPrice: 549.99, // ~8% discount
    yearlyPrice: 1999.99, // ~17% discount
    currency: 'USD',
    features: [
      'Unlimited Properties',
      'Enterprise Analytics',
      '24/7 Support',
      'Custom Development',
      'Advanced API Access',
      'White Label',
      'Dedicated Account Manager',
      'Advanced Security',
      'Custom Integrations',
      'Advanced Workflows'
    ],
    status: 'active',
    isPopular: false,
  },
];

const seedPlans = async () => {
  try {
    logger.info('Starting plan seeding...');

    // Check if plans already exist
    const existingPlans = await Plan.countDocuments();
    if (existingPlans > 0) {
      logger.info(`Plans already exist (${existingPlans} found). Skipping seeding.`);
      return;
    }

    // Create plans
    const createdPlans = await Plan.insertMany(defaultPlans);

    logger.info(`Successfully seeded ${createdPlans.length} plans:`);
    createdPlans.forEach(plan => {
      logger.info(`- ${plan.name} (${plan.slug})`);
    });

    return createdPlans;
  } catch (error) {
    logger.error('Error seeding plans:', error);
    throw error;
  }
};

const clearPlans = async () => {
  try {
    logger.info('Clearing all plans...');
    await Plan.deleteMany({});
    logger.info('All plans cleared successfully');
  } catch (error) {
    logger.error('Error clearing plans:', error);
    throw error;
  }
};

module.exports = {
  seedPlans,
  clearPlans,
  defaultPlans,
};
