const axios = require('axios');
const dotenv = require('dotenv');
const qs = require('qs');

dotenv.config();

let accessToken = null;
let data = qs.stringify({
  grant_type: process.env.GRANT_TYPE,
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  scope: process.env.SCOPE,
});

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: `${process.env.HOSTAWAY_URL}/${process.env.VERSION}/accessTokens`,
  headers: {
    'Cache-control': 'no-cache',
    'Content-type': 'application/x-www-form-urlencoded',
  },
  data: data,
};

async function generateAuthToken() {
  try {
    const response = await axios.request(config);
    accessToken = response.data.access_token; // Store the access token
    console.log('Access Token Generated:', accessToken);
  } catch (error) {
    console.error('Error generating auth token:', error.message, process.env.GRANT_TYPE);
  }
}

async function getAccessToken() {
  if (!accessToken) {
    await generateAuthToken(); // Generate token if it doesn't exist
  }
  return accessToken;
}

module.exports = { generateAuthToken, getAccessToken };
