const mongoose = require('mongoose');
const metaDataSchema = require('./metaData.schema');

const mediaSchema = new mongoose.Schema({
    url: { type: String },
    metaData: metaDataSchema
}, { _id: false });

module.exports = mediaSchema;
