const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    transactionId: { type: String, required: true, unique: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    amount: { 
        type: Number, 
        required: true, 
        min: [0, 'Amount must be greater than zero'] 
    },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
    method: { type: String, enum: ['Credit Card', 'Bank Transfer', 'Cash'], required: true }
});

module.exports = mongoose.model('Payment', paymentSchema);
