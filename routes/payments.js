const express = require('express');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const router = express.Router();

// Get all payments (with pagination)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const payments = await Payment.find()
            .populate('bookingId')
            .limit(limit * 1)
            .skip((page - 1) * limit);
        res.json(payments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get a single payment by ID (with error handling)
router.get('/:id', async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id).populate('bookingId');
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        res.json(payment);
    } catch (err) {
        res.status(500).json({ message: 'Invalid payment ID' });
    }
});

// Create a new payment (with existence check for booking)
router.post('/', async (req, res) => {
    const { bookingId, amount, method, status, transactionId } = req.body;

    try {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const payment = new Payment({
            bookingId,
            amount,
            method,
            status,
            transactionId
        });
        await payment.save();
        res.status(201).json(payment);
    } catch (err) {
        res.status(500).json({ message: 'Error creating payment', error: err.message });
    }
});

// Update a payment (with existence check)
router.put('/:id', async (req, res) => {
    const { amount, method, status, transactionId } = req.body;

    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        payment.amount = amount || payment.amount;
        payment.method = method || payment.method;
        payment.status = status || payment.status;
        payment.transactionId = transactionId || payment.transactionId;

        await payment.save();
        res.json(payment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete a payment (with existence check)
router.delete('/:id', async (req, res) => {
    try {
        console.log("-------debug-----")
        const payment = await Payment.findById(req.params.id);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        await payment.deleteOne();
        res.json({ message: 'Payment deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
