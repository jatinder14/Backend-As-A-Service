const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(verifyToken, adminRole);

router.get('/getAllUsers', async (req, res) => {
    const { page = 1, limit = 10, role, isActive } = req.query;

    let query = {};

    if (role) {
        query.role = role;
    }

    if (isActive !== undefined) {
        query.isActive = isActive === 'true';
    }

    try {
        const users = await User.find(query)
            .select('-password')
            .populate('manager', 'name email role')
            .populate('currentSubscription', 'name price duration')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 })
            .exec();

        const totalUsers = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            total: totalUsers,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalUsers / limit),
            users
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: err.message
        });
    }
});

router.get('/getUsersDetails', async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .populate('manager', 'name email role')
            .populate('currentSubscription', 'name price duration')
            .sort({ createdAt: -1 })
            .exec();

        res.status(200).json({
            success: true,
            users
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: err.message
        });
    }
});

router.post('/createUser', async (req, res) => {
    const {
        name,
        email,
        password,
        role,
        position,
        dateOfJoining,
        phone,
        emergencyContact,
        address,
        employmentType,
        manager,
        customerType,
        companyName,
        billingAddress
    } = req.body;

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create a new user (password will be hashed by pre-save middleware)
        const user = new User({
            name,
            email,
            password,
            role,
            position,
            dateOfJoining,
            phone,
            emergencyContact,
            address,
            employmentType,
            manager,
            customerType,
            companyName,
            billingAddress
        });

        await user.save();

        // Remove password from response
        user.password = undefined;

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user
        });
    } catch (err) {
        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(error => error.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating user',
            error: err.message
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('manager', 'name email role')
            .populate('currentSubscription', 'name price duration');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: err.message
        });
    }
});

router.put('/:id', async (req, res) => {
    const {
        name,
        email,
        role,
        position,
        dateOfJoining,
        phone,
        emergencyContact,
        address,
        employmentType,
        password,
        customerType,
        companyName,
        billingAddress,
        isActive
    } = req.body;

    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if email is being changed and if it already exists
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }
        }

        // Update fields only if they are provided
        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;
        if (role !== undefined) user.role = role;
        if (position !== undefined) user.position = position;
        if (dateOfJoining !== undefined) user.dateOfJoining = dateOfJoining;
        if (phone !== undefined) user.phone = phone;
        if (emergencyContact !== undefined) user.emergencyContact = emergencyContact;
        if (address !== undefined) user.address = address;
        if (employmentType !== undefined) user.employmentType = employmentType;
        if (password !== undefined) user.password = password;
        if (customerType !== undefined) user.customerType = customerType;
        if (companyName !== undefined) user.companyName = companyName;
        if (billingAddress !== undefined) user.billingAddress = billingAddress;
        if (isActive !== undefined) user.isActive = isActive;

        await user.save();

        // Remove password from response
        user.password = undefined;

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            user
        });
    } catch (err) {
        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(error => error.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating user',
            error: err.message
        });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Soft delete by setting isActive to false
        user.isActive = false;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'User deactivated successfully'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error deactivating user',
            error: err.message
        });
    }
});

// Route to reactivate a user
router.patch('/:id/reactivate', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.isActive = true;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'User reactivated successfully'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error reactivating user',
            error: err.message
        });
    }
});

module.exports = router;
