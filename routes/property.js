const express = require('express');
const Property = require('../models/Property');
const { generateSignedUrl, getKey } = require('../utils/s3');
const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const property = new Property(req.body);
        await property.save();
        res.status(201).json({ message: 'property created successfully', property });
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

        const totalPropertys = await Property.countDocuments(query);
        const properties = await Property.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        // Generate signed URLs for logos and images in parallel for each Property
        const propertiesWithSignedUrls = await Promise.all(
            properties.map(async (Property) => {
                const dldPermitQrCodePromise = Property.logo ? generateSignedUrl(getKey(Property.logo)) : null;
                const imagesPromises = Property.images && Array.isArray(Property.images)
                    ? Property.images.map(image => generateSignedUrl(getKey(image)))
                    : [];

                const [dldPermitQrCodeSignedUrl, imagesSignedUrls] = await Promise.all([
                    dldPermitQrCodePromise,
                    Promise.all(imagesPromises)
                ]);

                // Assign signed URLs back to the Property object
                Property.logo = dldPermitQrCodeSignedUrl;
                Property.images = imagesSignedUrls;

                return Property;
            })
        );

        res.json({
            totalPropertys,
            currentPage: page,
            totalPages: Math.ceil(totalPropertys / limit),
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
        const dldPermitQrCodePromise = property.dldPermitQrCode ? generateSignedUrl(getKey(property.dldPermitQrCode)) : null;

        const imagesPromises = property.images && Array.isArray(property.images)
            ? property.images.map(image => generateSignedUrl(getKey(image)))
            : [];

        const videoPromises = property.videos && Array.isArray(property.videos)
            ? property.videos.map(el => generateSignedUrl(getKey(el.url)))
            : [];

        // Await all promises concurrently
        const [dldPermitQrCodeSignedUrl, imagesSignedUrls, videosSignedUrls] = await Promise.all([
            dldPermitQrCodePromise,
            Promise.all(imagesPromises),
            Promise.all(videoPromises)
        ]);

        // Assign the results to Property fields
        property.dldPermitQrCode = dldPermitQrCodeSignedUrl;
        property.images = imagesSignedUrls;
        property.videos = "videosSignedUrls";
        console.log("videosSignedUrls", videosSignedUrls);

        res.status(200).json(property);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.put('/:id', async (req, res) => {
    try {
        const property = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!property) return res.status(404).json({ message: 'Property not found' });
        res.status(200).json({ message: 'property updated successfully', property });

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
