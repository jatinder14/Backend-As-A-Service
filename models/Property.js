const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    propertyId: { type: String, required: true, unique: true },
    propertyName: { type: String, required: true },
    location: { type: String, required: true },
    type: { type: String },
    availability: { type: Boolean, default: true },
    pricing: { type: Number, required: true },
    features: { type: [String] },
    maintenanceHistory: [{ type: String }],
    propertyOwner: { type: String, required: true },
    status: { type: String, enum: ['Furnished', 'Semi-Furnished', 'Unfurnished'] },
    paymentDue: { type: String }, // DU/DEWA details
    ejariExpiryDate: { type: Date },
    paymentDueDate: { type: Date },
    addendum: { type: String }, 
    bankAccount: { type: String },
    chequeCopies: [{ type: String }]
});

module.exports = mongoose.model('Property', propertySchema);
