const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
    },
    propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true,
    },
    bookingDates: {
        checkIn: { type: Date, required: true },
        checkOut: { type: Date, required: true },
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Confirmed'],
        default: 'Pending',
    },
    confirmationDetails: { type: String },
});

module.exports = mongoose.model('Booking', bookingSchema);
