const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emiratesId: { type: String },
    passportCopy: { type: String },
    labourCard: { type: String },
    visaCopy: { type: String }
});

module.exports = mongoose.model('Document', DocumentSchema);
