const express = require('express');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const Customer = require('../models/Customer');
const router = express.Router();

// Get all bookings (with pagination)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const bookings = await Booking.find()
            .populate('customerId propertyId')
            .limit(limit * 1)
            .skip((page - 1) * limit);
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get a single booking by ID (with error handling)
router.get('/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate(
            'customerId propertyId'
        );
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: 'Invalid booking ID' });
    }
});

router.post('/', async (req, res) => {
    const {
        customerId,
        propertyId,
        bookingDates,
        paymentStatus,
        confirmationDetails,
        totalPrice,
    } = req.body;

    try {
        // Check if customer exists
        const customerExists = await Customer.findById(customerId);
        if (!customerExists) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Check if property exists
        const propertyExists = await Property.findById(propertyId);
        if (!propertyExists) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // Validate booking dates
        const { checkIn, checkOut } = bookingDates;
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        // Check if check-in is before check-out
        if (checkInDate > checkOutDate) {
            return res
                .status(400)
                .json({
                    message: 'Check-out date must be after check-in date.',
                });
        }

        // Check minimum duration (e.g., 1 day)
        const minDuration = 1; // minimum duration in days
        const duration = (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24);
        if (duration < minDuration) {
            return res
                .status(400)
                .json({ message: `Minimum stay is ${minDuration} day(s).` });
        }

        // Check for overlapping bookings for the same property
        const overlappingBooking = await Booking.findOne({
            propertyId,
            'bookingDates.checkIn': { $lt: checkOut },
            'bookingDates.checkOut': { $gt: checkIn },
        });

        if (overlappingBooking) {
            return res.status(400).json({
                message:
                    'Property is already booked during the requested dates',
            });
        }

        // Proceed with booking creation
        const booking = new Booking({
            customerId,
            propertyId,
            bookingDates,
            paymentStatus,
            confirmationDetails,
            totalPrice,
        });

        await booking.save();
        res.status(201).json(booking);
    } catch (err) {
        res.status(500).json({
            message: 'Error creating booking',
            error: err.message,
        });
    }
});

// Update a booking (with existence check)
router.put('/:id', async (req, res) => {
    const { bookingDates, paymentStatus, confirmationDetails, totalPrice } =
        req.body;

    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        booking.bookingDates = bookingDates || booking.bookingDates;
        booking.paymentStatus = paymentStatus || booking.paymentStatus;
        booking.confirmationDetails =
            confirmationDetails || booking.confirmationDetails;
        booking.totalPrice = totalPrice || booking.totalPrice;

        await booking.save();
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete a booking (with existence check)
router.delete('/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        await booking.deleteOne();
        res.json({ message: 'Booking deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
