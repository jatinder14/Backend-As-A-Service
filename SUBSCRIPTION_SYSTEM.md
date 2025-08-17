# Subscription System Documentation

## Overview

This document describes the subscription system that has been integrated into the Backend-As-A-Service application. The system includes subscription management, order processing, payment handling, and automated billing cycles.

## Models

### 1. Subscription Model (`models/Subscription.js`)

The Subscription model manages user subscriptions with the following key features:

- **Plan Management**: Supports multiple subscription plans (Basic, Premium, Enterprise)
- **Billing Cycles**: Monthly, quarterly, yearly, and custom cycles
- **Status Tracking**: Active, inactive, cancelled, expired, pending
- **Payment Integration**: Links to payment providers (Razorpay, PayPal, etc.)
- **Auto-renewal**: Configurable automatic renewal settings

#### Key Fields:
- `user`: Reference to User model
- `planName`: Subscription plan type
- `planDetails`: Plan information including features and limits
- `billingCycle`: Billing frequency
- `status`: Current subscription status
- `startDate`, `endDate`, `nextBillingDate`: Billing dates
- `paymentMethod`: Payment gateway used
- `totalAmount`, `discount`, `tax`, `finalAmount`: Financial details

### 2. Order Model (`models/Order.js`)

The Order model handles all order transactions:

- **Order Types**: Subscription, one-time, upgrade, downgrade, renewal
- **Item Management**: Support for multiple items per order
- **Status Tracking**: Pending, confirmed, processing, completed, cancelled, failed, refunded
- **Payment Status**: Pending, paid, failed, refunded, partially_refunded

#### Key Fields:
- `orderId`: Unique order identifier
- `user`: Reference to User model
- `subscription`: Reference to Subscription model (optional)
- `orderType`: Type of order
- `items`: Array of order items
- `subtotal`, `discount`, `tax`, `totalAmount`: Financial calculations
- `status`, `paymentStatus`: Order and payment status

### 3. Payment Model (`models/Payment.js`)

Enhanced Payment model for comprehensive payment tracking:

- **Payment Types**: Subscription, one-time, refund, partial_refund
- **Gateway Integration**: Support for multiple payment providers
- **Refund Handling**: Full and partial refund processing
- **Status Tracking**: Pending, processing, completed, failed, cancelled, refunded

#### Key Fields:
- `paymentId`: Unique payment identifier
- `user`: Reference to User model
- `order`: Reference to Order model (optional)
- `subscription`: Reference to Subscription model (optional)
- `amount`, `currency`: Payment amount and currency
- `paymentMethod`: Payment gateway used
- `paymentType`: Type of payment
- `status`: Payment status

### 4. User Model Updates

The User model has been enhanced with subscription-related fields:

- **Subscription Status**: Active, inactive, expired, cancelled
- **Current Subscription**: Reference to active subscription
- **Usage Tracking**: Properties created, API calls used, storage used
- **Customer Information**: Customer type, company name, billing address

## API Endpoints

### Subscription Routes (`/api/subscriptions`)

#### GET `/api/subscriptions`
- Get all subscriptions with pagination and filtering
- Query parameters: `page`, `limit`, `status`, `planName`, `userId`

#### GET `/api/subscriptions/:id`
- Get subscription by ID with populated user data

#### POST `/api/subscriptions`
- Create new subscription
- Required fields: `userId`, `planName`, `planDetails`, `billingCycle`, `paymentMethod`, `totalAmount`

#### PUT `/api/subscriptions/:id`
- Update subscription details
- Allowed fields: `planDetails`, `billingCycle`, `autoRenew`, `notes`, `paymentMethod`, `status`, `nextBillingDate`

#### PATCH `/api/subscriptions/:id/cancel`
- Cancel subscription
- Required fields: `reason`

#### PATCH `/api/subscriptions/:id/renew`
- Renew subscription

#### GET `/api/subscriptions/stats/overview`
- Get subscription statistics and analytics

#### GET `/api/subscriptions/user/:userId/history`
- Get user's subscription history

#### GET `/api/subscriptions/upcoming/renewals`
- Get upcoming renewals
- Query parameters: `days` (default: 30)

### Order Routes (`/api/orders`)

#### GET `/api/orders`
- Get all orders with pagination and filtering
- Query parameters: `page`, `limit`, `status`, `orderType`, `userId`, `paymentStatus`

#### GET `/api/orders/:id`
- Get order by ID with populated data

#### POST `/api/orders`
- Create new order
- Required fields: `userId`, `orderType`, `items`, `paymentMethod`

#### PUT `/api/orders/:id`
- Update order details
- Allowed fields: `status`, `paymentStatus`, `notes`, `expectedDeliveryDate`, `actualDeliveryDate`, `billingAddress`, `shippingAddress`

#### PATCH `/api/orders/:id/cancel`
- Cancel order
- Required fields: `reason`

#### POST `/api/orders/:id/process-payment`
- Process payment for order
- Required fields: `paymentMethod`, `externalPaymentId`, `gatewayResponse`

