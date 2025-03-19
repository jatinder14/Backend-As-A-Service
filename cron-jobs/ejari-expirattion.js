// const cron = require('node-cron');
// const BankAccount = require('../models/BankAccount');
// const { notifyUsers } = require('../websockets/websocket'); // Import notifyUsers
// const Lead = require('../models/Lead');

// async function ejariExpiration() {
//     try {
//         const today = new Date();

//         // Find accounts expiring within the next 7 days
//         const expiringAccounts = await BankAccount.find({
//             endDate: {
//                 $lte: new Date(today.setDate(today.getDate() + 30)),
//             },
//         });

//         for (const account of expiringAccounts) {
//             console.log(`🔔 Preparing notification for Account ID: ${account._id}`);

//             // Step 1: Find the linked lead
//             const lead = await Lead.findById(account.leadId);
//             if (!lead) {
//                 console.log(`❌ Lead not found for account ID: ${account._id}`);
//                 continue;
//             }

//             // Step 2: Get createdBy and updatedBy user IDs from the lead
//             const recipients = [];
//             if (lead.createdBy) recipients.push(lead.createdBy?.toString());
//             if (lead.updatedBy && !recipients.includes(lead.updatedBy?.toString())) {
//                 recipients.push(lead.updatedBy);
//             }

//             if (recipients.length === 0) {
//                 console.log(`❌ No recipients found for lead ID: ${lead._id}`);
//                 continue;
//             }

//             // Step 3: Send notification to all recipients
//             const data = {
//                 message: `Your Ejari will expire soon!! Please renew it.`,
//                 endDate: account.endDate,
//                 leadId: lead.id,
//                 customerName: lead.customerName,
//                 propertyLocation: lead.propertyLocation,
//             };

//             console.log(`🔔 Sending notification to users: ${recipients.join(', ')}`);
//             notifyUsers(recipients, 'Ejari Expiration', data);
//         }
//     } catch (error) {
//         console.error('❌ Error fetching expiring accounts:', error.message);
//     }
// }

// ejariExpiration()

// // Schedule the task to run every 15 minutes
// cron.schedule('* * * * * *', async () => {
//     console.log('🔔 Checking for Ejari expiration...');
//     ejariExpiration();
// });
