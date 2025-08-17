# Modular Subscription System Documentation

## Overview

The subscription system has been refactored to be more modular and scalable. The key improvement is the separation of plans into their own table/model, making the system more flexible and maintainable.

## Architecture Changes

### Before (Monolithic)

- Plans were hardcoded in the SubscriptionService
- Plan details were embedded in each subscription
- Limited flexibility for plan management

### After (Modular)

- Separate `Plan` model with full CRUD operations
- Plans can be created, updated, and managed independently
- Subscription references plan and stores a snapshot
- More flexible and scalable architecture

## Models

### 1. Plan Model (`models/Plan.js`)

The Plan model is the core of the modular system:

#### Key Features:

- **Multiple Billing Cycles**: Each plan can have different pricing for monthly, quarterly, yearly
- **Flexible Features**: Rich feature definitions with icons and descriptions
- **Comprehensive Limits**: Properties, users, storage, API calls, custom domains, integrations
- **Add-ons**: Optional add-ons that can be purchased separately
- **Trial Support**: Configurable trial periods
- **Status Management**: Active, inactive, deprecated states

#### Key Fields:

```javascript
{
    name: String,                    // Plan name
    slug: String,                    // URL-friendly identifier
    description: String,             // Full description
    shortDescription: String,        // Brief description
    price: Number,                   // Base price
    currency: String,                // Currency (default: USD)
    billingCycles: [{               // Multiple billing options
        cycle: String,              // monthly/quarterly/yearly
        price: Number,              // Price for this cycle
        discount: Number,           // Discount percentage
        isPopular: Boolean          // Mark as popular option
    }],
    features: [{                    // Plan features
        name: String,
        description: String,
        icon: String,
        isHighlighted: Boolean
    }],
    limits: {                       // Resource limits
        properties: Number,         // -1 for unlimited
        users: Number,
        storage: Number,            // in MB
        apiCalls: Number,
        customDomains: Number,
        integrations: Number
    },
    addons: [{                      // Optional add-ons
        name: String,
        description: String,
        price: Number,
        billingCycle: String
    }],
    trialDays: Number,              // Trial period
    setupFee: Number,               // One-time setup fee
    cancellationPolicy: String,     // Cancellation rules
    status: String                  // active/inactive/deprecated
}
```

#### Methods:

- `getPriceForCycle(billingCycle)`: Get price for specific billing cycle
- `getDiscountedPriceForCycle(billingCycle)`: Get discounted price
- `hasFeature(featureName)`: Check if plan includes feature
- `getFeature(featureName)`: Get specific feature details

#### Static Methods:

- `getActivePlans()`: Get all active plans
- `getBySlug(slug)`: Get plan by slug

### 2. Updated Subscription Model (`models/Subscription.js`)

The Subscription model now references the Plan model:

#### Key Changes:

- `plan`: Reference to Plan model (instead of `planName`)
- `planSnapshot`: Snapshot of plan details at subscription time
- Removed hardcoded plan details

#### Plan Snapshot:

```javascript
planSnapshot: {
    name: String,                   // Plan name at subscription time
    description: String,            // Plan description
    price: Number,                  // Price at subscription time
    currency: String,               // Currency
    features: [String],             // Feature names
    limits: {                       // Limits at subscription time
        properties: Number,
        users: Number,
        storage: Number,
        apiCalls: Number,
        customDomains: Number,
        integrations: Number
    }
}
```

### 3. Order Model (`models/Order.js`)

Updated to work with the new plan system:

#### Key Changes:

- References to plan through subscription
- Enhanced item management for plan changes
- Support for add-on purchases

### 4. Payment Model (`models/Payment.js`)

Enhanced to support the modular system:

#### Key Features:

- Links to plans through subscriptions
- Support for add-on payments
- Enhanced refund handling

## API Endpoints

### Plan Management (`/api/plans`)

#### Public Endpoints:

- `GET /api/plans/active` - Get all active plans
- `GET /api/plans/:id` - Get plan by ID
- `GET /api/plans/slug/:slug` - Get plan by slug
- `POST /api/plans/compare` - Compare multiple plans

#### Admin Endpoints (require admin privileges):

- `GET /api/plans` - Get all plans with pagination
- `POST /api/plans` - Create new plan
- `PUT /api/plans/:id` - Update plan
- `DELETE /api/plans/:id` - Delete plan
- `POST /api/plans/:id/duplicate` - Duplicate plan
- `GET /api/plans/stats/overview` - Get plan statistics

### Updated Subscription Endpoints (`/api/subscriptions`)

#### Key Changes:

- `POST /api/subscriptions` now requires `planId` instead of `planName`
- Enhanced filtering by `planId`
- Better plan information in responses

### Order Management (`/api/orders`)

#### Enhanced Features:

- Support for plan change orders
- Add-on purchase orders
- Better integration with plan system

## Usage Examples

### Creating a Plan

