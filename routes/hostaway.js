const express = require('express');
const router = express.Router();
const hostaway = require('../models/hostway-listing')

router.get('/getListing/:id', async (req, res) => {
    try {
        const listingId = req.params.id;
        const listing = await hostaway.findOne({ listingId: listingId-'0' });
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        res.json(listing);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching listing', error: err.message });
    }
});

// Get all listings (with pagination)
router.get('/getListings', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const totalListings = await hostaway.countDocuments();
        const listings = await hostaway.find()
            .limit(limit * 1)
            .skip((page - 1) * limit);
        res.json({
            totalListings,    
            currentPage: page,
            totalPages: Math.ceil(totalListings / limit),
            listings
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;
