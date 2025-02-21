const mongoose = require('mongoose');

// Daily Attendance Schema
const LeaveSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String },
    remark: { type: String },
    type: {
        type: String,
        enum: ['Sick', 'Annual'],
        default: 'Annual'
    },
}, { timestamps: true });

const Leave = mongoose.model('Leave', LeaveSchema);
module.exports = Leave;
