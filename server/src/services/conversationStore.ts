import fs from 'node:fs';
import path from 'node:path';
import { Conversation, Message } from '../types/index.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'conversations.json');

class ConversationStore {
  private conversations: Map<string, Conversation> = new Map();

  constructor() {
    this.ensureDataDir();
    this.loadData();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): void {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const data: Conversation[] = JSON.parse(raw);
        this.conversations.clear();
        for (const item of data) {
          this.conversations.set(item.id, item);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations from storage:', err);
    }
  }

  private saveData(): void {
    try {
      const data = Array.from(this.conversations.values());
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save conversations to storage:', err);
    }
  }

  public getAll(): Conversation[] {
    return Array.from(this.conversations.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public getById(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  public create(title = 'New Conversation'): Conversation {
    const now = new Date().toISOString();
    const newConv: Conversation = {
      id: 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    this.conversations.set(newConv.id, newConv);
    this.saveData();
    return newConv;
  }

  public update(id: string, updateData: Partial<Pick<Conversation, 'title'>>): Conversation | null {
    const conv = this.conversations.get(id);
    if (!conv) return null;

    if (updateData.title !== undefined) {
      conv.title = updateData.title.trim() || 'Untitled Conversation';
    }
    conv.updatedAt = new Date().toISOString();
    this.conversations.set(id, conv);
    this.saveData();
    return conv;
  }

  public delete(id: string): boolean {
    const existed = this.conversations.delete(id);
    if (existed) {
      this.saveData();
    }
    return existed;
  }

  public deleteAll(): void {
    this.conversations.clear();
    this.saveData();
  }

  public addMessage(conversationId: string, message: Omit<Message, 'conversationId'>): Conversation | null {
    let conv = this.conversations.get(conversationId);
    const now = new Date().toISOString();

    if (!conv) {
      conv = {
        id: conversationId,
        title: message.role === 'user' ? (message.content.slice(0, 30) || 'New Conversation') : 'New Conversation',
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
    }

    const fullMessage: Message = {
      ...message,
      conversationId,
    };

    conv.messages.push(fullMessage);
    conv.updatedAt = now;

    // Auto update title if default and this is first user message
    if ((conv.title === 'New Conversation' || conv.title === 'New Chat') && message.role === 'user') {
      conv.title = message.content.slice(0, 35).trim() || 'New Conversation';
    }

    this.conversations.set(conversationId, conv);
    this.saveData();
    return conv;
  }

  public saveConversation(conv: Conversation): void {
    conv.updatedAt = new Date().toISOString();
    this.conversations.set(conv.id, conv);
    this.saveData();
  }
}

export const conversationStore = new ConversationStore();
