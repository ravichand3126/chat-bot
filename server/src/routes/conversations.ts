import { Router, Request, Response } from 'express';
import { conversationStore } from '../services/conversationStore.js';

const router = Router();

// GET /api/conversations - List all conversations
router.get('/', (_req: Request, res: Response) => {
  try {
    const conversations = conversationStore.getAll();
    // Return lightweight summary (id, title, createdAt, updatedAt, lastMessageSnippet)
    const list = conversations.map(c => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c.messages.length,
      lastMessage: c.messages.length > 0 ? c.messages[c.messages.length - 1].content.slice(0, 60) : '',
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
});

// GET /api/conversations/:id - Get full conversation by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conversation = conversationStore.getById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// POST /api/conversations - Create a new conversation
router.post('/', (req: Request, res: Response) => {
  try {
    const { title } = req.body || {};
    const conversation = conversationStore.create(title || 'New Conversation');
    res.status(201).json(conversation);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// PATCH /api/conversations/:id - Update conversation details (e.g. title)
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (typeof title !== 'string') {
      return res.status(400).json({ error: 'Title must be a string' });
    }

    const updated = conversationStore.update(id, { title });
    if (!updated) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// DELETE /api/conversations/:id - Delete a conversation
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = conversationStore.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// DELETE /api/conversations - Clear all conversations
router.delete('/', (_req: Request, res: Response) => {
  try {
    conversationStore.deleteAll();
    res.json({ success: true, message: 'All conversations cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear conversations' });
  }
});

export default router;
