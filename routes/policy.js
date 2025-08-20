const express = require('express');
const router = express.Router();

// ✅ Terms and Conditions Route
router.get('/terms-and-conditions', (req, res) => {
  try {
    res.render('TermsAndConditions'); // views/TermsAndConditions.ejs
  } catch (error) {
    console.error('Error rendering TermsAndConditions:', error);
    res.status(500).send('Error loading Terms and Conditions page');
  }
});

// ✅ Privacy Policy Route
router.get('/privacy-policy', (req, res) => {
  try {
    res.render('PrivacyPolicy'); // views/PrivacyPolicy.ejs
  } catch (error) {
    console.error('Error rendering PrivacyPolicy:', error);
    res.status(500).send('Error loading Privacy Policy page');
  }
});

// ✅ Refund Policy Route
router.get('/refund-policy', (req, res) => {
  try {
    res.render('RefundPolicy'); // views/RefundPolicy.ejs
  } catch (error) {
    console.error('Error rendering RefundPolicy:', error);
    res.status(500).send('Error loading Refund Policy page');
  }
});

module.exports = router;
