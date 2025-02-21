const express = require('express');
const Leave = require('../models/Leave');
const User = require('../models/User');
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.post('/', async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const userId = req.user.id
        console.log({ ...req.body, userId: userId });
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ error: 'Start date cannot be after end date' });
        }
        const existingLeave = await Leave.findOne({
            userId,
            startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) }

        });
        console.log(await Leave.findOne({
            userId,
            // $or: [
            //     { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
            // ]
            startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) }

        }));

        if (existingLeave) {
            return res.status(400).json({ error: 'A leave request already exists for these dates', existingLeave });
        }
        const leave = new Leave({ ...req.body, userId: req.user.id });
        await leave.save();
        res.status(201).json(leave);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/getAllLeaves', async (req, res) => {
    try {
        console.log("jatinder");
        const userId = req.user.id
        const { page = 1, limit = 10, startDate, endDate } = req.query;
        const filter = { userId }
        if (startDate && endDate) {
            filter.startDate = { $lte: new Date(endDate) };
            filter.endDate = { $gte: new Date(startDate) };
        }

        console.log(filter);
        const leaves = await Leave.find(filter)
            .limit(limit * 1) // Convert limit to a number
            .skip((page - 1) * limit)
            .select('-createdAt -updatedAt') // Exclude fields if not needed
            .populate('userId')
            .exec()

        res.json(leaves);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id).populate('userId');
        if (!leave) return res.status(404).json({ error: 'Leave not found' });
        res.json(leave);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const userId = req.user.id
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ error: 'Start date cannot be after end date' });
        }
        const existingLeave = await Leave.findOne({
            userId,
            startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) }

        });
        console.log(await Leave.findOne({
            userId,
            // $or: [
            //     { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
            // ]
            startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) }

        }));

        if (existingLeave) {
            return res.status(400).json({ error: 'A leave request already exists for these dates', existingLeave });
        }
        const leave = await Leave.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!leave) return res.status(404).json({ error: 'Leave not found' });
        res.json(leave);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
})

router.delete('/:id', async (req, res) => {
    try {
        const leave = await Leave.findByIdAndDelete(req.params.id);
        if (!leave) return res.status(404).json({ error: 'Leave not found' });
        res.json({ message: 'Leave deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
