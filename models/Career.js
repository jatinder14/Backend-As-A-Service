const mongoose = require('mongoose');

const CareerSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String },
    phoneNumber: { type: String },
    resume: { type: String },
    position: { type: String },
    status: { type: String, enum: ['Active', 'Inprogress', 'Rejected'], default: 'Active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Career', CareerSchema);
