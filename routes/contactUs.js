const express = require('express');
const Contact = require('../models/contactModel');
const router = express.Router();
const nodemailer = require('nodemailer');

// Send Email Function
const sendEmail = (contact) => {
    const transporter = nodemailer.createTransport({
        service: 'Gmail', // You can use other services like SendGrid, etc.
        auth: {
            user: process.env.EMAIL, // Your email address
            pass: process.env.EMAIL_PASSWORD, // Your email password or app password
        },
    });

    const mailOptions = {
        from: process.env.EMAIL,
        to: contact.email,
        subject: `Thankyou ${contact.fullName}! for reaching us.`,
        text: `
            Full Name: ${contact.fullName}
            Phone: ${contact.phone}
            Email: ${contact.email}
            Subject: ${contact.subject}
            Message: ${contact.message}
        `,
    };

    // console.log("----jatin", mailOptions);

    return transporter.sendMail(mailOptions);
};

router.post('/', async (req, res) => {
    const { fullName, phone, email, subject, message } = req.body;

    const newContact = new Contact({ fullName, phone, email, subject, message });

    try {
        await newContact.save();
        // await sendEmail(newContact);
        res.status(200).json({ message: 'Message sent successfully', newContact });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const query = {};

        // if (category) {
        //     query.category = { $regex: category, $options: 'i' };
        // }

        const totalContacts = await Contact.countDocuments(query);
        const contacts = await Contact.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        res.json({
            totalContacts,
            currentPage: page,
            totalPages: Math.ceil(totalContacts / limit),
            products: contacts
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);
        if (!contact) return res.status(404).json({ message: 'contact not found' });

        res.status(200).json(contact);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!contact) return res.status(404).json({ message: 'Contact not found' });
        res.status(200).json(contact);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const contact = await Contact.findByIdAndDelete(req.params.id);
        if (!contact) return res.status(404).json({ message: 'Contact not found' });
        res.status(200).json({ message: 'Contact deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;
