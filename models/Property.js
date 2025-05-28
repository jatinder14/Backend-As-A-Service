//Empire Infratech 
const mongoose = require("mongoose");
const slugify = require('slugify');

const PropertySchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        slug: { type: String, unique: true, default: null },
        address: { type: String },
        country: { type: String },
        completion_status: { type: String },
        property_purpose: { type: String },  //same as status field
        property_type: { type: String },
        latitude: { type: String },
        longitude: { type: String },
        description: { type: String },
        saleOrRentprice: { type: Number },
        pricePrefix: { type: String },
        pricePostfix: { type: String },
        price_freq: { type: String },
        soldOut: { type: Boolean, default: false },
        importedFromCrm: { type: Boolean, default: false },
        propertyStatusMessage: { type: String },
        referenceNumber: { type: String },
        meta_title: [{ type: String }],
        meta_keyword: [{ type: String }],
        meta_description: [{ type: String }],
        type: {
            type: String,
        },
        baseCurrency: {
            type: String,
            // enum: ["INR", "USD", "GBP", "YEN", "EURO", "AED", "RUB"],
            // default: "AED",
        },

        status: {
            type: String,
            // enum: ["OFF_PLAN", "SALE", "SALE_OFF_PLAN", "RENT"]
        },
        tower: { type: String },
        city: { type: String },
        sub_location: { type: String },
        location: {
            type: String,
        },
        bedrooms: { type: String, default: 0 }, // Number of Bedrooms
        bathrooms: { type: String, default: 0 }, // Number of Bathrooms
        garagesOrParkingSpaces: { type: String, default: 0 }, // Number of Garages or Parking Spaces
        area: { type: String }, // Property Area
        plot: { type: String }, // Property Area
        areaPostfix: { type: String, default: "sq ft" }, // Unit of Area
        developer: {
            type: String,
        },
        handoverDate: { type: String }, // Handover Date
        isFeatured: { type: Boolean, default: false }, // Mark as Featured
        images: [
            { type: String },
        ],
        dldPermitQrCode: { type: String },
        galleryType: {
            type: String,
        },
        floorPlans: [
            {
                _id: false, // Prevents MongoDB from auto-generating _id for each video object
                floorName: { type: String },
                description: { type: String },
                floorPlanImage: { type: String },
                floorPrice: { type: String },
                pricePostfix: { type: String },
                floorSize: { type: String },
                sizePostfix: { type: String },
                bedrooms: { type: String },
                bathrooms: { type: String },
            },
        ],
        videos: [
            {
                _id: false, // Prevents MongoDB from auto-generating _id for each video object
                title: { type: String },
                url: {
                    type: String,
                },
            },
        ],

        additionalDetails: [
            {
                _id: false, // Prevents MongoDB from auto-generating _id for each video object
                title: { type: String },
                value: { type: String },
            },
        ],

        features: [
            {
                type: String,
            },
        ],

        propertyLabel: { type: String }, // Allows adding a property label for display
        labelBackgroundColor: { type: String }, // Allows adding a property label for display
        permit_no: { type: String },
        agentInformationDisplay: {
            type: String,
        },

        selectedAgents: [
            {
                type: String,
            }
        ],

        acceptTermsAndConditions: {
            type: Boolean,
            default: false, // Ensures the user must accept before submitting
        },

    },
    { timestamps: true }
);

// // Pre-save hook to auto-generate slug

PropertySchema.pre('save', async function (next) {
    if (!this.isModified('title')) return next();

    let baseSlug = slugify(this.title, { lower: true, strict: true, trim: true });
    let slug = baseSlug;

    // Check if slug already exists
    const exists = await mongoose.models.Property.findOne({ slug });

    if (exists) {
        slug = `${baseSlug}-${this.status}`;
    }

    this.slug = slug;
    next();
});

PropertySchema.pre('findOneAndUpdate', async function (next) {
    const update = this.getUpdate();
    const title = update?.title || update?.$set?.title;
    const status = update?.status || update?.$set?.status;

    if (!title) return next();

    let baseSlug = slugify(title, { lower: true, strict: true, trim: true });
    let slug = baseSlug;

    // Check if base slug already exists
    const exists = await mongoose.models.Property.findOne({ slug });

    if (exists) {
        slug = `${baseSlug}-${(status || 'unknown').toLowerCase()}`;
    }

    if (update.$set) {
        update.$set.slug = slug;
    } else {
        update.slug = slug;
    }

    this.setUpdate(update);
    next();
});

module.exports = mongoose.model("Property", PropertySchema);
