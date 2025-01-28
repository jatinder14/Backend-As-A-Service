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
        enum: ['Pending', 'OM-Approval', 'Accepted', 'Rejected', 'Contacted', 'Converted', 'Lost'], // List of possible statuses
        default: 'Pending', // Default status
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
    //pending to approve by  
    // pending by OM
    //pending to approve by  
    // pending by CEO
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Lead', LeadSchema);
