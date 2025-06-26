const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    message: { type: String },
    price: { type: String },
    status: { type: String },
    propertyId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // status: { type: String, enum: ['Active', 'Inprogress', 'Rejected'], default: 'Active' }

},
    { timestamps: true }
);

module.exports = mongoose.model('Enquiry', enquirySchema);
