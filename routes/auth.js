const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role, name: user.name, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
}

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
        const token = generateToken(user);

        res.status(201).json({ token, user });
    } catch (err) {
        res.status(500).json({ message: 'Error registering user', error: err.message });
    }
});

// Login route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user);


        user.password = undefined;

        res.status(200).json({ token, user });
    } catch (err) {
        res.status(500).json({ message: 'Login error', error: err.message });
    }
});
router.post('/refreshToken', async (req, res) => {
    const { token: oldToken } = req.body;

    try {
        const decoded = jwt.verify(oldToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const newToken = generateToken(user);
        res.status(200).json({ token: newToken, user });
    } catch (err) {
        res.status(401).json({ message: 'Token refresh failed', error: err.message });
    }
});

module.exports = router;
