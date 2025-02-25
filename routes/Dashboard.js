const express = require('express');
const Leave = require('../models/Leave');
const User = require('../models/User');
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');
const Task = require('../models/Task');
const Lead = require('../models/Lead');

const router = express.Router();

router.use(verifyToken);

router.get('/count', async (req, res) => {
    try {
        const userId = req.user.id;
        const year = new Date().getFullYear();
        let filter = {}
        filter.$or = [];


        let lastLeave = await Leave.findOne({ userId, year }).sort({ createdAt: -1 });

        filter.$or.push({ assignedUsers: { $elemMatch: { $eq: userId } } }); // Check if `userId` is in the array

        filter.$or.push({ createdBy: userId });

        filter.status = "Pending"
        const pendingTasks = await Task.countDocuments(filter);



        // const totalLeads = await Lead.countDocuments({ status: "Pending" });
        let query = {};
        if (req.user.role == "sales") {
            query = { createdBy: req.user.id }; // Filter leads by the logged-in user's ID
        }

        if (req.user.role == "ceo") {
            query.status = "OM-Approval"
        }

        // if (status) {
        //     query.status = status
        // }
        const totalLeads = await Lead.countDocuments(query);


        console.log("fadfadsf", lastLeave);

        const sickLeaveRemaining = lastLeave ? lastLeave.sickLeaveRemaining : 7;
        const annualLeaveRemaining = lastLeave ? lastLeave.annualLeaveRemaining : 30;

        res.json({ sickLeaveRemaining, annualLeaveRemaining, pendingTasks, totalLeads });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



module.exports = router;
