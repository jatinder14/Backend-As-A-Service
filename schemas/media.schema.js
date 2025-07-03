const mongoose = require('mongoose');
const metaDataSchema = require('./metaData.schema');

const mediaSchema = new mongoose.Schema({
    url: { type: String },
    metaData: metaDataSchema,
    altTitle: { type: String },
}, { _id: false });

module.exports = mediaSchema;
