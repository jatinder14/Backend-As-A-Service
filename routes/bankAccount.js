const express = require('express');
const BankAccount = require('../models/BankAccount');
const Lead = require('../models/Lead');
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Get all Bank Accounts
router.get('/getAll', async (req, res) => {
    try {
        const bankAccount = await BankAccount.find().populate('leadId').sort({ createdAt: -1 });
        if (!bankAccount) {
            return res.status(404).json({ message: 'No Bank account found' });
        }
        res.status(200).json(bankAccount);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching bank account', error: err.message });
    }
});

// Create Bank Account
router.post('/:leadId', async (req, res) => {
    const { leadId } = req.params;
    const { accountNumber, accountName, iban, branchName, emiratesIdFront, emiratesIdBack, passport, ejari, maintenanceKey, accessCard, parkingKey, Addendum, startDate, endDate } = req.body;

    try {
        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        const existingAccount = await BankAccount.findOne({ leadId });
        if (existingAccount) {
            return res.status(400).json({ message: 'Bank account already exists for this lead' });
        }

        const bankAccount = new BankAccount({ leadId, accountNumber, accountName, iban, branchName, emiratesIdFront, emiratesIdBack, passport, ejari, maintenanceKey, accessCard, parkingKey, Addendum, startDate, endDate });
        await bankAccount.save();
        lead.documentUploaded = true
        await lead.save();
        res.status(201).json({ message: 'Bank account created successfully', bankAccount });
    } catch (err) {
        res.status(500).json({ message: 'Error creating bank account', error: err.message });
    }
});

// Get Bank Account
router.get('/:leadId', async (req, res) => {
    const { leadId } = req.params;

    try {
        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        const bankAccount = await BankAccount.findOne({ leadId }).populate('leadId');
        if (!bankAccount) {
            return res.status(404).json({ message: 'Bank account not found for this lead' });
        }

        res.status(200).json(bankAccount);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching bank account', error: err.message });
    }
});

// Update Bank Account
router.put('/:leadId', async (req, res) => {
    const { leadId } = req.params;
    const { accountNumber, accountName, iban, branchName, emiratesIdFront, emiratesIdBack, passport, ejari, maintenanceKey, accessCard, parkingKey, Addendum, startDate, endDate } = req.body;

    try {
        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        const bankAccount = await BankAccount.findOneAndUpdate(
            { leadId },
            { accountNumber, accountName, iban, branchName, emiratesIdFront, emiratesIdBack, passport, ejari, maintenanceKey, accessCard, parkingKey, Addendum, startDate, endDate },
            { new: true, runValidators: true }
        );
        if (!bankAccount) {
            return res.status(404).json({ message: 'Bank account not found for this lead' });
        }
        res.status(200).json({ message: 'Bank account updated successfully', bankAccount });
    } catch (err) {
        res.status(500).json({ message: 'Error updating bank account', error: err.message });
    }
});

// Delete Bank Account
router.delete('/:leadId', async (req, res) => {
    const { leadId } = req.params;

    try {
        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        const bankAccount = await BankAccount.findOneAndDelete({ leadId });
        if (!bankAccount) {
            return res.status(404).json({ message: 'Bank account not found for this lead' });
        }

        lead.documentUploaded = false
        await lead.save();
        res.status(200).json({ message: 'Bank account deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting bank account', error: err.message });
    }
});

module.exports = router;
