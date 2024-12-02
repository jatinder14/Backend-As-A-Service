const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');

router.post('/lead', async (req, res) => {
    try {
        const leadData = req.body;
        const newLead = new Lead(leadData);
        await newLead.save();
        res.status(201).json({ message: 'Lead created successfully', lead: newLead });
    } catch (err) {
        res.status(400).json({ message: 'Error creating lead', error: err.message });
    }
});

router.get('/leads', async (req, res) => {
    try {
        const leads = await Lead.find();
        res.status(200).json({ leads });
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving leads', error: err.message });
    }
});

router.get('/leads/:id', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
        res.status(200).json({ lead });
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving lead', error: err.message });
    }
});

router.patch('/lead/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['New', 'Contacted', 'Converted', 'Lost'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            message: `Invalid status. Allowed statuses are: ${validStatuses.join(', ')}.`,
        });
    }

    try {
        const updatedLead = await Lead.findByIdAndUpdate(
            id,
            { $set: { status } },
            { new: true }
        );

        if (!updatedLead) {
            return res.status(404).json({ message: 'Lead not found.' });
        }

        res.status(200).json({
            message: 'Lead status updated successfully.',
            lead: updatedLead,
        });
    } catch (err) {
        res.status(500).json({ message: 'Error updating lead status.', error: err.message });
    }
});

router.patch('/leads/:id', async (req, res) => {
    try {
        const updatedLead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedLead) return res.status(404).json({ message: 'Lead not found' });
        res.status(200).json({ message: 'Lead updated successfully', lead: updatedLead });
    } catch (err) {
        res.status(400).json({ message: 'Error updating lead', error: err.message });
    }
});

router.get('/reports', async (req, res) => {
    try {
        // Example: Aggregate leads by status for a simple report
        const report = await Lead.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        res.status(200).json({
            message: 'Sales report generated successfully.',
            report,
        });
    } catch (err) {
        res.status(500).json({ message: 'Error generating sales report.', error: err.message });
    }
});

router.delete('/leads/:id', async (req, res) => {
    try {
        const deletedLead = await Lead.findByIdAndDelete(req.params.id);
        if (!deletedLead) return res.status(404).json({ message: 'Lead not found' });
        res.status(200).json({ message: 'Lead deleted successfully', lead: deletedLead });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting lead', error: err.message });
    }
});

module.exports = router;
