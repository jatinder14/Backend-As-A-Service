const express = require('express');
const User = require('../models/User');
const Task = require('../models/Task');
const { verifyToken, adminRole } = require('../middleware/auth');
const hostaway = require('../models/hostway-listing');
const { sendEmail } = require('../services/emailService');
const { EMAIL_SUBJECTS, EMAIL_MESSAGES } = require('../constants/message');
const { EMAIL_TEMPLATES } = require('../constants/emailTemplate');
const { ERROR_MESSAGES } = require('../constants/eroorMessaages');
const { SUCCESS_MESSAGES } = require('../constants/successMessges');
const router = express.Router();

// Apply middleware to all routes in this router
router.use(verifyToken);

// Create Task
router.post('/createTask', async (req, res) => {
    const { title, description, listingId, assignedUsers, dueDate } = req.body;
    try {
        if (listingId) {
            const listing = await hostaway.findOne({ _id: listingId }); // Use _id field for querying
            if (!listing) {
                return res.status(404).json({ message: ERROR_MESSAGES.LISTING_NOT_FOUND });
            }
        }
        // Check if all assigned users exist
        const foundUsers = await User.find({ _id: { $in: assignedUsers } });
        const foundUserIds = foundUsers.map(user => user._id.toString());
        const missingUsers = assignedUsers?.filter(id => !foundUserIds.includes(id));

        if (missingUsers.length > 0) {
            return res.status(404).json({
                message: ERROR_MESSAGES.ASSIGNED_USERS_NOT_FOUND,
                missingUserIds: missingUsers
            });
        }

        const task = new Task({
            title,
            description,
            listingId,
            assignedUsers,
            dueDate,
            createdBy: req.user.id,  // Set createdBy to the current logged in user
            updatedBy: [{
                user: req.user.id,
                updatedAt: new Date()
            }]
        });

        await task.save();
        // Send email to assigned users
        const emailPromises = foundUsers.map(user => {
            const subject = `${EMAIL_SUBJECTS.TASK_ASSIGNED} ${title}`;
            const text = `${EMAIL_MESSAGES.TASK_ASSIGNED} ${description}. ${EMAIL_MESSAGES.DUE_DATE} ${dueDate}`;
            return sendEmail(user?.email, subject, text);
        });

        const creator = await User?.findById(req.user.id);
        const subject = `${EMAIL_SUBJECTS.TASK_CREATED} ${title}`;
        const text = `${EMAIL_MESSAGES.TASK_CREATED} ${description}. ${EMAIL_MESSAGES.DUE_DATE} ${dueDate}`;
        emailPromises.push(sendEmail(creator?.email, subject, text));
        // await Promise.all(emailPromises); // Wait for all emails to be sent
        res.status(201).json({ message: SUCCESS_MESSAGES.TASK_CREATED, task });
    } catch (err) {
        res.status(500).json({ message: ERROR_MESSAGES.ERROR_CREATING_TASK, error: err.message });
    }
});

router.get('/getTasks', async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const userId = req.user.id; // Assuming `verifyToken` attaches `req.user`
        const isAdmin = req.user.role === 'admin'; // Assuming `req.user.role` exists

        // Superadmin gets all tasks, others only get their tasks
        const filter = isAdmin
            ? {} // No filter for superadmin
            : {
                $or: [
                    { createdBy: userId },
                    { assignedUsers: userId }
                ]
            };

        if (status) {
            filter.status = status
        }
        // console.log("filter", filter)
        
        // Count the total tasks based on the filter
        const totalTasks = await Task.countDocuments(filter);

        // Fetch tasks with pagination
        const tasks = await Task.find(filter)
            .limit(limit * 1) // Convert limit to a number
            .skip((page - 1) * limit)
            .populate('assignedUsers')
            .populate('createdBy')
            .populate('listingId')
            .populate('updatedBy.user')
            .select('-createdAt -updatedAt') // Exclude fields if not needed
            .exec();

        res.json({
            totalTasks,
            currentPage: page,
            totalPages: Math.ceil(totalTasks / limit),
            tasks
        });
    } catch (err) {
        res.status(500).json({ message: ERROR_MESSAGES.ERROR_FETCHING_TASKS, error: err.message });
    }
});

// Get Task by ID
router.get('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedUsers')
            .populate('updatedBy.user')
            .populate('listingId')
            .select('-createdAt -updatedAt')
            .exec();

        if (!task) {
            return res.status(404).json({ message: ERROR_MESSAGES.TASK_NOT_FOUND });
        }
        res.status(200).json(task);
    } catch (err) {
        res.status(500).json({ message: ERROR_MESSAGES.ERROR_FETCHING_TASK, error: err.message });
    }
});

