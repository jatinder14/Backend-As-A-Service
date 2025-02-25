const mongoose = require('mongoose');

// Daily Attendance Schema
const LeaveSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedReason: { type: String }, remark: { type: String },
    type: {
        type: String,
        enum: ['Sick', 'Annual'],
        default: 'Annual'
    },
    year: { type: Number, default: new Date().getFullYear() },

    // Leave Balance
    sickLeaveRemaining: { type: Number, default: 7 },  // Default 7 Sick Leaves per year
    annualLeaveRemaining: { type: Number, default: 30 }, // Default 30 Annual Leaves per year

    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }
}, { timestamps: true });

const Leave = mongoose.model('Leave', LeaveSchema);
module.exports = Leave;


// Solve the following problem using lua with unit test:
// # PROBLEM DESCRIPTION START

// Using the tieske date library in Lua, demonstrate how the setcenturyflip function affects the interpretation of two-digit years.

// 1. Show how setcenturyflip(0), setcenturyflip(50), and setcenturyflip(100) impact date parsing.

// # PROBLEM DESCRIPTION END

// Complete the following snippet which solve the above problem:
// ```lua
// local function demo_centuryflip(century_flip)
//   #TODO: Implement logic
// end
