const express = require('express');
const Property = require('../models/Property');
const { generateSignedUrl, getKey } = require('../utils/s3');
const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const property = new Property(req.body);
        await property.save();
        res.status(201).json(property);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, category } = req.query;
        const query = {};

        if (category) {
            query.category = { $regex: category, $options: 'i' };
        }

        const totalProperties = await Property.countDocuments(query);
        const properties = await Property.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        // Generate signed URLs for logos and images in parallel for each property
        const propertiesWithSignedUrls = await Promise.all(
            properties.map(async (property) => {
                const logoPromise = property.logo ? generateSignedUrl(getKey(property.logo)) : null;
                const imagesPromises = property.images && Array.isArray(property.images)
                    ? property.images.map(image => generateSignedUrl(getKey(image)))
                    : [];

                const [logoSignedUrl, imagesSignedUrls] = await Promise.all([
                    logoPromise,
                    Promise.all(imagesPromises)
                ]);

                // Assign signed URLs back to the property object
                property.logo = logoSignedUrl;
                property.images = imagesSignedUrls;

                return property;
            })
        );

        res.json({
            totalProperties,
            currentPage: page,
            totalPages: Math.ceil(totalProperties / limit),
            properties: propertiesWithSignedUrls
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.get('/:id', async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });

        // Run logo and images transformations in parallel
        const logoPromise = property.logo ? generateSignedUrl(getKey(property.logo)) : null;
        const imagesPromises = property.images && Array.isArray(property.images)
            ? property.images.map(image => generateSignedUrl(getKey(image)))
            : [];

        // Await all promises concurrently
        const [logoSignedUrl, imagesSignedUrls] = await Promise.all([
            logoPromise,
            Promise.all(imagesPromises)
        ]);

        // Assign the results to property fields
        property.logo = logoSignedUrl;
        property.images = imagesSignedUrls;

        res.status(200).json(property);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.put('/:id', async (req, res) => {
    try {
        const property = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!property) return res.status(404).json({ message: 'Property not found' });
        res.status(200).json(property);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const property = await Property.findByIdAndDelete(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });
        res.status(200).json({ message: 'Property deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
