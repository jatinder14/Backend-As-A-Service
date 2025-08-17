const mongoose = require('mongoose');

const seoTagSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true }, // page identifier like "home", "about", "blog-detail"
    meta_title: { type: String },
    meta_keywords: { type: String },
    meta_description: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SeoTag', seoTagSchema);
