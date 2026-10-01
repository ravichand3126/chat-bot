import { Router, Request, Response } from 'express';
import { getGeminiClient, isGeminiConfigured, generateTitle } from '../services/gemini.js';
import { conversationStore } from '../services/conversationStore.js';
import { Message } from '../types/index.js';

const router = Router();

const VALID_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.7-flash'];

// GET /api/chat/models - List supported Gemini AI models available on this API key
router.get('/models', (_req: Request, res: Response) => {
  res.json([
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Fast, highly reliable default AI model for chat.' },
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', description: 'Ultra fast response model.' },
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'High capability Flash model.' },
    { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', description: 'Advanced Flash model.' },
  ]);
});

// POST /api/chat/stream - Stream completion via SSE using Google Gemini API
router.post('/stream', async (req: Request, res: Response) => {
  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendSSE = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let { conversationId, message, model, messagesHistory } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      sendSSE({ type: 'error', error: 'Message content cannot be empty.' });
      return res.end();
    }

    if (!conversationId) {
      sendSSE({ type: 'error', error: 'Conversation ID is required.' });
      return res.end();
    }

    // Check Gemini API Key configuration
    if (!isGeminiConfigured()) {
      sendSSE({
        type: 'error',
        error: 'Gemini API key is missing on the server. Please set GEMINI_API_KEY in server/.env file.',
      });
      return res.end();
    }

    const genAI = getGeminiClient();
    if (!genAI) {
      sendSSE({ type: 'error', error: 'Failed to initialize Google Gemini API client.' });
      return res.end();
    }

    // Validate model selection - default to gemini-3.5-flash if invalid/legacy
    if (!model || !VALID_MODELS.includes(model)) {
      model = 'gemini-3.5-flash';
    }

    // Get or create conversation in store
    let conversation = conversationStore.getById(conversationId);
    const userMsgId = 'msg_u_' + Date.now();
    const userMessage: Message = {
      id: userMsgId,
      conversationId,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };

    if (!conversation) {
      conversation = conversationStore.create();
      conversation.id = conversationId;
      conversation.messages = [userMessage];
      conversationStore.saveConversation(conversation);
    } else {
      conversationStore.addMessage(conversationId, userMessage);
    }

    // Prepare message history for Gemini chat (expects role: 'user' | 'model')
    const formattedHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    const sourceHistory = Array.isArray(messagesHistory) && messagesHistory.length > 0
      ? messagesHistory
      : conversation.messages.slice(0, -1);

    for (const msg of sourceHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        if (msg.content && msg.content.trim() !== '') {
          formattedHistory.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }
      }
    }

    // Auto-generate title if new conversation
    if (conversation.messages.length <= 2 && (conversation.title === 'New Conversation' || conversation.title === 'New Chat')) {
      generateTitle(message).then((newTitle) => {
        conversationStore.update(conversationId, { title: newTitle });
        sendSSE({ type: 'title_updated', title: newTitle });
      }).catch(() => {});
    }

    const assistantMsgId = 'msg_a_' + Date.now();
    sendSSE({ type: 'start', assistantMessageId: assistantMsgId });

    // Build ordered candidates list starting with validated model
    const candidateModels = Array.from(new Set([model, 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash']));

    let fullAssistantContent = '';
    let success = false;
    let lastError: any = null;

    for (const modelCandidate of candidateModels) {
      try {
        const generativeModel = genAI.getGenerativeModel({
          model: modelCandidate,
          systemInstruction: 'You are a highly capable, concise, and helpful AI Assistant powered by Google Gemini. Format code using markdown codeblocks. Keep responses clean, objective, and well-structured.',
        });

        const chat = generativeModel.startChat({
          history: formattedHistory,
        });

        const resultStream = await chat.sendMessageStream(message);
        
        // Consume stream to verify model works
        fullAssistantContent = '';
        for await (const chunk of resultStream.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            fullAssistantContent += chunkText;
            sendSSE({ type: 'token', content: chunkText });
          }
        }

        success = true;
        break; // Stream completed successfully
      } catch (err: any) {
        console.warn(`Model ${modelCandidate} stream failed:`, err.message);
        lastError = err;
        fullAssistantContent = ''; // Reset partial output before trying next candidate
      }
    }

    if (!success) {
      let errorMessage = lastError?.message || 'An error occurred while connecting to Google Gemini API.';
      if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('API key not valid')) {
        errorMessage = 'Invalid Gemini API key provided. Please check your GEMINI_API_KEY in server/.env.';
      }
      sendSSE({ type: 'error', error: errorMessage });
      return res.end();
    }

    // Save assistant message to store
    const assistantMessage: Message = {
      id: assistantMsgId,
      conversationId,
      role: 'assistant',
      content: fullAssistantContent,
      createdAt: new Date().toISOString(),
    };
    conversationStore.addMessage(conversationId, assistantMessage);

    // Signal completion
    sendSSE({
      type: 'done',
      conversationId,
      messageId: assistantMsgId,
      content: fullAssistantContent,
    });
    res.end();

  } catch (err: any) {
    console.error('Error in Gemini /api/chat/stream:', err);
    sendSSE({
      type: 'error',
      error: err.message || 'An error occurred while connecting to Google Gemini API.',
    });
    res.end();
  }
});

export default router;
