const mongoose = require('mongoose');

const RefundSchema = mongoose.Schema({
  refundId: { type: String },
  orderId: { type: String, ref: 'Order' },
  refundedAmount: { type: String },
  itemId: { type: String },
  itemQty: { type: String },
  isRefunded: { type: String, default: false },
  transationId: { type: String },
  razorpayPaymentId: { type: String },
  created_at: { type: String },
});

RefundSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Refund', RefundSchema);
