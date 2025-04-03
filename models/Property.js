//Empire Infratech 
const mongoose = require("mongoose");

const PropertySchema = new mongoose.Schema(
    {
        title: { type: String },
        address: { type: String },
        latitude: { type: String },
        longitude: { type: String },
        description: { type: String },
        saleOrRentprice: { type: Number },
        pricePrefix: { type: String },
        pricePostfix: { type: String },
        type: {
            type: String,
            enum: [
                "Apartment",
                "Duplexes",
                "Mansion",
                "PentHouse",
                "Studio",
                "Townhouse",
                "Villa",
                "none"
            ],
            default: "none",
        },
        status: { type: String, enum: ["OFF_PLAN", "SALE", "RENT"] },
        location: {
            type: String,
            enum: [
                "Al Safa",
                "City Walk",
                "Damac Hills",
                "Downtown",
                "Dubai Creek Harbour",
                "Dubai Harbour",
                "Dubai Hills Estate",
                "Dubai Investment Park",
                "Dubai Islands",
                "Dubai Marina",
                "Dubai Maritime City",
                "Dubai Production City",
                "Dubai Studio City",
                "Dubailand",
                "Emaar South",
                "Jumeirah Beach Residence",
                "Jumeirah park",
                "Jumeirah Village Circle",
                "Motor City",
                "Palm Jumeirah",
                "Rashid Marina & Yatch",
                "Sobha Hartland 2",
                "The Valley",
                "none"
            ],
            default: "none",
            required: true,
        },
        bedrooms: { type: Number, default: 0 }, // Number of Bedrooms
        bathrooms: { type: Number, default: 0 }, // Number of Bathrooms
        garagesOrParkingSpaces: { type: Number, default: 0 }, // Number of Garages or Parking Spaces
        area: { type: Number }, // Property Area
        areaPostfix: { type: String, default: "sq ft" }, // Unit of Area
        developer: {
            type: String,
            enum: [
                "Emaar",
                "Danube",
                "Nakheel",
                "Azizi",
                "Sobha",
                "Samana",
                "Omniyat",
                "Meraas",
                "Majid al Futtaim",
                "Ellington",
                "Damac",
                "Binghatti",
                "LMD",
                "Imtiaz",
                "City View",
                "SOL",
                "Sankari",
                "H & H",
                "Select",
                "Nshama",
                "Signature",
                "Wasl",
                "Valores",
                "Laya Developers",
                "none"
            ],
            default: "none",

        },
        handoverDate: { type: Date }, // Handover Date
        isFeatured: { type: Boolean, default: false }, // Mark as Featured
        images: [
            { type: String },
        ],
        // dldPermitQrCode: [{ type: String }],
        dldPermitQrCode: { type: String },
        galleryType: {
            type: String,
            enum: [
                "Default Gallery",
                "Gallery with Thumbnails",
                "Gallery with Thumbnails Two",
                "Full Width Carousel",
                "Carousel",
                "Masonry",
            ],
            default: "Default Gallery",
        },
        floorPlans: [
            {
                _id: false, // Prevents MongoDB from auto-generating _id for each video object
                floorName: { type: String },
                description: { type: String },
                floorPlanImage: { type: String },
                floorPrice: { type: Number },
                pricePostfix: { type: String },
                floorSize: { type: Number },
                sizePostfix: { type: String },
                bedrooms: { type: Number },
                bathrooms: { type: Number },
            },
        ],
        videos: [
            {
                _id: false, // Prevents MongoDB from auto-generating _id for each video object
                title: { type: String },
                url: {
                    type: String,
                    required: true,
                    // match: /^(https?:\/\/)?(www\.)?(youtube\.com|vimeo\.com|.*\.(swf|mov))/, // Ensures only supported formats
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
                enum: [
                    "2 Stories",
                    "24/7 Security",
                    "26' Ceilings",
                    "Activity Lawn",
                    "Balcony",
                    "BBQ Area",
                    "Bike Path",
                    "Central Cooling",
                    "Central Heating",
                    "Children's Play Area",
                    "Dual Sinks",
                    "Electric Range",
                    "Emergency Exit",
                    "Entry Court",
                    "Event Zone",
                    "Fire Alarm",
                    "Fire Place",
                    "Gym",
                    "Health Club",
                    "Home Theater",
                    "Hurricane Shutters",
                    "Jog Path",
                    "Jogging Track",
                    "Kid’s Wet & Dry Area",
                    "Kids Pool",
                    "Landscape Plaza",
                    "Landscaped Gardens",
                    "Laundry Room",
                    "Lawn",
                    "Main Pool",
                    "Marble Floors",
                    "Next to Busy Way",
                    "Outdoor Gym",
                    "Parking",
                    "Patio Seating",
                    "Pool Patio",
                    "Seating Area",
                    "Shared Gym",
                    "Shared Pool",
                    "Sunken Lawn",
                    "Swimming Pool",
                    "Tennis Court",
                    "View of Water",
                ],
            },
        ],

        propertyLabel: { type: String }, // Allows adding a property label for display
        labelBackgroundColor: { type: String }, // Allows adding a property label for display
        agentInformationDisplay: {
            type: String,
            enum: [
                "None", // Agent information box will not be displayed
                "My Profile Information", // Uses the user's profile info
                "Display Agent(s) Information", // Displays selected agent(s)
            ],
            default: "None",
        },

        selectedAgents: [
            {
                type: String,
                // enum: [
                //     "None", // Agent information box will not be displayed
                //     "Arshia Shaukat", // Uses the user's profile info
                //     "Empire Infratech", // Displays selected agent(s)
                // ],  
                default: "None",
            }
        ],

        acceptTermsAndConditions: {
            type: Boolean,
            required: true,
            default: false, // Ensures the user must accept before submitting
        },

    },
    { timestamps: true }
);

module.exports = mongoose.model("Property", PropertySchema);
