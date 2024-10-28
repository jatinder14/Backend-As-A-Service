const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emiratesId: { type: String },
    passportCopy: { type: String }, // Path to file
    labourCard: { type: String }, // Path to file
    visaCopy: { type: String } // Path to file
});

module.exports = mongoose.model('Document', DocumentSchema);
