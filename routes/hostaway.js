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

router.get('/getListings', async (req, res) => {
    try {
        const { page = 1, limit = 10, name, address } = req.query;

        // Build the filter object based on query parameters
        const filter = {};
        if (name) {
            filter.name = { $regex: name, $options: 'i' }; // Case-insensitive search for name
        }
        if (address) {
            filter.address = { $regex: address, $options: 'i' };
        }

        const totalListings = await hostaway.countDocuments(filter);

        const listings = await hostaway.find(filter)
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
