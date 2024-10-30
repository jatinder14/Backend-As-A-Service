const express = require('express');
const BankAccount = require('../models/BankAccount');
const User = require('../models/User');
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Get all Bank Accounts
router.get('/getAll', async (req, res) => {
    try {
        const bankAccount = await BankAccount.find().populate('employeeId').sort({ createdAt: -1 });
        if (!bankAccount) {
            return res.status(404).json({ message: 'No Bank account found' });
        }
        res.status(200).json(bankAccount);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching bank account', error: err.message });
    }
});

// Create Bank Account
router.post('/:employeeId', async (req, res) => {
    const { employeeId } = req.params;
    const { accountNumber, bankName, ifscCode, branchName } = req.body;

    try {
        const user = await User.findById(employeeId);
        if (!user) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const existingAccount = await BankAccount.findOne({ employeeId });
        if (existingAccount) {
            return res.status(400).json({ message: 'Bank account already exists for this employee' });
        }

        const bankAccount = new BankAccount({ employeeId, accountNumber, bankName, ifscCode, branchName });
        await bankAccount.save();
        res.status(201).json({ message: 'Bank account created successfully', bankAccount });
    } catch (err) {
        res.status(500).json({ message: 'Error creating bank account', error: err.message });
    }
});

// Get Bank Account
router.get('/:employeeId', async (req, res) => {
    const { employeeId } = req.params;

    try {
        const user = await User.findById(employeeId);
        if (!user) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        const bankAccount = await BankAccount.findOne({ employeeId }).populate('employeeId');
        if (!bankAccount) {
            return res.status(404).json({ message: 'Bank account not found for this employee' });
        }
        res.status(200).json(bankAccount);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching bank account', error: err.message });
    }
});

// Update Bank Account
router.put('/:employeeId', async (req, res) => {
    const { employeeId } = req.params;
    const { accountNumber, bankName, ifscCode, branchName } = req.body;

    try {
        const user = await User.findById(employeeId);
        if (!user) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        const bankAccount = await BankAccount.findOneAndUpdate(
            { employeeId },
            { accountNumber, bankName, ifscCode, branchName },
            { new: true, runValidators: true }
        );
        if (!bankAccount) {
            return res.status(404).json({ message: 'Bank account not found for this employee' });
        }
        res.status(200).json({ message: 'Bank account updated successfully', bankAccount });
    } catch (err) {
        res.status(500).json({ message: 'Error updating bank account', error: err.message });
    }
});

// Delete Bank Account
router.delete('/:employeeId', async (req, res) => {
    const { employeeId } = req.params;

    try {
        const bankAccount = await BankAccount.findOneAndDelete({ employeeId });
        if (!bankAccount) {
            return res.status(404).json({ message: 'Bank account not found for this employee' });
        }
        res.status(200).json({ message: 'Bank account deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting bank account', error: err.message });
    }
});

module.exports = router;
