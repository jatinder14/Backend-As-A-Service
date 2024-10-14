const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { verifyToken, adminRole } = require('../middleware/auth');
const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create a new user if not found
        const user = new User({ name, email, password, role });
        await user.save();

        // Generate JWT token
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ token, user });
    } catch (err) {
        res.status(500).json({ message: 'Error registering user', error: err.message });
    }
});

// Login route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ token, user });
    } catch (err) {
        res.status(500).json({ message: 'Login error', error: err.message });
    }
});

// Get all users (Admin-only, with pagination and Bearer token authentication)
router.get('/getAllUsers', verifyToken, adminRole, async (req, res) => {
    const { page = 1, limit = 10 } = req.query; // Default page is 1 and limit is 10

    try {
        const users = await User.find()
            .limit(limit * 1)  // Convert limit to a number
            .skip((page - 1) * limit)
            .exec();

        const totalUsers = await User.countDocuments(); // Total number of users in the database

        res.status(200).json({
            total: totalUsers,
            currentPage: page,
            totalPages: Math.ceil(totalUsers / limit),
            users
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching users', error: err.message });
    }
});

module.exports = router;
