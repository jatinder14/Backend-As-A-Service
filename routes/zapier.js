const { default: axios } = require('axios');
const express = require('express');
const router = express.Router();

// Zapier Webhook URLs
const ZAPIER_URLS = {
    downloadBrochure: "https://hooks.zapier.com/hooks/catch/21228883/2a0qgjk/",
    contactUs: "https://hooks.zapier.com/hooks/catch/21228883/2a00a0q/"
};

// API to Download Brochure
router.post("/download-brochure", async (req, res) => {
    try {
        const response = await axios.post(ZAPIER_URLS.downloadBrochure, req.body);
        res.status(200).json({ message: "Brochure Request Sent", data: response.data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API to Contact Us
router.post("/contact-us", async (req, res) => {
    try {
        const response = await axios.post(ZAPIER_URLS.contactUs, req.body);
        res.status(200).json({ message: "Contact Request Sent", data: response.data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

module.exports = router;
