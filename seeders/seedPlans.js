const Plan = require('../models/Plan');
const logger = require('../utils/logger/winstonLogger');

const defaultPlans = [
    {
        name: 'Basic Plan',
        slug: 'basic-plan',
        description: 'Essential features for small businesses and startups',
        shortDescription: 'Perfect for small businesses',
        price: 29.99,
        currency: 'USD',
        billingCycles: [
            {
                cycle: 'monthly',
                price: 29.99,
                discount: 0,
                isPopular: false
            },
            {
                cycle: 'quarterly',
                price: 79.99,
                discount: 11, // ~11% discount
                isPopular: false
            },
            {
                cycle: 'yearly',
                price: 299.99,
                discount: 17, // ~17% discount
                isPopular: true
            }
        ],
        features: [
            {
                name: 'Up to 10 Properties',
                description: 'List and manage up to 10 properties',
                icon: '🏠',
                isHighlighted: true
            },
            {
                name: 'Basic Analytics',
                description: 'View basic property performance metrics',
                icon: '📊',
                isHighlighted: false
            },
            {
                name: 'Email Support',
                description: 'Get help via email within 24 hours',
                icon: '📧',
                isHighlighted: false
            },
            {
                name: 'Standard Templates',
                description: 'Access to standard property listing templates',
                icon: '📝',
                isHighlighted: false
            },
            {
                name: 'Mobile App Access',
                description: 'Access your properties on mobile devices',
                icon: '📱',
                isHighlighted: false
            }
        ],
        limits: {
            properties: 10,
            users: 2,
            storage: 100, // MB
            apiCalls: 1000,
            customDomains: 0,
            integrations: 2
        },
        addons: [
            {
                name: 'Additional Properties',
                description: 'Add 5 more properties to your plan',
                price: 9.99,
                billingCycle: 'monthly'
            },
            {
                name: 'Priority Support',
                description: 'Get priority email and chat support',
                price: 19.99,
                billingCycle: 'monthly'
            }
        ],
        trialDays: 14,
        setupFee: 0,
        cancellationPolicy: 'end_of_billing_period',
        sortOrder: 1
    },
    {
        name: 'Premium Plan',
        slug: 'premium-plan',
        description: 'Advanced features for growing businesses',
        shortDescription: 'Ideal for growing businesses',
        price: 79.99,
        currency: 'USD',
        billingCycles: [
            {
                cycle: 'monthly',
                price: 79.99,
                discount: 0,
                isPopular: false
            },
            {
                cycle: 'quarterly',
                price: 219.99,
                discount: 8, // ~8% discount
                isPopular: false
            },
            {
                cycle: 'yearly',
                price: 799.99,
                discount: 17, // ~17% discount
                isPopular: true
            }
        ],
        features: [
            {
                name: 'Up to 50 Properties',
                description: 'List and manage up to 50 properties',
                icon: '🏢',
                isHighlighted: true
            },
            {
                name: 'Advanced Analytics',
                description: 'Comprehensive property and market analytics',
                icon: '📈',
                isHighlighted: true
            },
            {
                name: 'Priority Support',
                description: 'Get help via email and chat within 4 hours',
                icon: '🎯',
                isHighlighted: true
            },
            {
                name: 'Custom Templates',
                description: 'Create and customize property listing templates',
                icon: '🎨',
                isHighlighted: false
            },
            {
                name: 'API Access',
                description: 'Full API access for integrations',
                icon: '🔌',
                isHighlighted: false
            },
            {
                name: 'Advanced Reporting',
                description: 'Generate detailed reports and insights',
                icon: '📋',
                isHighlighted: false
            },
            {
                name: 'Bulk Operations',
                description: 'Perform bulk operations on properties',
                icon: '⚡',
                isHighlighted: false
            },
            {
                name: 'Advanced Search',
                description: 'Advanced property search and filtering',
                icon: '🔍',
                isHighlighted: false
            }
        ],
        limits: {
            properties: 50,
            users: 10,
            storage: 500, // MB
            apiCalls: 5000,
            customDomains: 1,
            integrations: 10
        },
        addons: [
            {
                name: 'Additional Properties',
                description: 'Add 10 more properties to your plan',
                price: 19.99,
                billingCycle: 'monthly'
            },
            {
                name: 'White Label',
                description: 'Remove branding and customize the interface',
                price: 49.99,
                billingCycle: 'monthly'
            },
            {
                name: 'Advanced Integrations',
                description: 'Access to premium third-party integrations',
                price: 29.99,
                billingCycle: 'monthly'
            }
        ],
        trialDays: 30,
        setupFee: 0,
        cancellationPolicy: 'end_of_billing_period',
        sortOrder: 2
    },
    {
        name: 'Enterprise Plan',
        slug: 'enterprise-plan',
        description: 'Full-featured solution for large organizations',
        shortDescription: 'For large organizations',
        price: 199.99,
        currency: 'USD',
        billingCycles: [
            {
                cycle: 'monthly',
                price: 199.99,
                discount: 0,
                isPopular: false
            },
            {
                cycle: 'quarterly',
                price: 549.99,
                discount: 8, // ~8% discount
                isPopular: false
            },
            {
                cycle: 'yearly',
                price: 1999.99,
                discount: 17, // ~17% discount
                isPopular: true
            }
        ],
        features: [
            {
                name: 'Unlimited Properties',
                description: 'List and manage unlimited properties',
                icon: '🌍',
                isHighlighted: true
            },
            {
                name: 'Enterprise Analytics',
                description: 'Advanced analytics with custom dashboards',
                icon: '📊',
                isHighlighted: true
            },
            {
                name: '24/7 Support',
                description: 'Round-the-clock phone, email, and chat support',
                icon: '🆘',
                isHighlighted: true
            },
            {
                name: 'Custom Development',
                description: 'Custom feature development and integrations',
                icon: '⚙️',
                isHighlighted: true
            },
            {
                name: 'Advanced API Access',
                description: 'Unlimited API access with custom endpoints',
                icon: '🔧',
                isHighlighted: false
            },
            {
                name: 'White Label',
                description: 'Complete white-label solution',
                icon: '🏷️',
                isHighlighted: false
            },
            {
                name: 'Dedicated Account Manager',
                description: 'Personal account manager for your business',
                icon: '👤',
                isHighlighted: false
            },
            {
                name: 'Advanced Security',
                description: 'Enhanced security features and compliance',
                icon: '🔒',
                isHighlighted: false
            },
            {
                name: 'Custom Integrations',
                description: 'Custom integrations with your existing systems',
                icon: '🔗',
                isHighlighted: false
            },
            {
                name: 'Advanced Workflows',
                description: 'Custom workflows and automation',
                icon: '🔄',
                isHighlighted: false
            }
        ],
        limits: {
            properties: -1, // Unlimited
            users: -1, // Unlimited
            storage: 5000, // MB
            apiCalls: 50000,
            customDomains: 5,
            integrations: -1 // Unlimited
        },
        addons: [
            {
                name: 'Custom Development',
                description: 'Custom feature development',
                price: 150.00,
                billingCycle: 'one_time'
            },
            {
                name: 'On-site Training',
                description: 'On-site training for your team',
                price: 500.00,
                billingCycle: 'one_time'
            },
            {
                name: 'Data Migration',
                description: 'Migrate data from existing systems',
                price: 300.00,
                billingCycle: 'one_time'
            }
        ],
        trialDays: 60,
        setupFee: 99.99,
        cancellationPolicy: 'custom',
        customCancellationDays: 30,
        sortOrder: 3
    }
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
    defaultPlans
};




