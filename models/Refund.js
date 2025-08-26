const mongoose = require('mongoose');

const RefundSchema = mongoose.Schema(
  {
    refundId: {
      type: String,
      required: true,
    },
    // Direct reference to user for better data integrity
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Transaction reference
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
    },
    // Razorpay payment ID
    razorpayPaymentId: {
      type: String,
      required: true,
    },
    // Refund amount (store as number for calculations)
    amount: {
      type: Number,
      required: true,
      min: [0, 'Refund amount cannot be negative'],
    },
    // Legacy field for backward compatibility
    refundedAmount: {
      type: String,
    },
    // Refund status
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
    },
    // Legacy status field for backward compatibility
    isRefunded: {
      type: String,
      default: 'pending',
      enum: ['pending', 'completed', 'failed', 'cancelled'],
    },
    // Refund reason
    reason: {
      type: String,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    // Processing information
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
    // Razorpay created timestamp
    created_at: {
      type: String,
      default: () => new Date().toISOString(),
    },
    // Legacy fields for backward compatibility
    orderId: { type: String, ref: 'Order' },
    itemId: { type: String },
    itemQty: { type: String },
    // Store additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // This adds createdAt and updatedAt automatically
  }
);

// Optimized indexes for better query performance
RefundSchema.index({ refundId: 1 }, { unique: true }); // Unique index for refundId
RefundSchema.index({ userId: 1, createdAt: -1 }); // Primary compound index for user queries
RefundSchema.index({ userId: 1, status: 1 }); // Compound index for filtered user queries
RefundSchema.index({ transactionId: 1 }); // For transaction-based lookups
RefundSchema.index({ razorpayPaymentId: 1 }); // For Razorpay webhook processing
RefundSchema.index({ status: 1, createdAt: -1 }); // For admin status filtering
RefundSchema.index({ createdAt: -1 }); // For general time-based queries

// Virtual to populate user details
RefundSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Virtual to populate transaction details
RefundSchema.virtual('transaction', {
  ref: 'Transaction',
  localField: 'transactionId',
  foreignField: '_id',
  justOne: true,
});

// Ensure virtual fields are serialized
RefundSchema.set('toJSON', { virtuals: true });
RefundSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Refund', RefundSchema);
