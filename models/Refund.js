const mongoose = require('mongoose');

const RefundSchema = mongoose.Schema(
  {
    refundId: {
      type: String,
      required: true,
      unique: true,
    },
    orderId: { type: String, ref: 'Order' },
    refundedAmount: {
      type: String,
      required: true,
    },
    itemId: { type: String },
    itemQty: { type: String },
    isRefunded: {
      type: String,
      default: 'pending',
      enum: ['pending', 'completed', 'failed', 'cancelled'],
    },
    transationId: {
      type: String,
      ref: 'Transaction',
    },
    razorpayPaymentId: {
      type: String,
      required: true,
    },
    created_at: {
      type: String,
      default: () => new Date().toISOString(),
    },
    // Additional fields for better tracking
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
    },
    reason: { type: String },
    processedBy: { type: String },
    processedAt: { type: Date },
    // Store additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true, // This adds createdAt and updatedAt automatically
  }
);

// Indexes for better query performance
RefundSchema.index({ createdAt: -1 });
RefundSchema.index({ refundId: 1 });
RefundSchema.index({ razorpayPaymentId: 1 });
RefundSchema.index({ transationId: 1 });
RefundSchema.index({ status: 1 });

module.exports = mongoose.model('Refund', RefundSchema);
