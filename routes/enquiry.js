const express = require('express');
const Enquiry = require('../models/Enquiry');
const router = express.Router();
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');

router.get('/getEnquiries', async (req, res) => {
    try {
        console.log("--------------");
        const { page = 1, limit = 10, status } = req.query;
        const query = {};

        if (status) query.status = { $regex: status, $options: 'i' };

        const totalEnquirys = await Enquiry.countDocuments(query);
        const enquiries = await Enquiry.find(query)
            .populate('propertyId')
            .limit(limit * 1)
            .skip((page - 1) * limit);

        res.json({
            totalEnquirys,
            currentPage: page,
            totalPages: Math.ceil(totalEnquirys / limit),
            enquiries: enquiries
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        let enquiry = await Enquiry.findById(req.params.id).populate('propertyId')

        if (!enquiry) return res.status(404).json({ message: 'Enquiry not found' });

        res.status(200).json(enquiry);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.post('/', async (req, res) => {
    try {
        const enquiry = await new Enquiry(req.body).populate('propertyId');
        await enquiry.save();
        res.status(201).json({ message: 'enquiry created successfully', enquiry });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.use(verifyToken, adminRole);

router.put('/:id', async (req, res) => {
    try {
        req.body.updatedBy = req.user?.id;
        const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('propertyId')
            .populate('updatedBy')
            .populate('createdBy');

        if (!enquiry) return res.status(404).json({ message: 'Enquiry not found' });
        res.status(200).json({ message: 'enquiry updated successfully', enquiry });

    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
        if (!enquiry) return res.status(404).json({ message: 'Enquiry not found' });
        res.status(200).json({ message: 'Enquiry deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
