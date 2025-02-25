const express = require('express');
const Leave = require('../models/Leave');
const User = require('../models/User');
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.post('/', async (req, res) => {
    try {
        const { startDate, endDate, type } = req.body;
        const userId = req.user.id
        const year = new Date(startDate).getFullYear();

        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ message: 'Start date cannot be after end date' });
        }
        const existingLeave = await Leave.findOne({
            userId,
            startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) }

        });
        // console.log(await Leave.findOne({
        //     userId,
        //     // $or: [
        //     //     { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
        //     // ]
        //     startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) }

        // }));

        if (existingLeave) {
            return res.status(400).json({ message: 'A leave request already exists for these dates', existingLeave });
        }

        const leaveDays = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24) + 1;

        // Fetch last leave entry for the user to check balance
        let lastLeave = await Leave.findOne({ userId, year }).sort({ createdAt: -1 });

        let sickLeaveRemaining = lastLeave ? lastLeave.sickLeaveRemaining : 7;
        let annualLeaveRemaining = lastLeave ? lastLeave.annualLeaveRemaining : 30;
        console.log('leavedays-', leaveDays, lastLeave);

        // Check leave balance before approving
        if (type === 'Sick' && sickLeaveRemaining < leaveDays) {
            return res.status(400).json({ message: `Not enough Sick Leaves. Available: ${sickLeaveRemaining}` });
        }
        if (type === 'Annual' && annualLeaveRemaining < leaveDays) {
            return res.status(400).json({ message: `Not enough Annual Leaves. Available: ${annualLeaveRemaining}` });
        }

        // Deduct Leave Balance
        if (type === 'Sick') sickLeaveRemaining -= leaveDays;
        if (type === 'Annual') annualLeaveRemaining -= leaveDays;

        // Create Leave Entry
        const leave = new Leave({
            ...req.body,
            userId: req.user.id,
            year,
            sickLeaveRemaining,
            annualLeaveRemaining
        });
        await leave.save();
        res.status(201).json({ message: "Leave Created Successfully", leave });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.get('/getAllLeaves', async (req, res) => {
    try {
        const userId = req.user.id
        const { page = 1, limit = 10, startDate, endDate, status } = req.query;
        const filter = { userId }
        if (startDate && endDate) {
            filter.startDate = { $lte: new Date(endDate) };
            filter.endDate = { $gte: new Date(startDate) };
        }
        if (status) {
            filter.status = status
        }

        // console.log(filter);
        const leaves = await Leave.find(filter)
            .limit(limit * 1) // Convert limit to a number
            .skip((page - 1) * limit)
            .select('-createdAt -updatedAt') // Exclude fields if not needed
            .populate('userId')
            .exec()

        res.json({ message: "Leaves Fetched Successfully", leaves });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/balance', async (req, res) => {
    try {
        console.log("fadfadsf");
        const userId = req.user.id;
        const year = new Date().getFullYear();

        let lastLeave = await Leave.findOne({ userId, year }).sort({ createdAt: -1 });

        const sickLeaveRemaining = lastLeave ? lastLeave.sickLeaveRemaining : 7;
        const annualLeaveRemaining = lastLeave ? lastLeave.annualLeaveRemaining : 30;

        res.json({ sickLeaveRemaining, annualLeaveRemaining });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id).populate('userId');
        if (!leave) return res.status(404).json({ message: 'Leave not found' });
        res.json(leave);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { startDate, endDate, type, status, rejectedReason, rejectedBy } = req.body;
        const userId = req.user.id
        const year = new Date(startDate).getFullYear();

        if (startDate && endDate) {
            if (new Date(startDate) > new Date(endDate))
                return res.status(400).json({ message: 'Start date cannot be after end date' });
            else {
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
                    return res.status(400).json({ message: 'A leave request already exists for these dates', existingLeave });
                }
            }
        }

        let leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ message: 'Leave not found' });
        if (startDate && endDate) {
            // Calculate previous leave duration
            const previousLeaveDays = (new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24) + 1;

            // Fetch the latest leave balance before modification
            let lastLeave = await Leave.findOne({ userId, year }).sort({ createdAt: -1 });

            let sickLeaveRemaining = lastLeave ? lastLeave.sickLeaveRemaining : 7;
            let annualLeaveRemaining = lastLeave ? lastLeave.annualLeaveRemaining : 30;

            // Restore balance from the previous leave
            if (leave.type === 'Sick') sickLeaveRemaining += previousLeaveDays;
            if (leave.type === 'Annual') annualLeaveRemaining += previousLeaveDays;

            // Calculate new leave duration
            const newLeaveDays = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24) + 1;

            // Check if new request is within available balance
            if (type === 'Sick' && sickLeaveRemaining < newLeaveDays) {
                return res.status(400).json({ message: `Not enough Sick Leaves. Available: ${sickLeaveRemaining}` });
            }
            if (type === 'Annual' && annualLeaveRemaining < newLeaveDays) {
                return res.status(400).json({ message: `Not enough Annual Leaves. Available: ${annualLeaveRemaining}` });
            }

            // Deduct new leave from balance
            if (type === 'Sick') sickLeaveRemaining -= newLeaveDays;
            if (type === 'Annual') annualLeaveRemaining -= newLeaveDays;

            // Update leave details
            leave.startDate = startDate;
            leave.endDate = endDate;
            leave.type = type;
            leave.sickLeaveRemaining = sickLeaveRemaining;
            leave.annualLeaveRemaining = annualLeaveRemaining;
        } else {
            Object.assign(leave, req.body);
        }

        leave.status = req.body?.status
        leave.rejectedBy = req?.user?.id
        leave.rejectedReason = req.body?.rejectedReason
        await leave.save();

        res.json({ message: 'Leave updated successfully', leave });

    } catch (err) {
        res.status(400).json({ message: err.message });
    }
})

router.delete('/:id', async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ message: 'Leave not found' });

        const leaveDays = (new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24) + 1;

        // Fetch latest leave entry for the user
        let lastLeave = await Leave.findOne({ userId: leave.userId, year: leave.year }).sort({ createdAt: -1 });

        if (leave.type === 'Sick') lastLeave.sickLeaveRemaining += leaveDays;
        if (leave.type === 'Annual') lastLeave.annualLeaveRemaining += leaveDays;

        await lastLeave.save();
        await Leave.findByIdAndDelete(req.params.id);

        res.json({ message: 'Leave deleted successfully and balance restored', lastLeave });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;
