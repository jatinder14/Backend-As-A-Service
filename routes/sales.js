const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.post('/lead', async (req, res) => {
    try {
        const leadData = req.body;

        const userId = req.user?.id; // Ensure req.user is populated through middleware
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        leadData.createdBy = userId;

        const newLead = new Lead(leadData);
        await newLead.save();
        res.status(201).json({ message: 'Lead created successfully', lead: newLead });
    } catch (err) {
        res.status(400).json({ message: 'Error creating lead', error: err.message });
    }
});

router.get('/leads', async (req, res) => {
    try {
        console.log(req.user);
        const { page = 1, limit = 10 } = req.query;

        let query = {};
        if (req.user.role == "sales") {
            query = { createdBy: req.user.id }; // Filter leads by the logged-in user's ID
        }

        if (req.user.role == "ceo") {
            query.status = "OM-Approval"
        }
        const totalLeads = await Lead.countDocuments(query);

        const leads = await Lead.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('createdBy')
            .populate('updatedBy')
            .populate('rejectedBy')

        res.status(200).json({
            totalLeads,
            currentPage: page,
            totalPages: Math.ceil(totalLeads / limit),
            leads
        });
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving leads', error: err.message });
    }
});

router.get('/leads/:id', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate('createdBy')
            .populate('updatedBy')
            .populate('rejectedBy')
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
        res.status(200).json({ lead });
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving lead', error: err.message });
    }
});

router.patch('/lead/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, rejectedReason } = req.body;

    let validStatuses = ['Pending', 'OM-Approval', 'Accepted', 'Rejected', 'Contacted', 'Converted', 'Lost'];

    if (req.user.role == "ceo") {
        validStatuses = ['Pending', 'OM-Approval', 'Accepted', 'Rejected', 'Contacted', 'Converted', 'Lost'];
    }
    else if (req.user.role == "operations_manager") {
        validStatuses = ['Pending', 'OM-Approval', 'Rejected'];
    }

    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            message: `Invalid status. Allowed statuses are: ${validStatuses.join(', ')}.`,
        });
    }

    try {
        const updatedLead = await Lead.findByIdAndUpdate(
            id,
            {
                $set: {
                    status,
                    updatedBy: req?.user?.id,
                    rejectedBy: req?.user?.id,
                    rejectedReason
                }
            },
            { new: true }
        );
        console.log(req?.user?.id)

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
        req.body.updatedBy = req.user.id;
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
