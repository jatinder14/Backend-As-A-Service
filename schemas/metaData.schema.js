const mongoose = require('mongoose');

const metaDataSchema = new mongoose.Schema({
    title: { type: String },
    description: { type: String },
    keywords: { type: String }
}, { _id: false }); // _id false to prevent extra _id for subdocuments

module.exports = metaDataSchema;