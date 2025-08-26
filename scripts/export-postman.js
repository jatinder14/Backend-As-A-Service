#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;
const COLLECTION_ID = process.env.POSTMAN_COLLECTION_ID;
const OUTPUT_DIR = path.join(__dirname, '..', 'docs');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'api-collection.json');

if (!POSTMAN_API_KEY) {
  console.error('❌ POSTMAN_API_KEY environment variable is required');
  process.exit(1);
}

if (!COLLECTION_ID) {
  console.error('❌ POSTMAN_COLLECTION_ID environment variable is required');
  process.exit(1);
}

// Ensure docs directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Export collection from Postman API
function exportCollection() {
  const options = {
    hostname: 'api.getpostman.com',
    port: 443,
    path: `/collections/${COLLECTION_ID}`,
    method: 'GET',
    headers: {
      'X-API-Key': POSTMAN_API_KEY,
      'Content-Type': 'application/json',
    },
  };

  console.log('🚀 Exporting Postman collection...');

  const req = https.request(options, res => {
    let data = '';

    res.on('data', chunk => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const collection = JSON.parse(data);

          // Write formatted JSON to file
          fs.writeFileSync(OUTPUT_FILE, JSON.stringify(collection, null, 2));

          console.log('✅ Postman collection exported successfully!');
          console.log(`📁 Saved to: ${OUTPUT_FILE}`);

          // Add timestamp to collection info
          const timestamp = new Date().toISOString();
          console.log(`🕒 Last updated: ${timestamp}`);
        } catch (error) {
          console.error('❌ Error parsing collection data:', error.message);
          process.exit(1);
        }
      } else {
        console.error(`❌ API request failed with status ${res.statusCode}`);
        console.error('Response:', data);
        process.exit(1);
      }
    });
  });

  req.on('error', error => {
    console.error('❌ Request error:', error.message);
    process.exit(1);
  });

  req.end();
}

exportCollection();
