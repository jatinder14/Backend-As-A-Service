const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { notifyAdmins } = require('../websockets/websocket');
const Notification = require('../models/notification');

router.use(verifyToken);

/**
 * @route   POST 
 * @desc    Create a new notification
 */
router.post('', async (req, res) => {
    try {
        const { name, event_type, details, notify_users } = req.body;

        const notification = new Notification({
            name,
            event_type,
            details,
            notify_users,
        });

        await notification.save();
        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET 
 * @desc    Get all notifications
 */
router.get('', async (req, res) => {
    try {
        const userId = req.user.id;

        // Find notifications where userId exists in notify_users array
        const notifications = await Notification.find({ notify_users: { $in: [userId] } })
            .populate('notify_users', 'name email');

        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /:id
 * @desc    Get a single notification by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id).populate('notify_users', 'name email');
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.status(200).json(notification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   PATCH /:id
 * @desc    Update a notification (mark as seen)
 */
router.patch('/:id', async (req, res) => {
    try {
        const { is_seen } = req.body;

        const updatedNotification = await Notification.findByIdAndUpdate(
            req.params.id,
            { is_seen },
            { new: true }
        );

        if (!updatedNotification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.status(200).json(updatedNotification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   DELETE /:id
 * @desc    Delete a notification
 */
router.delete('/:id', async (req, res) => {
    try {
        const deletedNotification = await Notification.findByIdAndDelete(req.params.id);

        if (!deletedNotification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
