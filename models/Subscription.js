const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan',
        required: true
    },
    billingCycle: {
        type: String,
        required: true,
        enum: ['monthly', 'quarterly', 'yearly', 'custom']
    },
    status: {
        type: String,
        required: true,
        enum: ['active', 'inactive', 'cancelled', 'expired', 'pending'],
        default: 'pending'
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    nextBillingDate: {
        type: Date,
        required: true
    },
    autoRenew: {
        type: Boolean,
        default: true
    },
    paymentMethod: {
        type: String,
        enum: ['credit_card', 'bank_transfer', 'paypal', 'razorpay'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    totalAmount: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USD'
    },
    externalSubscriptionId: {
        type: String // For third-party payment providers like Razorpay
    },
    externalCustomerId: {
        type: String // For third-party payment providers
    },
    notes: {
        type: String
    },
    cancelledAt: {
        type: Date
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancellationReason: {
        type: String
    }
}, {
    timestamps: true
});

// Index for efficient queries
SubscriptionSchema.index({ user: 1, status: 1 });
SubscriptionSchema.index({ status: 1, nextBillingDate: 1 });
SubscriptionSchema.index({ externalSubscriptionId: 1 });

// Virtual for checking if subscription is active
SubscriptionSchema.virtual('isActive').get(function () {
    return this.status === 'active' && new Date() <= this.endDate;
});

// Virtual for checking if subscription is expired
SubscriptionSchema.virtual('isExpired').get(function () {
    return new Date() > this.endDate;
});

SubscriptionSchema.set('toJSON', { virtuals: true });
SubscriptionSchema.set('toObject', { virtuals: true });

// Method to calculate next billing date
SubscriptionSchema.methods.calculateNextBillingDate = function () {
    const currentDate = new Date();
    let nextDate = new Date(currentDate);

    switch (this.billingCycle) {
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        default:
            // For custom billing cycles, you might want to store the interval in days
            break;
    }

    return nextDate;
};

// Pre-save middleware to set end date if not provided
SubscriptionSchema.pre('save', function (next) {
    if (!this.endDate) {
        this.endDate = this.calculateNextBillingDate();
    }
    if (!this.nextBillingDate) {
        this.nextBillingDate = this.calculateNextBillingDate();
    }
    next();
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);
