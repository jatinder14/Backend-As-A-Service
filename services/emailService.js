const nodemailer = require('nodemailer');

// Configure the transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your email provider (e.g., Gmail)
    auth: {
        user: process.env.EMAIL, 
        pass: process.env.EMAIL_PASSWORD  
    }
});

/**
 * Sends an email.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} text - The plain text body of the email.
 */
async function sendEmail(to, subject, text) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text
    };

    try {
        // await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error.message);
    }
}

module.exports = { sendEmail };


// import * as nodemailer from 'nodemailer';
// import ejs from 'ejs';
// import fs from 'fs';

// const user = process.env.EMAIL_ADDRESS;
// const pass = process.env.EMAIL_PASSWORD;
// const site_url=process.env.SITE_URL
// const feedback_url=site_url+"/feedback"
// const profile_site_url=site_url+ "/profile"

// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: user,
//         pass: pass
//     }
// });

// // Function to send notification
// export async function sendEmail({ fromEmail, userEmails, orderIds, HTMLtemplate, userName, subject, itemName, itemQuantity, itemPrice, estimatedDelivery, items, totalPrice }) {
//     try {
//         const templatePath = new URL(`.${HTMLtemplate}`, import.meta.url).pathname;
//         const subjectPartData = subject.includes('|') ? subject.split('|')[1].trim() : subject;


//         // Read the EJS template file
//         const template = fs.readFileSync(templatePath, 'utf8');

//         // Convert userEmails and orderIds to arrays if they are strings
//         if (typeof userEmails === 'string') {
//             userEmails = [userEmails];
//         }
//         if (typeof orderIds === 'string') {
//             orderIds = [orderIds];
//         }
//         if(typeof userName === 'string'){
//             userName = [userName];

//         }

//         for (let i = 0; i < userEmails.length; i++) {
//             const userEmail = userEmails[i];
//             const orderId = orderIds[i]; 
//             const userNames= userName[i].toLowerCase().split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
//             const orderPrice = totalPrice ? parseFloat(totalPrice).toFixed(2) : undefined
//             const html = ejs.render(template, { orderId, userNames, itemName, itemQuantity, itemPrice, estimatedDelivery,profile_site_url,feedback_url, items, totalPrice: orderPrice ,subjectPartData});

//             // Email options
//             const mailOptions = {
//                 from: fromEmail ? fromEmail : user,
//                 to: userEmail,
//                 subject: subject,
//                 html: html
//             };

//             // Send email
//             await transporter.sendMail(mailOptions);
//         }

//         console.log('Emails sent successfully');
//     } catch (error) {
//         console.log('Error sending emails:', error);
//     }
// }


