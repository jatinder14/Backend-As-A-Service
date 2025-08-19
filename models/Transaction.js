const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
    },
    transactionId: {
      type: String,
    },
    paymentType: {
      type: String,
    },
    date: {
      type: Number,
    },
    humanReadableID: {
      type: String,
    },
    depositDate: {
      type: Number,
    },
    // Razorpay specific fields
    razorpayPaymentId: {
      type: String,
    },
    status: {
      type: String,
    },
    razorpayOrderId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    razorpayPaymentLink: {
      type: String,
    },
    razorpayPaymentLinkId: {
      type: String,
    },
    razorpayPaymentLinkReferenceId: {
      type: String,
    },
    razorpayPaymentLinkStatus: {
      type: String,
    },
    customerEmail: {
      type: String,
    },
    customerName: {
      type: String,
    },
    // Store additional plan and payment details
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    strict: true,
    collation: { locale: 'en_US', strength: 1 },
  }
);

module.exports = mongoose.model('Transaction', TransactionSchema);
