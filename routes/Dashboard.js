const express = require('express');
const Leave = require('../models/Leave');
const User = require('../models/User');
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');
const Task = require('../models/Task');
const Lead = require('../models/Lead');
const Property = require('../models/Property');
const { generateSignedUrl, getKey } = require('../utils/s3');

const router = express.Router();

router.use(verifyToken);

router.get('/count', async (req, res) => {
    try {
        const totalOffplan = await Property.countDocuments({ status: 'OFF_PLAN' });
        const totalSale = await Property.countDocuments({ status: 'SALE' });
        const totalRent = await Property.countDocuments({ status: 'RENT' });
        // const totalDraft = await Property.countDocuments({ status: 'DRAFT' });
        const totalProperties = await Property.countDocuments();

        const properties = await Property.find()
            .sort({ createdAt: -1 })
            .limit(8)
            .populate('createdBy');

        let propertiesWithSignedUrls = await Promise.all(

            properties.map(async (property) => {

                if (!property?.importedFromCrm) {

                    const dldPermitQrCodePromise = property.dldPermitQrCode ? generateSignedUrl(getKey(property.dldPermitQrCode)) : null;

                    const imagesPromises = property.images && Array.isArray(property.images)
                        ? property.images.map(image => generateSignedUrl(getKey(image?.url)))
                        : [];

                    const videoPromises = property.videos && Array.isArray(property.videos)
                        ? property.videos.map(el => generateSignedUrl(getKey(el?.url)))
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
                }
                return property;
            })
        );

        res.json({
            totalOffplan,
            totalSale,
            totalRent,
            // totalDraft,
            totalProperties,
            propertiesWithSignedUrls
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// router.get('/count', async (req, res) => {
//     try {
//         const userId = req.user.id;
//         const year = new Date().getFullYear();
//         let filter = {}
//         filter.$or = [];


//         let lastLeave = await Leave.findOne({ userId, year }).sort({ createdAt: -1 });

//         filter.$or.push({ assignedUsers: { $elemMatch: { $eq: userId } } }); // Check if `userId` is in the array

//         filter.$or.push({ createdBy: userId });

//         filter.status = "Pending"
//         const pendingTasks = await Task.countDocuments(filter);



//         // const totalLeads = await Lead.countDocuments({ status: "Pending" });
//         let query = {};
//         if (req.user.role == "sales") {
//             query = { createdBy: req.user.id }; // Filter leads by the logged-in user's ID
//         }

//         if (req.user.role == "ceo") {
//             query.status = "OM-Approval"
//         }

//         // if (status) {
//         //     query.status = status
//         // }
//         const totalLeads = await Lead.countDocuments(query);


//         console.log("fadfadsf", lastLeave);

//         const sickLeaveRemaining = lastLeave ? lastLeave.sickLeaveRemaining : 7;
//         const annualLeaveRemaining = lastLeave ? lastLeave.annualLeaveRemaining : 30;

//         res.json({ sickLeaveRemaining, annualLeaveRemaining, pendingTasks, totalLeads });
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });



module.exports = router;
