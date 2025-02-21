const mongoose = require('mongoose');

// Daily Attendance Schema
const AttendanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    checkInTimes: [{ type: Date, required: true }], // Array to handle multiple check-ins
    checkOutTimes: [{ type: Date, required: true }],
}, { timestamps: true });

const Attendance = mongoose.model('Attendance', AttendanceSchema);
module.exports = Attendance;
