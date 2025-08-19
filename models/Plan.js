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
    // Monthly price
    monthlyPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // Quarterly price (optional)
    quarterlyPrice: {
      type: Number,
      min: 0,
    },
    // Yearly price (optional)
    yearlyPrice: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    features: [String], // Simple array of feature names
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Method to get price for a specific billing cycle
PlanSchema.methods.getPriceForCycle = function (billingCycle) {
  switch (billingCycle) {
    case 'monthly':
      return this.monthlyPrice;
    case 'quarterly':
      return this.quarterlyPrice || this.monthlyPrice * 3;
    case 'yearly':
      return this.yearlyPrice || this.monthlyPrice * 12;
    default:
      return this.monthlyPrice;
  }
};

// Static method to get active plans
PlanSchema.statics.getActivePlans = function () {
  return this.find({ status: 'active' });
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

module.exports = mongoose.model('Plan', PlanSchema);
