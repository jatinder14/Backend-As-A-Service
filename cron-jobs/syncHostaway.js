const cron = require('node-cron');
const { syncListings } = require('../utils/hostaway');

syncListings();

// Schedule the task to run every 15 minutes
cron.schedule('*/15 * * * *', () => {
    console.log('Running syncListings every 15 minutes...');
    syncListings();
});
