const express = require('express');
const router = express.Router();

// ✅ Terms and Conditions Route
router.get('/terms-and-conditions', (req, res) => {
  res.render('TermsAndConditions'); // views/TermsAndConditions.ejs
});

// ✅ Privacy Policy Route
router.get('/privacy-policy', (req, res) => {
  res.render('PrivacyPolicy'); // views/PrivacyPolicy.ejs
});

// ✅ Refund Policy Route
router.get('/refund-policy', (req, res) => {
  res.render('RefundPolicy'); // views/RefundPolicy.ejs
});

module.exports = router;
