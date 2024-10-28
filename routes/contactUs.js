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
    console.log("----jatin",mailOptions);

    return transporter.sendMail(mailOptions);
};

router.post('/', async (req, res) => {
    const { fullName, phone, email, subject, message } = req.body;

    const newContact = new Contact({ fullName, phone, email, subject, message });

    try {
        await newContact.save();
        await sendEmail(newContact);
        res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



module.exports = router;
