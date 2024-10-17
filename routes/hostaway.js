const express = require('express');
const router = express.Router();
const hostaway = require('../models/hostway-listing')

// Get all listings (with pagination)
router.get('/getListings', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const listings = await hostaway.find()
            .limit(limit * 1)
            .skip((page - 1) * limit);
        res.json(listings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;
