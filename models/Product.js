const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: { type: String },
    category: { type: String, enum: ["Fire-resistive Joint Products", "MEP Penetrations Firestop Products", "Fire Proof Coating Products", "General Purpose Sealants"], required: true },
    description: { type: String },
    keyTechnicalData: { type: String },
    featuresApplications: { type: String },
    tested: { type: String },
    featuresImages: [
        { type: String }
    ],          //  This is simple a key not an image 
    pdf: [{ type: String }],
    logo: [{ type: String }],
    images: [{ type: String }],

}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);