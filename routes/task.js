const express = require('express');
const User = require('../models/User');
const Task = require('../models/Task');
const { verifyToken, adminRole } = require('../middleware/auth');
const hostaway = require('../models/hostway-listing');
const router = express.Router();

// Apply middleware to all routes in this router
router.use(verifyToken);

// Create Task
router.post('/createTask', async (req, res) => {
    const { title, description, listingId, assignedUsers, dueDate } = req.body;

    try {
        const listing = await hostaway.findOne({ listingId: listingId - '0' });
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        // Check if all assigned users exist
        const foundUsers = await User.find({ _id: { $in: assignedUsers } });
        const foundUserIds = foundUsers.map(user => user._id.toString());
        const missingUsers = assignedUsers.filter(id => !foundUserIds.includes(id));

        if (missingUsers.length > 0) {
            return res.status(404).json({
                message: 'One or more assigned users not found',
                missingUserIds: missingUsers
            });
        }

        const task = new Task({
            title,
            description,
            listingId,
            assignedUsers,
            dueDate
        });

        await task.save();

        res.status(201).json({ message: 'Task created successfully', task });
    } catch (err) {
        res.status(500).json({ message: 'Error creating task', error: err.message });
    }
});

router.get('/getTasks', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        // Get total tasks count
        const totalTasks = await Task.countDocuments();

        // Fetch tasks with pagination
        const tasks = await Task.find()
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('assignedUsers') // Populate assigned users
            // .populate({
            //     path: 'listingId', // Populate the listing associated with the task
            //     model: 'Listing' // Assuming your model name is 'Listing'
            // });

        res.json({
            totalTasks,
            currentPage: page,
            totalPages: Math.ceil(totalTasks / limit),
            tasks
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching tasks', error: err.message });
    }
});

// Get Task by ID
router.get('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id).populate('assignedUsers');
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(200).json(task);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching task', error: err.message });
    }
});

// Update Task
router.put('/:id', async (req, res) => {
    const { title, description, listingId, assignedUsers, dueDate } = req.body;

    try {
        const listing = await hostaway.findOne({ listingId: listingId - '0' });
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        // Check if all assigned users exist
        const foundUsers = await User.find({ _id: { $in: assignedUsers } });
        const foundUserIds = foundUsers.map(user => user._id.toString());
        const missingUsers = assignedUsers.filter(id => !foundUserIds.includes(id));

        if (missingUsers.length > 0) {
            return res.status(404).json({
                message: 'One or more assigned users not found',
                missingUserIds: missingUsers
            });
        }

        const task = await Task.findByIdAndUpdate(req.params.id, {
            title,
            description,
            listingId,
            assignedUsers,
            dueDate
        }, { new: true });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.status(200).json({ message: 'Task updated successfully', task });
    } catch (err) {
        res.status(500).json({ message: 'Error updating task', error: err.message });
    }
});

// Delete Task
router.delete('/:id', async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting task', error: err.message });
    }
});

module.exports = router;
