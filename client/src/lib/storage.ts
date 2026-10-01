import { Conversation, Settings } from '../types/chat';

const STORAGE_CONVERSATIONS_KEY = 'monochrome_ai_conversations_v1';
const STORAGE_SETTINGS_KEY = 'monochrome_ai_settings_v1';

export const defaultSettings: Settings = {
  selectedModel: 'gemini-3.5-flash',
};

export const getLocalSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : defaultSettings;
  } catch {
    return defaultSettings;
  }
};

export const saveLocalSettings = (settings: Settings): void => {
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save local settings:', err);
  }
};

export const getLocalConversations = (): Conversation[] => {
  try {
    const raw = localStorage.getItem(STORAGE_CONVERSATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalConversations = (conversations: Conversation[]): void => {
  try {
    localStorage.setItem(STORAGE_CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch (err) {
    console.error('Failed to save local conversations:', err);
  }
};
