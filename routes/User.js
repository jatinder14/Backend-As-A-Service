const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(verifyToken, adminRole);

router.get('/getAllUsers', async (req, res) => {
    const { page = 1, limit = 10, role } = req.query;

    let query = {};

    if (role) {
        query.role = role;
    }

    try {
        const users = await User.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const totalUsers = await User.countDocuments();
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

router.get('/getUsersDetails', async (req, res) => {

    try {
        const users = await User.find()
            .exec();

        res.status(200).json({
            users
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching users', error: err.message });
    }
});

router.post('/createUser', async (req, res) => {
    const { name, email, password, role, position, dateOfJoining, phone, emergencyContact, address, employmentType, manager } = req.body;

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role,
            position,
            dateOfJoining,
            phone,
            emergencyContact,
            address,
            employmentType,
            manager
        });

        await user.save();

        res.status(201).json({ message: 'User created successfully', user });
    } catch (err) {
        res.status(500).json({ message: 'Error creating user', error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching user', error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { name, email, role, position, dateOfJoining, phone, emergencyContact, address, employmentType, password } = req.body;

    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update fields only if they are provided
        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;
        user.position = position || user.position;
        user.dateOfJoining = dateOfJoining || user.dateOfJoining;
        user.phone = phone || user.phone;
        user.emergencyContact = emergencyContact || user.emergencyContact;
        user.address = address || user.address;
        user.employmentType = employmentType || user.employmentType;
        user.password = password || user.password;

        await user.save();
        res.status(200).json({ message: 'User updated successfully', user });
    } catch (err) {
        res.status(500).json({ message: 'Error updating user', error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.deleteOne();
        res.status(200).json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting user', error: err.message });
    }
});

module.exports = router;
