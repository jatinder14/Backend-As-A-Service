const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    month: { type: String, required: true }, // e.g., 'October'
    year: { type: Number, required: true },
    totalDays: { type: Number, required: true },
    sickDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
