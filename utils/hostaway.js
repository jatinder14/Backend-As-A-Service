const axios = require('axios');
const Listing = require('../models/hostway-listing');
const { getAccessToken } = require('../services/authService');

async function syncListings() {
    const token = await getAccessToken();
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${process.env.HOSTAWAY_URL}/${process.env.VERSION}/listings?limit=&offset=&sortOrder=&city=&match=&country=&contactName=&propertyTypeId=`,
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Cache-control': 'no-cache'
        }
      };

    if (!token) {
        console.log('No valid token found. Skipping sync.',token);
        return;
    }

    try {
        const response = await axios.request(config);

        const listings = response.data.result;

        if (!listings || listings.length === 0) {
            return console.log('No listings to sync.');
        }

        // Store or update listings in MongoDB
        for (const listing of listings) {
            await Listing.findOneAndUpdate(
                { listingId: listing.id }, // Unique field
                listing,
                { upsert: true }
            );
        }

        console.log('Listings synced successfully.');
    } catch (error) {
        console.error('Error syncing listings:', error.message);
    }
}

module.exports = { syncListings };
