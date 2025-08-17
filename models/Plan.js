const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    shortDescription: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    billingCycles: [
      {
        cycle: {
          type: String,
          enum: ['monthly', 'quarterly', 'yearly'],
          required: true,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        discount: {
          type: Number,
          default: 0,
          min: 0,
        },
        isPopular: {
          type: Boolean,
          default: false,
        },
      },
    ],
    features: [
      {
        name: { type: String, required: true },
        description: { type: String },
        icon: { type: String },
        isHighlighted: { type: Boolean, default: false },
      },
    ],
    limits: {
      properties: {
        type: Number,
        default: 0,
        min: 0, // -1 for unlimited
      },
      users: {
        type: Number,
        default: 0,
        min: 0, // -1 for unlimited
      },
      storage: {
        type: Number,
        default: 0, // in MB, -1 for unlimited
        min: 0,
      },
      apiCalls: {
        type: Number,
        default: 0, // -1 for unlimited
        min: 0,
      },
      customDomains: {
        type: Number,
        default: 0,
        min: 0,
      },
      integrations: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    addons: [
      {
        name: { type: String, required: true },
        description: { type: String },
        price: { type: Number, required: true },
        billingCycle: {
          type: String,
          enum: ['monthly', 'quarterly', 'yearly', 'one_time'],
          default: 'monthly',
        },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive', 'deprecated'],
      default: 'active',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isCustom: {
      type: Boolean,
      default: false,
    },
    trialDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    setupFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    cancellationPolicy: {
      type: String,
      enum: ['immediate', 'end_of_billing_period', 'custom'],
      default: 'end_of_billing_period',
    },
    customCancellationDays: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
PlanSchema.index({ status: 1, sortOrder: 1 });
PlanSchema.index({ 'billingCycles.cycle': 1 });

// Virtual for getting the most popular billing cycle
PlanSchema.virtual('popularBillingCycle').get(function () {
  const popular = this.billingCycles.find(cycle => cycle.isPopular);
  return popular || this.billingCycles[0];
});

// Virtual for checking if plan is unlimited
PlanSchema.virtual('isUnlimited').get(function () {
  return this.limits.properties === -1 && this.limits.users === -1;
});

// Method to get price for a specific billing cycle
PlanSchema.methods.getPriceForCycle = function (billingCycle) {
  const cycle = this.billingCycles.find(c => c.cycle === billingCycle);
  return cycle ? cycle.price : this.price;
};

// Method to get discounted price for a specific billing cycle
PlanSchema.methods.getDiscountedPriceForCycle = function (billingCycle) {
  const cycle = this.billingCycles.find(c => c.cycle === billingCycle);
  if (!cycle) return this.price;

  return cycle.price - cycle.price * (cycle.discount / 100);
};

// Method to check if user has access to a feature
PlanSchema.methods.hasFeature = function (featureName) {
  return this.features.some(feature => feature.name.toLowerCase() === featureName.toLowerCase());
};

// Method to get feature by name
PlanSchema.methods.getFeature = function (featureName) {
  return this.features.find(feature => feature.name.toLowerCase() === featureName.toLowerCase());
};

// Static method to get active plans
PlanSchema.statics.getActivePlans = function () {
  return this.find({ status: 'active' }).sort({ sortOrder: 1 });
};

// Static method to get plan by slug
PlanSchema.statics.getBySlug = function (slug) {
  return this.findOne({ slug, status: 'active' });
};

// Pre-save middleware to generate slug if not provided
PlanSchema.pre('save', function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Set virtuals to be included in JSON output
PlanSchema.set('toJSON', { virtuals: true });
PlanSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Plan', PlanSchema);
