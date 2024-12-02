const express = require('express');
const router = express.Router();
const listingModel = require('../models/hostway-listing')
const reservationModel = require('../models/Hostway-Reservation')

router.get('/getListing/:id', async (req, res) => {
    try {
        const listingId = req.params.id;
        const listing = await listingModel.findOne({ listingId: listingId - '0' });
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

        const totalListings = await listingModel.countDocuments(filter);

        const listings = await listingModel.find(filter)
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

router.get('/getReservation/:id', async (req, res) => {
    try {
        const reservationId = req.params.id;
        const reservation = await reservationModel.findOne({ reservationId: reservationId });
        if (!reservation) {
            return res.status(404).json({ message: 'reservation not found' });
        }
        res.json(reservation);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching reservation', error: err.message });
    }
});

router.get('/getReservations', async (req, res) => {
    try {
        const { page = 1, limit = 10, channelName } = req.query;

        // Build the filter object based on query parameters
        const filter = {};
        if (channelName) {
            filter.channelName = { $regex: channelName, $options: 'i' }; // Case-insensitive search for name
        }

        const totalReservations = await reservationModel.countDocuments(filter);

        const reservations = await reservationModel.find(filter)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        res.json({
            totalReservations,
            currentPage: page,
            totalPages: Math.ceil(totalReservations / limit),
            reservations
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
