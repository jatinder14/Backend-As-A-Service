const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    message: { type: String },
    price: { type: String },
    status: { type: String },
    propertyId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }]
    // status: { type: String, enum: ['Active', 'Inprogress', 'Rejected'], default: 'Active' }

});

module.exports = mongoose.model('Enquiry', enquirySchema);
