export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  error?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface ChatStreamRequest {
  conversationId: string;
  message: string;
  model?: string;
  messagesHistory?: Message[];
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
}
