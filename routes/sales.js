const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { verifyToken } = require('../middleware/auth');
const { notifyUsers } = require('../websockets/websocket');
const Notification = require('../models/notification');

router.use(verifyToken);

router.post('/lead', async (req, res) => {
    try {
        const leadData = req.body;

        const userId = req.user?.id;

        leadData.createdBy = userId;

        const newLead = new Lead(leadData);
        await newLead.save();

        const notify_users = [...new Set([newLead.createdBy?.toString(), newLead.updatedBy?.toString(), newLead.rejectedBy?.toString()].filter(Boolean))]

        console.log(req.user);

        let notification = await Notification.create({
            name: "Lead Created",
            event_type: "LEAD_CREATED",
            details: {
                "message": `${req.user.name} has created a new lead.`,
                "leadId": newLead._id
            },
            is_seen: false,
            notify_users: notify_users
        });

        // notifyUsers(notify_users, "LEAD_CREATED", `${req.user.name} has created a new lead (Lead ID: ${newLead._id}).`);

        notifyUsers(notify_users, "LEAD_CREATED", notification);

        res.status(201).json({ message: 'Lead created successfully', lead: newLead });
    } catch (err) {
        res.status(400).json({ message: 'Error creating lead', error: err.message });
    }
});

router.get('/leads', async (req, res) => {
    try {
        console.log(req.user);
        const { page = 1, limit = 10, status } = req.query;

        let query = {};
        if (req.user.role == "sales") {
            query = { createdBy: req.user.id }; // Filter leads by the logged-in user's ID
        }

        if (req.user.role == "ceo") {
            query.status = "OM-Approval"
        }

        if (status) {
            query.status = status
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
                    ...(rejectedReason && { rejectedBy: req?.user?.id, rejectedReason }),
                }
            },
            { new: true }
        );

        if (!updatedLead) {
            return res.status(404).json({ message: 'Lead not found.' });
        }
        console.log({ ...(rejectedReason && { rejectedBy: req?.user?.id, rejectedReason }) }, [...new Set([updatedLead.createdBy?.toString(), updatedLead.updatedBy?.toString(), updatedLead.rejectedBy?.toString()].filter(Boolean))])

        const notify_users = [...new Set([updatedLead.createdBy?.toString(), updatedLead.updatedBy?.toString(), updatedLead.rejectedBy?.toString()].filter(Boolean))]

        let notification = await Notification.create({
            name: "Lead Updated",
            event_type: "LEAD_UPDATED",
            details: {
                "message": `${req.user.name} has updated the status of a lead.`,
                "leadId": updatedLead._id
            },
            is_seen: false,
            notify_users: notify_users
        });

        notifyUsers(notify_users, "LEAD_UPDATED", notification);

        res.status(200).json({
            message: 'Lead status updated successfully.',
            lead: updatedLead,
        });

    } catch (err) {
        res.status(500).json({ message: 'Error updating lead status.', error: err.message });
    }
});

router.put('/leads/:id', async (req, res) => {
    try {
        req.body.updatedBy = req.user.id;

        const updatedLead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (!updatedLead) return res.status(404).json({ message: 'Lead not found' });

        const notify_users = [...new Set([updatedLead.createdBy?.toString(), updatedLead.updatedBy?.toString(), updatedLead.rejectedBy?.toString()].filter(Boolean))]

        let notification = await Notification.create({
            name: "Lead Updated",
            event_type: "LEAD_UPDATED",
            details: {
                "message": `${req.user.name} has updated the details of a lead.`,
                "leadId": updatedLead._id
            },
            is_seen: false,
            notify_users: notify_users
        });

        notifyUsers(notify_users, "LEAD_UPDATED", notification);

        // notifyUsers(notify_users, "LEAD UPDATED", `${req.user.name} has updated the details of a lead (Lead ID: ${updatedLead._id}).`);

        // console.log([...new Set([updatedLead.createdBy?.toString(), updatedLead.updatedBy?.toString(), updatedLead.rejectedBy?.toString()].filter(Boolean))]);

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
