const express = require('express');
const router = express.Router();
const { getChatSummary } = require('../utils/gemini');

router.post('/', async (req, res) => {
  const messages = req.body.messages;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "'messages' must be an array" });
  }

  try {
    const summary = await getChatSummary(messages);
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// router.use(verifyToken, adminRole);

module.exports = router;