// Update Task
router.put('/:id', async (req, res) => {
    const { title, description, listingId, assignedUsers, dueDate, status } = req.body;

    try {
        if (listingId) {
            console.log("--------", listingId);
            const listing = await hostaway.findOne({ _id: listingId }); // Use _id field for querying
            if (!listing) {
                return res.status(404).json({ message: ERROR_MESSAGES.LISTING_NOT_FOUND });
            }
        }

        // Check if all assigned users exist
        const foundUsers = await User.find({ _id: { $in: assignedUsers } });
        const foundUserIds = foundUsers.map(user => user._id.toString());
        const missingUsers = assignedUsers?.filter(id => !foundUserIds.includes(id));

        if (missingUsers.length > 0) {
            return res.status(404).json({
                message: ERROR_MESSAGES.ASSIGNED_USERS_NOT_FOUND,
                missingUserIds: missingUsers
            });
        }

        const task = await Task.findByIdAndUpdate(req.params.id,
            {
                title,
                description,
                listingId,
                assignedUsers,
                dueDate,
                status,
                $push: {
                    updatedBy: {
                        user: req.user.id,
                        updatedAt: new Date()
                    }
                }
            },
            { runValidators: true, new: true });

        if (!task) {
            return res.status(404).json({ message: ERROR_MESSAGES.TASK_NOT_FOUND });
        }
        // Send email to assigned users
        const emailPromises = foundUsers.map(user => {
            const subject = `${EMAIL_SUBJECTS.TASK_UPDATED} ${title}`;
            const text = `${EMAIL_MESSAGES.TASK_UPDATED_USER} ${description}. ${EMAIL_MESSAGES.DUE_DATE} ${dueDate}`;
            return sendEmail(user?.email, subject, text);
        });

        const creator = await User.findById(req.user.id);
        const subject = `${EMAIL_SUBJECTS.TASK_UPDATED} ${title}`;
        const text = `${EMAIL_MESSAGES.TASK_UPDATED} ${description}. ${EMAIL_MESSAGES.DUE_DATE} ${dueDate}`;
        emailPromises.push(sendEmail(creator?.email, subject, text));

        res.status(200).json({ message: SUCCESS_MESSAGES.TASK_UPDATED, task });
    } catch (err) {
        res.status(500).json({ message: ERROR_MESSAGES.ERROR_UPDATING_TASK, error: err.message });
    }
});

// Delete Task
router.delete('/:id', async (req, res) => {
    try {
        // Find the task by ID
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: ERROR_MESSAGES.TASK_NOT_FOUND });
        }

        // Check if the current user is the creator of the task
        if (!task.createdBy.equals(req.user.id)) {
            return res.status(403).json({ message: ERROR_MESSAGES.UNAUTHORIZED_DELETE });
        }

        // Delete the task
        await Task.findByIdAndDelete(req.params.id);

        const assignedUsers = task.assignedUsers.map(id => id.toString());

        // Find the users assigned to the task
        const foundUsers = await User.find({ _id: { $in: assignedUsers } });
        const foundUserIds = foundUsers.map(user => user._id.toString());
        const missingUsers = assignedUsers?.filter(id => !foundUserIds.includes(id));

        // Check for any missing users
        if (missingUsers.length > 0) {
            return res.status(404).json({
                message: ERROR_MESSAGES.ASSIGNED_USERS_NOT_FOUND,
                missingUserIds: missingUsers
            });
        }

        // Prepare to send emails to assigned users
        const emailPromises = foundUsers.map(user => {
            const subject = `${EMAIL_SUBJECTS.TASK_DELETED} ${task.title}`;
            const text = `${EMAIL_MESSAGES.TASK_DELETED} ${task.description}. ${EMAIL_MESSAGES.DUE_DATE} ${task.dueDate}`;
            return sendEmail(user.email, subject, text);
        });

        // Send email to the task creator
        const creator = await User.findById(req.user.id);  // Ensure req.user.id is populated
        if (creator) {
            const creatorSubject = `${EMAIL_SUBJECTS.TASK_DELETED} ${task.title}`;
            const creatorText = `${EMAIL_MESSAGES.TASK_DELETED} ${task.description}. ${EMAIL_MESSAGES.DUE_DATE} ${task.dueDate}`;
            emailPromises.push(sendEmail(creator.email, creatorSubject, creatorText));
        }
        // Respond with success
        res.status(200).json({ message: SUCCESS_MESSAGES.TASK_DELETED });
    } catch (err) {
        res.status(500).json({ message: ERROR_MESSAGES.ERROR_DELETING_TASK, error: err.message });
    }
});


module.exports = router;
