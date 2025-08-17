const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentId: { 
        type: String, 
        required: true, 
        unique: true,
        default: () => `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription'
    },
    bookingId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Booking' 
    },
    amount: { 
        type: Number, 
        required: true, 
        min: [0, 'Amount must be greater than zero'] 
    },
    currency: {
        type: String,
        default: 'USD'
    },
    paymentMethod: { 
        type: String, 
        enum: ['credit_card', 'bank_transfer', 'paypal', 'razorpay', 'cash'], 
        required: true 
    },
    paymentType: {
        type: String,
        enum: ['subscription', 'one_time', 'refund', 'partial_refund'],
        default: 'one_time'
    },
    status: { 
        type: String, 
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'], 
        default: 'pending' 
    },
    transactionId: { 
        type: String, 
        unique: true 
    },
    externalPaymentId: {
        type: String // For third-party payment providers
    },
    gatewayResponse: {
        type: mongoose.Schema.Types.Mixed // Store gateway response data
    },
    failureReason: {
        type: String
    },
    refundAmount: {
        type: Number,
        default: 0
    },
    refundReason: {
        type: String
    },
    refundedAt: {
        type: Date
    },
    refundedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    processedAt: {
        type: Date
    },
    notes: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