#### POST `/api/orders/:id/refund`
- Process refund for order
- Required fields: `refundAmount`, `reason`

#### GET `/api/orders/stats/overview`
- Get order statistics and analytics

#### GET `/api/orders/user/:userId/history`
- Get user's order history

#### GET `/api/orders/subscription/:subscriptionId`
- Get orders by subscription

### Payment Routes (`/api/payments`)

#### GET `/api/payments`
- Get all payments with pagination and filtering
- Query parameters: `page`, `limit`, `status`, `paymentType`, `userId`, `paymentMethod`

#### GET `/api/payments/:id`
- Get payment by ID with populated data

#### POST `/api/payments`
- Create new payment
- Required fields: `userId`, `amount`, `paymentMethod`

#### PUT `/api/payments/:id`
- Update payment details
- Allowed fields: `status`, `gatewayResponse`, `failureReason`, `notes`, `processedAt`

#### POST `/api/payments/:id/refund`
- Process refund
- Required fields: `refundAmount`, `reason`

#### GET `/api/payments/stats/overview`
- Get payment statistics and analytics

#### GET `/api/payments/user/:userId/history`
- Get user's payment history

## Subscription Plans

### Basic Plan ($29.99/month)
- Up to 10 properties
- Basic analytics
- Email support
- Standard templates
- 2 users
- 100 MB storage
- 1,000 API calls

### Premium Plan ($79.99/month)
- Up to 50 properties
- Advanced analytics
- Priority support
- Custom templates
- API access
- Advanced reporting
- 10 users
- 500 MB storage
- 5,000 API calls

### Enterprise Plan ($199.99/month)
- Unlimited properties
- Enterprise analytics
- 24/7 support
- Custom development
- Advanced API access
- White-label options
- Dedicated account manager
- Unlimited users
- 5,000 MB storage
- 50,000 API calls

## Automated Processes

### Cron Jobs (`cron-jobs/subscriptionManagement.js`)

The system includes automated processes for subscription management:

1. **Expired Subscriptions Check** (Daily at 2 AM)
   - Identifies and marks expired subscriptions
   - Updates user subscription status

2. **Upcoming Renewals Processing** (Daily at 6 AM)
   - Creates renewal orders for subscriptions due for renewal
   - Updates next billing dates

3. **Renewal Reminders** (Daily at 10 AM)
   - Sends renewal reminders to users
   - Configurable reminder timing

4. **Monthly Reports** (1st of each month at 8 AM)
   - Generates subscription statistics
   - Calculates churn rates and revenue metrics

## Usage Examples

### Creating a Subscription

```javascript
const SubscriptionService = require('./services/subscriptionService');

// Create a basic monthly subscription
const subscription = await SubscriptionService.createSubscription(
    userId,
    'basic',
    'monthly',
    'razorpay',
    {
        autoRenew: true,
        notes: 'New customer subscription'
    }
);
```

### Checking User Access

```javascript
// Check if user can create a new property
const accessCheck = await SubscriptionService.checkUserAccess(
    userId,
    'properties',
    1
);

if (accessCheck.hasAccess) {
    // Allow property creation
    await createProperty();
    await SubscriptionService.updateUsageStats(userId, 'propertiesCreated', 1);
} else {
    // Handle access denied
    console.log('Access denied:', accessCheck.reason);
}
```

### Processing Payment

```javascript
// Process payment for an order
const payment = await Payment.create({
    user: order.user,
    order: order._id,
    subscription: order.subscription,
    amount: order.totalAmount,
    currency: order.currency,
    paymentMethod: 'razorpay',
    paymentType: 'subscription',
    externalPaymentId: 'razorpay_payment_id',
    status: 'completed',
    processedAt: new Date()
});
```

## Integration with Existing Systems

### Payment Gateway Integration

The system supports multiple payment gateways:
- Razorpay (already integrated)
- PayPal
- Stripe
- Bank transfers
- Cash payments

### User Management

The subscription system integrates with the existing user management:
- Users can have different roles (admin, customer, etc.)
- Subscription status affects user permissions
- Usage tracking is tied to user accounts

### Property Management

Subscription limits affect property creation:
- Basic plan: Up to 10 properties
- Premium plan: Up to 50 properties
- Enterprise plan: Unlimited properties

## Security and Authentication

All subscription, order, and payment endpoints require authentication:
- JWT token validation
- Role-based access control
- User ownership validation
- Audit trails for all changes

## Monitoring and Analytics

The system provides comprehensive analytics:
- Subscription metrics (MRR, churn rate, etc.)
- Revenue tracking
- Usage statistics
- Payment success rates
- Plan distribution

## Error Handling

The system includes robust error handling:
- Validation for all inputs
- Graceful handling of payment failures
- Retry mechanisms for failed operations
- Comprehensive logging

## Future Enhancements

Potential future improvements:
- Webhook support for real-time updates
- Advanced analytics dashboard
- Multi-currency support
- Subscription add-ons and customizations
- Advanced billing features (proration, discounts, etc.)
- Integration with more payment gateways

