const Chat = require('../models/Chat');
const { v4: uuidv4 } = require('uuid');

class ChatService {
    /**
     * Create a new chat session
     */
    async createChatSession(userId = null, title = 'New Chat', metadata = {}) {
        const sessionId = uuidv4();

        const chat = new Chat({
            sessionId,
            userId,
            title,
            messages: [],
            metadata
        });

        await chat.save();
        return chat;
    }

    /**
     * Add messages to an existing chat session
     */
    async addMessages(sessionId, messages) {
        const chat = await Chat.findOne({ sessionId });

        if (!chat) {
            throw new Error('Chat session not found');
        }

        // Ensure messages is an array
        const messagesToAdd = Array.isArray(messages) ? messages : [messages];

        // Add timestamp to each message if not present
        const timestampedMessages = messagesToAdd.map(msg => ({
            ...msg,
            timestamp: msg.timestamp || new Date()
        }));

        chat.messages.push(...timestampedMessages);
        await chat.save();

        return chat;
    }

    /**
     * Store a complete conversation (user message + AI response)
     */
    async storeConversation(sessionId, userMessage, aiResponse, userId = null, title = null, metadata = {}) {
        let chat = await Chat.findOne({ sessionId });

        // Create new chat if doesn't exist
        if (!chat) {
            chat = await this.createChatSession(userId, title || 'New Chat', metadata);
            chat.sessionId = sessionId; // Ensure we use the provided sessionId
            await chat.save();
        }

        // Add both messages
        const messages = [
            {
                role: 'user',
                content: userMessage,
                timestamp: new Date()
            },
            {
                role: 'ai',
                content: aiResponse,
                timestamp: new Date()
            }
        ];

        chat.messages.push(...messages);
        
        // Update metadata if provided
        if (Object.keys(metadata).length > 0) {
            chat.metadata = { ...chat.metadata, ...metadata };
        }
        
        await chat.save();
        return chat;
    }

    /**
     * Store conversation from message array (for summarize endpoint)
     */
    async storeConversationFromMessages(sessionId, messages, summary, userId = null, metadata = {}) {
        let chat = await Chat.findOne({ sessionId });
        
        // Create new chat if doesn't exist
        if (!chat) {
            // Generate title from first user message
            const firstUserMessage = messages.find(msg => msg.role === 'user');
            const title = firstUserMessage ? 
                firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '') :
                'Chat Summary';
                
            chat = new Chat({
                sessionId,
                userId: userId || null,
                title,
                messages: [],
                summary,
                metadata
            });
        }

        // Add all messages with timestamps
        const timestampedMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date()
        }));

        // Add the summary as the final AI message
        timestampedMessages.push({
            role: 'ai',
            content: `Summary: ${summary}`,
            timestamp: new Date()
        });

        chat.messages.push(...timestampedMessages);
        chat.summary = summary;
        
        // Update metadata
        chat.metadata = { ...chat.metadata, ...metadata };
        
        await chat.save();
        return chat;
    }

    /**
     * Get chat by session ID
     */
    async getChatBySessionId(sessionId) {
        return await Chat.findOne({ sessionId });
    }

    /**
     * Get all chats for a user
     */
    async getUserChats(userId, limit = 50, offset = 0) {
        return await Chat.find({ userId })
            .sort({ updatedAt: -1 })
            .limit(limit)
            .skip(offset)
            .select('sessionId title updatedAt messages summary');
    }

    /**
     * Update chat title
     */
    async updateChatTitle(sessionId, title) {
        return await Chat.findOneAndUpdate(
            { sessionId },
            { title },
            { new: true }
        );
    }

    /**
     * Update chat summary
     */
    async updateChatSummary(sessionId, summary) {
        return await Chat.findOneAndUpdate(
            { sessionId },
            { summary },
            { new: true }
        );
    }

    /**
     * Delete chat
     */
    async deleteChat(sessionId) {
        return await Chat.findOneAndDelete({ sessionId });
    }

    /**
     * Get chat statistics
     */
    async getChatStats(userId = null) {
        const matchStage = userId ? { userId } : {};

        const stats = await Chat.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalChats: { $sum: 1 },
                    totalMessages: { $sum: { $size: '$messages' } },
                    avgMessagesPerChat: { $avg: { $size: '$messages' } }
                }
            }
        ]);

        return stats[0] || { totalChats: 0, totalMessages: 0, avgMessagesPerChat: 0 };
    }

    /**
     * Search chats by content
     */
    async searchChats(query, userId = null, limit = 20) {
        const matchStage = {
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { 'messages.content': { $regex: query, $options: 'i' } }
            ]
        };

        if (userId) {
            matchStage.userId = userId;
        }

        return await Chat.find(matchStage)
            .sort({ updatedAt: -1 })
            .limit(limit)
            .select('sessionId title updatedAt messages summary');
    }
}

module.exports = new ChatService();