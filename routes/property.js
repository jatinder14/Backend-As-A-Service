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
        const { page = 1, limit = 10, status, location, type, bathrooms, bedrooms, title, soldOut } = req.query;
        const query = {};

        if (status) query.status = { $regex: status, $options: 'i' };

        if (status === 'SALES_ALL')
            query.status = { $in: ['SALE', 'SALE_OFF_PLAN'] };

        if (title) query.title = { $regex: title, $options: 'i' };


        if (location) query.location = location
        if (soldOut) query.soldOut = soldOut

        if (type) query.type = type

        if (bathrooms)
            query.bathrooms = {
                $gte: bathrooms
            }

        if (bedrooms)
            query.bedrooms = { $gte: bedrooms }

        // console.log(query);

        // if (status) {
        //     query.status = {
        //         $or: { $in: status }
        //     }
        // }

        const totalPropertys = await Property.countDocuments(query);
        const properties = await Property.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        // Generate signed URLs for logos and images in parallel for each Property
        const propertiesWithSignedUrls = await Promise.all(

            properties.map(async (property) => {
                const dldPermitQrCodePromise = property.dldPermitQrCode ? generateSignedUrl(getKey(property.dldPermitQrCode)) : null;

                const imagesPromises = property.images && Array.isArray(property.images)
                    ? property.images.map(image => generateSignedUrl(getKey(image)))
                    : [];

                const videoPromises = property.videos && Array.isArray(property.videos)
                    ? property.videos.map(el => generateSignedUrl(getKey(el.url)))
                    : [];

                const floorPlanImagePromises = property.floorPlans && Array.isArray(property.floorPlans)
                    ? property.floorPlans.map(el => {
                        if (el.floorPlanImage)
                            generateSignedUrl(getKey(el?.floorPlanImage))
                    })
                    : [];

                // Await all promises concurrently
                const [dldPermitQrCodeSignedUrl, imagesSignedUrls, videosSignedUrls, floorPlanImageSignedUrls] = await Promise.all([
                    dldPermitQrCodePromise,
                    Promise.all(imagesPromises),
                    Promise.all(videoPromises),
                    Promise.all(floorPlanImagePromises),
                ]);

                // Assign the results to Property fields
                property.dldPermitQrCode = dldPermitQrCodeSignedUrl;
                property.images = imagesSignedUrls;

                // ✅ Map each signed URL to the correct video object

                if (property.floorPlans?.length === floorPlanImageSignedUrls?.length) {
                    property.floorPlans.forEach((el, index) => {
                        // console.log(el, index);
                        el.floorPlanImage = floorPlanImageSignedUrls[index];
                    });
                }
                // console.log(property.floorPlans);

                if (property.videos?.length === videosSignedUrls?.length) {
                    property.videos.forEach((el, index) => {
                        // console.log(el, index);
                        el.url = videosSignedUrls[index];
                    });
                }

                return property;
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
        let property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });

        const dldPermitQrCodePromise = property.dldPermitQrCode ? generateSignedUrl(getKey(property.dldPermitQrCode)) : null;

        const imagesPromises = property.images && Array.isArray(property.images)
            ? property.images.map(image => generateSignedUrl(getKey(image)))
            : [];

        const videoPromises = property.videos && Array.isArray(property.videos)
            ? property.videos.map(el => generateSignedUrl(getKey(el.url)))
            : [];

        const floorPlanImagePromises = property.floorPlans && Array.isArray(property.floorPlans)
            ? property.floorPlans.map(el => generateSignedUrl(getKey(el.floorPlanImage)))
            : [];

        // Await all promises concurrently
        const [dldPermitQrCodeSignedUrl, imagesSignedUrls, videosSignedUrls, floorPlanImageSignedUrls] = await Promise.all([
            dldPermitQrCodePromise,
            Promise.all(imagesPromises),
            Promise.all(videoPromises),
            Promise.all(floorPlanImagePromises),
        ]);

        // Assign the results to Property fields
        property.dldPermitQrCode = dldPermitQrCodeSignedUrl;
        property.images = imagesSignedUrls;

        // ✅ Map each signed URL to the correct video object

        if (property.floorPlans?.length === floorPlanImageSignedUrls?.length) {
            property.floorPlans.forEach((el, index) => {
                // console.log(el, index);
                el.floorPlanImage = floorPlanImageSignedUrls[index];
            });
        }
        // console.log(property.floorPlans);

        if (property.videos?.length === videosSignedUrls?.length) {
            property.videos.forEach((el, index) => {
                // console.log(el, index);
                el.url = videosSignedUrls[index];
            });
        }
        // console.log("videosSignedUrls", videosSignedUrls, property.videos);

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