```javascript
// Create a new plan
const plan = new Plan({
  name: 'Pro Plan',
  slug: 'pro-plan',
  description: 'Professional features for growing businesses',
  price: 99.99,
  currency: 'USD',
  billingCycles: [
    {
      cycle: 'monthly',
      price: 99.99,
      discount: 0,
      isPopular: false,
    },
    {
      cycle: 'yearly',
      price: 999.99,
      discount: 17,
      isPopular: true,
    },
  ],
  features: [
    {
      name: 'Unlimited Properties',
      description: 'No limit on property listings',
      icon: '🏠',
      isHighlighted: true,
    },
  ],
  limits: {
    properties: -1, // Unlimited
    users: 25,
    storage: 1000,
    apiCalls: 10000,
    customDomains: 3,
    integrations: 20,
  },
  trialDays: 30,
  setupFee: 0,
});

await plan.save();
```

### Creating a Subscription

```javascript
// Create subscription using plan ID
const subscription = await SubscriptionService.createSubscription(
  userId,
  planId, // Plan ID instead of plan name
  'monthly', // Billing cycle
  'razorpay', // Payment method
  {
    autoRenew: true,
    notes: 'New customer subscription',
  }
);
```

### Checking User Access

```javascript
// Check if user can create a new property
const accessCheck = await SubscriptionService.checkUserAccess(userId, 'properties', 1);

if (accessCheck.hasAccess) {
  // Allow property creation
  await createProperty();
  await SubscriptionService.updateUsageStats(userId, 'propertiesCreated', 1);
} else {
  console.log('Access denied:', accessCheck.reason);
}
```

### Managing Plans

```javascript
// Get all active plans
const activePlans = await Plan.getActivePlans();

// Get plan by slug
const plan = await Plan.getBySlug('pro-plan');

// Check if plan has specific feature
if (plan.hasFeature('API Access')) {
  // Enable API features
}

// Get price for specific billing cycle
const yearlyPrice = plan.getPriceForCycle('yearly');
const discountedPrice = plan.getDiscountedPriceForCycle('yearly');
```

## Database Seeding

### Default Plans

The system includes a seeder for default plans:

```javascript
const { seedPlans } = require('./seeders/seedPlans');

// Seed default plans
await seedPlans();
```

### Default Plan Structure:

1. **Basic Plan** ($29.99/month)
   - 10 properties, 2 users, 100MB storage
   - Basic analytics, email support
   - 14-day trial

2. **Premium Plan** ($79.99/month)
   - 50 properties, 10 users, 500MB storage
   - Advanced analytics, priority support
   - 30-day trial

3. **Enterprise Plan** ($199.99/month)
   - Unlimited properties and users
   - 5GB storage, 24/7 support
   - 60-day trial, setup fee

## Benefits of Modular Design

### 1. **Flexibility**

- Easy to add new plans without code changes
- Dynamic pricing and feature management
- Support for custom plans

### 2. **Scalability**

- Plans can be managed independently
- Better performance with proper indexing
- Support for complex billing scenarios

### 3. **Maintainability**

- Clear separation of concerns
- Easier to update plan features
- Better code organization

### 4. **Business Agility**

- Quick plan modifications
- A/B testing capabilities
- Seasonal pricing support

## Migration Guide

### From Old System to New System:

1. **Database Migration**:

   ```javascript
   // Create plans from existing subscriptions
   const existingSubscriptions = await Subscription.find({});

   for (const sub of existingSubscriptions) {
     // Create plan if it doesn't exist
     let plan = await Plan.findOne({ name: sub.planName });

     if (!plan) {
       plan = new Plan({
         name: sub.planName,
         // ... other plan details
       });
       await plan.save();
     }

     // Update subscription to reference plan
     sub.plan = plan._id;
     sub.planSnapshot = {
       name: sub.planDetails.name,
       // ... other snapshot details
     };
     await sub.save();
   }
   ```

2. **Code Updates**:
   - Update all references from `planName` to `planId`
   - Use `SubscriptionService.createSubscription()` with plan ID
   - Update frontend to use new plan endpoints

## Security Considerations

### Plan Management:

- Only admins can create/modify plans
- Plan changes don't affect existing subscriptions
- Audit trail for all plan modifications

### Subscription Security:

- Plan snapshots prevent unauthorized changes
- User access validation based on current plan
- Secure payment processing

## Monitoring and Analytics

### Plan Analytics:

- Plan popularity tracking
- Conversion rates by plan
- Revenue per plan

### Subscription Analytics:

- Plan distribution
- Upgrade/downgrade patterns
- Churn analysis by plan

## Future Enhancements

### Planned Features:

1. **Plan Templates**: Reusable plan templates
2. **Dynamic Pricing**: Real-time pricing adjustments
3. **Plan Bundles**: Package multiple plans together
4. **Usage-Based Billing**: Pay-per-use options
5. **Regional Pricing**: Location-based pricing
6. **Plan Versioning**: Track plan changes over time

### Integration Opportunities:

1. **Marketing Tools**: Plan comparison pages
2. **Analytics Platforms**: Advanced reporting
3. **CRM Integration**: Customer plan tracking
4. **Accounting Systems**: Automated billing

## Conclusion

The modular subscription system provides a robust, scalable foundation for managing subscriptions. The separation of plans into their own model makes the system more flexible and easier to maintain, while providing better business agility for plan management and pricing strategies.
