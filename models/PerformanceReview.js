const mongoose = require('mongoose');

// Performance Review Schema
const PerformanceReviewSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewDate: { type: Date, required: true },
  score: { type: Number, required: true }, // Score out of 100
  feedback: { type: String },
  notes: { type: String },
});

module.exports = mongoose.model('PerformanceReview', PerformanceReviewSchema);
