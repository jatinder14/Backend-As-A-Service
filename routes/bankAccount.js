const express = require('express');
const BankAccount = require('../models/BankAccount');
const Lead = require('../models/Lead');
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');
const { notifyOMs } = require('../websockets/websocket');
const Notification = require('../models/notification');

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

        if (lead?.status != 'Accepted') {
            return res.status(404).json({ message: 'Lead is not accepted yet!' });
        }


        const existingAccount = await BankAccount.findOne({ leadId });
        if (existingAccount) {
            return res.status(400).json({ message: 'Bank account already exists for this lead' });
        }

        if (lead?.createdAt != req.user.id) {
            return res.status(403).json({ message: 'Only the sales manager of the lead can upload the documents.' });
        }

        const bankAccount = new BankAccount({ leadId, accountNumber, accountName, iban, branchName, emiratesIdFront, emiratesIdBack, passport, ejari, maintenanceKey, accessCard, parkingKey, Addendum, startDate, endDate });
        await bankAccount.save();
        lead.documentUploaded = true
        lead.status = "Documents-Added"
        await lead.save();

        let notification = await Notification.create({
            name: "Documents Added",
            event_type: "DOCUMENTS_ADDED",
            details: {
                "message": `${req.user.name} has Added the documents for the lead.`,
                "leadId": lead._id,
                "bankAccountId": bankAccount._id
            },
            is_seen: false,
            // notify_users: notify_users
        });

        notifyOMs("DOCUMENTS_ADDED", notification);

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

        if (lead?.createdBy != req.user.id) {
            return res.status(403).json({ message: 'Only the sales manager or the person who has created the lead can update the documents.' });
        }

        const bankAccount = await BankAccount.findOne({ leadId: req.params.leadId });

        if (!bankAccount) {
            return res.status(404).json({ message: 'Bank account not found for this lead' });
        }


        // Update the fields
        bankAccount.accountNumber = req.body.accountNumber || bankAccount.accountNumber;
        bankAccount.accountName = req.body.accountName || bankAccount.accountName;
        bankAccount.iban = req.body.iban || bankAccount.iban;
        bankAccount.branchName = req.body.branchName || bankAccount.branchName;
        bankAccount.startDate = req.body.startDate || bankAccount.startDate;
        bankAccount.endDate = req.body.endDate || bankAccount.endDate;
        bankAccount.emiratesIdFront = req.body.emiratesIdFront || bankAccount.emiratesIdFront;
        bankAccount.emiratesIdBack = req.body.emiratesIdBack || bankAccount.emiratesIdBack;
        bankAccount.passport = req.body.passport || bankAccount.passport;
        bankAccount.ejari = req.body.ejari || bankAccount.ejari;
        bankAccount.Addendum = req.body.Addendum || bankAccount.Addendum;
        bankAccount.maintenanceKey = req.body.maintenanceKey ?? bankAccount.maintenanceKey;
        bankAccount.accessCard = req.body.accessCard ?? bankAccount.accessCard;
        bankAccount.parkingKey = req.body.parkingKey ?? bankAccount.parkingKey;

        // Validate endDate again before saving
        if (bankAccount.endDate < bankAccount.startDate) {
            return res.status(400).json({ error: "End date must be greater than or equal to start date" });
        }

        // Save the updated document
        await bankAccount.save();

        let message = ''

        if (ejari) {
            lead.EjariUploaded = true
            lead.status = 'Ejari-Uploaded'
            message = `${req.user.name} has uploaded the singing tenancy contract.`
            await lead.save();
        }

        let notification = await Notification.create({
            name: "Documents Updated",
            event_type: "DOCUMENTS_UPDATED",
            details: {
                "message": message || `${req.user.name} has updated the documents for the lead.`,
                "leadId": lead._id,
                "bankAccountId": bankAccount._id
            },
            is_seen: false,
            // notify_users: notify_users
        });

        notifyOMs("DOCUMENTS_UPDATED", notification);

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
        lead.EjariUploaded = false
        await lead.save();
        res.status(200).json({ message: 'Bank account deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting bank account', error: err.message });
    }
});

module.exports = router;
