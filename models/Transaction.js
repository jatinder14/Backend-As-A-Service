const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const TransactionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      default: () => uuidv4(),
    },
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
    status: {
      type: String,
    },
    orderId: {
      type: String,
    },
    humanReadableID: {
      type: String,
    },
    depositDate: {
      type: Number,
    },
  },
  {
    strict: true,
    collation: { locale: 'en_US', strength: 1 },
  }
);

module.exports = mongoose.model('Transaction', TransactionSchema);
