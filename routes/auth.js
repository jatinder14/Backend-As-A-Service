const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const generateToken = user => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Register a new user
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create a new user (password will be hashed by pre-save middleware)
    const user = new User({ name, email, password, role });
    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    // Remove password from response
    user.password = undefined;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user,
    });
  } catch (err) {
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => error.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: err.message,
    });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Use the static method to find user with password
    const user = await User.findByEmailWithPassword(email);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.',
      });
    }

    // Use the instance method to compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Login error',
      error: err.message,
    });
  }
});

// Refresh token route
router.post('/refreshToken', async (req, res) => {
  const { token: oldToken } = req.body;

  try {
    // Decode the token without verification first
    const decoded = jwt.decode(oldToken);
    console.log('Decoded token:', decoded);
    if (!decoded || !decoded.id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token format',
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Password was changed recently. Please login again.',
      });
    }

    const newToken = generateToken(user);

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken,
      user,
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Token refresh failed',
      error: err.message,
    });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization');
    if (!token || !token.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: err.message,
    });
  }
});

module.exports = router;
