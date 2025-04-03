// MVL
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: { type: String },
    category: { type: String, enum: ['Firestopping Products', 'Fire Resistant Coatings', 'Fire-resistive Joint Products', 'MEP Penetrations Firestop Products', 'Fire Proof Coatings', 'General Purpose Sealant'], required: true },
    description: { type: String },
    keyTechnicalData: { type: String },
    featuresApplications: { type: String },
    // featuresApplications: [
    //     {
    //         key: { type: String },
    //         value: { type: String },
    //         _id: falses
    //     }
    // ],
    featuresImages: [
        { type: String }
    ],          //  This is simple a key not an image 

    logo: { type: String },
    images: [{ type: String }],

}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);