const mongoose = require('mongoose');

// Daily Attendance Schema
const DailyAttendanceSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    checkInTimes: [{ type: Date, required: true }], // Array to handle multiple check-ins
    checkOutTimes: [{ type: Date, required: true }],
    totalOfficeInTime: { type: Number, default: 0 } // Total time spent in office (in minutes)
}, { timestamps: true });

const DailyAttendance = mongoose.model('DailyAttendance', DailyAttendanceSchema);
module.exports = DailyAttendance;
