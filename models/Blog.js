const mongoose = require('mongoose');

const metaDataSchema = new mongoose.Schema({
    title: { type: String },
    description: { type: String },
    keywords: { type: String }
},
    { _id: false } // Exclude the `_id` field from this sub-schema
);

const SubTitleAndContentSchema = new mongoose.Schema({
    title: { type: String },
    content: { type: String }
},
    { _id: false }
);

const blogSchema = new mongoose.Schema({
    title: [{ type: String }],
    domain: {
        type: String,
        enum: ['Gng', 'Myduomo'],
        default: 'Gng'
    },
    SubTitleAndContent: [SubTitleAndContentSchema],
    image: { type: String },
    video: { type: String },
    date: { type: String },
    shortDescription: { type: String },
    description: { type: String },
    metaData: [metaDataSchema]
}, { timestamps: true });

module.exports = mongoose.model('Blog', blogSchema);
