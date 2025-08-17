const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      default: () => `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    orderType: {
      type: String,
      required: true,
      enum: ['subscription', 'one_time', 'upgrade', 'downgrade', 'renewal'],
    },
    items: [
      {
        name: { type: String, required: true },
        description: { type: String },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
        type: { type: String, enum: ['subscription_plan', 'addon', 'service'] },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'confirmed', 'processing', 'completed', 'cancelled', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'bank_transfer', 'paypal', 'razorpay', 'cash'],
      required: true,
    },
    billingAddress: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      zipCode: { type: String },
    },
    shippingAddress: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      zipCode: { type: String },
    },
    notes: {
      type: String,
    },
    externalOrderId: {
      type: String, // For third-party payment providers
    },
    externalPaymentId: {
      type: String, // For third-party payment providers
    },
    invoiceNumber: {
      type: String,
    },
    invoiceUrl: {
      type: String,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundReason: {
      type: String,
    },
    refundedAt: {
      type: Date,
    },
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancellationReason: {
      type: String,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    actualDeliveryDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
OrderSchema.index({ user: 1, status: 1 });
OrderSchema.index({ status: 1, createdAt: 1 });
OrderSchema.index({ externalOrderId: 1 });
OrderSchema.index({ subscription: 1 });

// Virtual for order summary
OrderSchema.virtual('orderSummary').get(function () {
  return {
    orderId: this.orderId,
    totalItems: this.items.length,
    totalAmount: this.totalAmount,
    status: this.status,
    paymentStatus: this.paymentStatus,
  };
});

// Method to calculate total
OrderSchema.methods.calculateTotal = function () {
  const subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const total = subtotal - this.discount + this.tax;
  return {
    subtotal,
    total,
  };
};

// Pre-save middleware to calculate totals
OrderSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    const { subtotal, total } = this.calculateTotal();
    this.subtotal = subtotal;
    this.totalAmount = total;
  }
  next();
});

// Static method to generate order ID
OrderSchema.statics.generateOrderId = function () {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

module.exports = mongoose.model('Order', OrderSchema);
