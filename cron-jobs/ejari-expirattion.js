// const cron = require('node-cron');
// const BankAccount = require('../models/BankAccount');
// const { notifyUsers } = require('../websockets/websocket');
// const Lead = require('../models/Lead');

// async function ejariExpiration() {
//     try {
//         const today = new Date();

//         // ➡️ Find accounts expiring within the next 30 days
//         const expiringAccounts = await BankAccount.find({
//             endDate: {
//                 $lte: new Date(today.setDate(today.getDate() + 30)), // Within next 30 days
//                 $gte: new Date(), // After today
//             },
//         });

//         // ➡️ Find accounts already expired
//         const expiredAccounts = await BankAccount.find({
//             endDate: {
//                 $lt: new Date(), // Before today
//             },
//         });

//         // 🔔 Notify about expiring Ejari
//         for (const account of expiringAccounts) {
//             console.log(`🔔 Preparing notification for expiring Account ID: ${account._id}`);

//             const lead = await Lead.findById(account.leadId);
//             if (!lead) {
//                 console.log(`❌ Lead not found for account ID: ${account._id}`);
//                 continue;
//             }

//             const recipients = [];
//             if (lead.createdBy) recipients.push(lead.createdBy.toString());
//             if (lead.updatedBy && !recipients.includes(lead.updatedBy.toString())) {
//                 recipients.push(lead.updatedBy.toString());
//             }

//             if (recipients.length === 0) {
//                 console.log(`❌ No recipients found for lead ID: ${lead._id}`);
//                 continue;
//             }

//             // Format expiration date
//             const formattedEndDate = account.endDate.toLocaleDateString('en-GB');

//             const data = {
//                 message: `Your Ejari will expire on ${formattedEndDate}!! Please renew it.`,
//                 endDate: account.endDate,
//                 leadId: lead.id,
//                 customerName: lead.customerName,
//                 propertyLocation: lead.propertyLocation,
//             };

//             console.log(`🔔 Sending expiration notification to users: ${recipients.join(', ')}`);
//             notifyUsers(recipients, 'Ejari Expiration', data);
//         }

//         // 🔥 Notify about already expired Ejari
//         for (const account of expiredAccounts) {
//             console.log(`❌ Preparing notification for expired Account ID: ${account._id}`);

//             const lead = await Lead.findById(account.leadId);
//             if (!lead) {
//                 console.log(`❌ Lead not found for account ID: ${account._id}`);
//                 continue;
//             }

//             const recipients = [];
//             if (lead.createdBy) recipients.push(lead.createdBy.toString());
//             if (lead.updatedBy && !recipients.includes(lead.updatedBy.toString())) {
//                 recipients.push(lead.updatedBy.toString());
//             }

//             if (recipients.length === 0) {
//                 console.log(`❌ No recipients found for lead ID: ${lead._id}`);
//                 continue;
//             }

//             // Format expiration date
//             const formattedEndDate = account.endDate.toLocaleDateString('en-GB');

//             const data = {
//                 message: `Your Ejari expired on ${formattedEndDate}. Please renew it immediately!`,
//                 endDate: account.endDate,
//                 leadId: lead.id,
//                 customerName: lead.customerName,
//                 propertyLocation: lead.propertyLocation,
//             };

//             console.log(`❌ Sending expired notification to users: ${recipients.join(', ')}`);
//             notifyUsers(recipients, 'Ejari Expired', data);
//         }
//     } catch (error) {
//         console.error('❌ Error fetching expiring or expired accounts:', error.message);
//     }
// }

// const now = new Date();
// let minute = now.getMinutes() + 1;
// let hour = now.getHours();

// // Handle overflow to next hour
// if (minute === 60) {
//     minute = 0;
//     hour = (hour + 1) % 24; // Keep hour in 0–23 range
// }

// const cronExpression = `${minute} ${hour} * * *`;

// console.log(`🔔 Running task at ${hour}:${minute}`, cronExpression);

// // ✅ Schedule the task for the next minute
// cron.schedule(cronExpression, () => {
//     // cron.schedule('*/6 * * * * *', async () => {        //every 6 seconds

//     console.log('🔔 Checking for Ejari expiration...');
//     ejariExpiration();
// });
