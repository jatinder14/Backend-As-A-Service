// models/PageLayout.ts (for Mongoose)
const mongoose = require('mongoose');

const PageLayoutSchema = new mongoose.Schema({
  name: { type: String, required: true },
  layoutJson: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });

module.exports = mongoose.model('PageLayout', PageLayoutSchema);
