const mongoose = require('mongoose');
const { default: slugify } = require('slugify');
const metaDataSchema = require('../schemas/metaData.schema');

const SubTitleAndContentSchema = new mongoose.Schema(
  {
    title: { type: String },
    content: { type: String },
  },
  { _id: false }
);

const blogSchema = new mongoose.Schema(
  {
    title: { type: String },
    domain: {
      type: String,
    },
    SubTitleAndContent: [SubTitleAndContentSchema],
    slug: { type: String, unique: true, default: null },
    author: { type: String },
    image: { type: String },
    video: { type: String },
    date: { type: String },
    shortDescription: { type: String },
    isHomePage: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    description: { type: String },
    metaData: metaDataSchema,
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// // Pre-save hook to auto-generate slug

// blogSchema.pre('save', async function (next) {
//     if (!this.isModified('title')) return next();

//     let baseSlug = slugify(this.title, { lower: true, strict: true, trim: true });
//     let slug = baseSlug;

//     // Check if slug already exists
//     const exists = await mongoose.models.Blog.findOne({ slug });

//     if (exists) {
//         slug = `${baseSlug}-${this.author}`;
//     }

//     this.slug = slug;
//     next();
// });

// blogSchema.pre('findOneAndUpdate', async function (next) {
//     const update = this.getUpdate();
//     const title = update?.title || update?.$set?.title;
//     const author = update?.author || update?.$set?.author;

//     if (!title) return next();

//     let baseSlug = slugify(title, { lower: true, strict: true, trim: true });
//     let slug = baseSlug;

//     // Check if base slug already exists
//     const exists = await mongoose.models.Blog.findOne({ slug });

//     if (exists) {
//         slug = `${baseSlug}-${(author || 'unknown').toLowerCase()}`;
//     }

//     if (update.$set) {
//         update.$set.slug = slug;
//     } else {
//         update.slug = slug;
//     }

//     this.setUpdate(update);
//     next();
// });

module.exports = mongoose.model('Blog', blogSchema);
