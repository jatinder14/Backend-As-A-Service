const express = require('express');
const router = express.Router();
const { getChatSummary } = require('../utils/gemini');
const chatService = require('../services/chatService');
const { v4: uuidv4 } = require('uuid');

// Store chat conversation
router.post('/chat', async (req, res) => {
  const { sessionId, userId, userMessage, aiResponse, title, metadata } = req.body;

  if (!userMessage || !aiResponse) {
    return res.status(400).json({ error: "Both 'userMessage' and 'aiResponse' are required" });
  }

  try {
    const chat = await chatService.storeConversation(
      sessionId,
      userMessage,
      aiResponse,
      userId,
      title,
      metadata
    );

    res.json({
      success: true,
      sessionId: chat.sessionId,
      chatId: chat._id,
      messageCount: chat.messages.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get chat history
router.get('/chat/:sessionId', async (req, res) => {
  try {
    const chat = await chatService.getChatBySessionId(req.params.sessionId);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all chats for a user
router.get('/chats/user/:userId', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const chats = await chatService.getUserChats(req.params.userId, parseInt(limit), parseInt(offset));

    // Add message count to each chat
    const chatsWithCount = chats.map(chat => ({
      ...chat.toObject(),
      messageCount: chat.messages ? chat.messages.length : 0
    }));

    res.json(chatsWithCount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update chat title
router.patch('/chat/:sessionId/title', async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const chat = await chatService.updateChatTitle(req.params.sessionId, title);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({ success: true, title: chat.title });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete chat
router.delete('/chat/:sessionId', async (req, res) => {
  try {
    const chat = await chatService.deleteChat(req.params.sessionId);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({ success: true, message: 'Chat deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get chat statistics
router.get('/stats/:userId?', async (req, res) => {
  try {
    const stats = await chatService.getChatStats(req.params.userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search chats
router.get('/search', async (req, res) => {
  const { q: query, userId, limit = 20 } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const chats = await chatService.searchChats(query, userId, parseInt(limit));
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Original summarize endpoint with automatic chat storage
router.post('/', async (req, res) => {
  const { messages, sessionId, metadata } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "'messages' must be an array" });
  }

  try {
    // Get AI summary
    const summary = await getChatSummary(messages);

    // Auto-store the conversation for anonymous users
    try {
      // Generate or use provided session ID
      const chatSessionId = sessionId || uuidv4();

      // Store the complete conversation with summary
      await chatService.storeConversationFromMessages(
        chatSessionId,
        messages, // Original messages array
        summary, // AI summary
        null, // No userId for anonymous users
        {
          messageCount: messages.length,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip || req.connection.remoteAddress,
          timestamp: new Date().toISOString(),
          endpoint: 'summarize',
          ...metadata
        }
      );

      // Return response with session info
      res.json({
        summary,
        sessionId: chatSessionId,
        stored: true
      });
    } catch (storageError) {
      console.error('Error storing chat:', storageError);
      // Still return the summary even if storage fails
      res.json({
        summary,
        stored: false,
        storageError: storageError.message
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// router.use(verifyToken, adminRole);

module.exports = router;
