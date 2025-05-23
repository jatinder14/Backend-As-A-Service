const axios = require('axios');
const Property = require('../models/Property');


async function syncProperties() {
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://api.empirerealestate.ae/listings/feed/generic-json',
        headers: {}
    };

    try {
        const response = await axios.request(config);

        const properties = response.data.properties;

        if (!properties || properties.length === 0) {
            return console.log('No properties to sync.');
        }

        // Step 1: Get all referenceNumbers from API response
        const apiReferenceNumbers = properties.map(p => p.referenceNumber);

        // console.log(apiReferenceNumbers.length);

        // Step 2: Set soldout = true for all documents not in the current API list
        await Property.updateMany(
            {
                referenceNumber: { $nin: apiReferenceNumbers },
                importedFromCrm: true
            },
            {
                $set: { soldOut: true }
            }
        );

        // Store or update properties in MongoDB
        for (const property of properties) {
            property.selectedAgents = property.selectedAgents.name
            property.features = [...property?.features, ...property?.amenities]
            property.status = property.property_purpose

            // console.log(property.features);

            await Property.findOneAndUpdate(
                { referenceNumber: property.referenceNumber }, // Unique field
                property,
                { upsert: false, new: true }

            );
        }

        console.log('Properties synced successfully.');
    } catch (error) {
        console.error('Error syncing properties:', error.message);
    }
}

module.exports = { syncProperties };
