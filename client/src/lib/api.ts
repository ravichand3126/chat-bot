import { Conversation, ConversationSummary, ModelOption } from '../types/chat';

// Production API Base URL configuration
const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
const cleanBase = rawBase.replace(/\/+$/, '');
const API_BASE = cleanBase ? `${cleanBase}/api` : '/api';

export async function fetchConversations(): Promise<ConversationSummary[]> {
  try {
    const res = await fetch(`${API_BASE}/conversations`);
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, fallback to local storage:', err);
    return [];
  }
}

export async function fetchConversationById(id: string): Promise<Conversation | null> {
  try {
    const res = await fetch(`${API_BASE}/conversations/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable:', err);
    return null;
  }
}

export async function createConversation(title?: string): Promise<Conversation> {
  try {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    return await res.json();
  } catch {
    const now = new Date().toISOString();
    return {
      id: 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: title || 'New Conversation',
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
  }
}

export async function updateConversationTitle(id: string, title: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteConversation(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function clearAllConversations(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function checkServerHealth(): Promise<{ status: string; geminiKeyConfigured: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return { status: 'offline', geminiKeyConfigured: false };
    return await res.json();
  } catch {
    return { status: 'offline', geminiKeyConfigured: false };
  }
}

export async function fetchModels(): Promise<ModelOption[]> {
  try {
    const res = await fetch(`${API_BASE}/chat/models`);
    if (!res.ok) throw new Error('Failed to fetch models');
    return await res.json();
  } catch {
    return [
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Fast, lightweight, default Gemini model' },
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', description: 'Ultra fast response model' },
      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'High capability Flash model' },
    ];
  }
}

export interface StreamChatParams {
  conversationId: string;
  message: string;
  model: string;
  messagesHistory?: any[];
  signal?: AbortSignal;
  onStart?: (assistantMsgId: string) => void;
  onToken?: (token: string) => void;
  onTitleUpdate?: (title: string) => void;
  onDone?: (fullContent: string) => void;
  onError?: (errorMessage: string) => void;
}

export async function streamChatCompletion({
  conversationId,
  message,
  model,
  messagesHistory,
  signal,
  onStart,
  onToken,
  onTitleUpdate,
  onDone,
  onError,
}: StreamChatParams): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId,
        message,
        model,
        messagesHistory,
      }),
      signal,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Server responded with status ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body reader unavailable');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6);
        try {
          const event = JSON.parse(jsonStr);
          if (event.type === 'start') {
            if (onStart && event.assistantMessageId) {
              onStart(event.assistantMessageId);
            }
          } else if (event.type === 'token') {
            accumulatedContent += event.content;
            if (onToken) onToken(event.content);
          } else if (event.type === 'title_updated') {
            if (onTitleUpdate && event.title) onTitleUpdate(event.title);
          } else if (event.type === 'error') {
            if (onError) onError(event.error || 'Unknown error occurred.');
            return;
          } else if (event.type === 'done') {
            if (onDone) onDone(event.content || accumulatedContent);
            return;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    if (onDone) {
      onDone(accumulatedContent);
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log('Stream aborted by user.');
      return;
    }
    if (onError) {
      onError(err.message || 'Network error while streaming AI response.');
    }
  }
}
