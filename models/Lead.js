const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    propertyLocation: { type: String, required: true },
    apartmentType: { type: String, enum: ['Furnished', 'Semi-Furnished', 'Unfurnished'], required: true },
    recommendation: { type: String },
    buildingInfrastructure: { type: String, enum: ['1 BHK', '2 BHK', '3 BHK', 'Studio'], required: true },
    agreement: { type: String },
    price: { type: Number, required: true },
    numberOfCheques: { type: Number },
    securityDeposit: { type: Boolean, default: false },
    modeOfPayment: {
        type: String,
        enum: ['Cheque', 'Cash', 'Bank Transfer'],
        required: true
    },
    leadName: { type: String },
    status: {
        type: String,
        enum: ['New', 'Contacted', 'Converted', 'Lost'], // List of possible statuses
        default: 'New', // Default status
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Lead', LeadSchema);
