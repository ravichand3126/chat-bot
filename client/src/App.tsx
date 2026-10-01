import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ConversationSummary, Message, Conversation, Settings } from './types/chat';
import {
  fetchConversations,
  fetchConversationById,
  createConversation,
  updateConversationTitle,
  deleteConversation,
  streamChatCompletion,
} from './lib/api';
import {
  getLocalSettings,
  saveLocalSettings,
  getLocalConversations,
} from './lib/storage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MessageItem } from './components/MessageItem';
import { MessageComposer } from './components/MessageComposer';
import { EmptyState } from './components/EmptyState';
import { SettingsModal } from './components/SettingsModal';
import { DeleteModal } from './components/DeleteModal';
import { ArrowDown } from 'lucide-react';
import './styles/index.css';

export const App: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [settings, setSettings] = useState<Settings>(getLocalSettings);
  
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const skipFetchOnNextConvChangeRef = useRef(false);

  // Load conversations list on initial mount
  const loadConversationsList = useCallback(async () => {
    const list = await fetchConversations();
    if (list && list.length > 0) {
      setConversations(list);
    } else {
      const local = getLocalConversations();
      if (local.length > 0) {
        const summaries: ConversationSummary[] = local.map((c) => ({
          id: c.id,
          title: c.title,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          messageCount: c.messages.length,
          lastMessage: c.messages.length > 0 ? c.messages[c.messages.length - 1].content.slice(0, 60) : '',
        }));
        setConversations(summaries);
      }
    }
  }, []);

  useEffect(() => {
    loadConversationsList();
  }, [loadConversationsList]);

  // Load active conversation messages when selection changes
  useEffect(() => {
    if (!currentConversationId) {
      setCurrentMessages([]);
      return;
    }

    // Skip fetching from server if the conversation ID change was initiated by sending a new message
    if (skipFetchOnNextConvChangeRef.current) {
      skipFetchOnNextConvChangeRef.current = false;
      return;
    }

    fetchConversationById(currentConversationId).then((fullConv) => {
      if (fullConv) {
        setCurrentMessages(fullConv.messages || []);
      } else {
        const localConvs = getLocalConversations();
        const found = localConvs.find((c) => c.id === currentConversationId);
        setCurrentMessages(found?.messages || []);
      }
    });
  }, [currentConversationId]);

  // Save settings to local storage when changed
  const handleUpdateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    saveLocalSettings(newSettings);
  };

  // Auto-scroll management
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isUp = distanceFromBottom > 120;
    userScrolledUpRef.current = isUp;
    setShowScrollBottomBtn(isUp);
  };

  useEffect(() => {
    if (!userScrolledUpRef.current) {
      scrollToBottom(false);
    }
  }, [currentMessages]);

  // Start new chat
  const handleNewChat = () => {
    if (isGenerating) handleStopGeneration();
    skipFetchOnNextConvChangeRef.current = false;
    setCurrentConversationId(null);
    setCurrentMessages([]);
    setInput('');
  };

  // Select conversation from sidebar
  const handleSelectConversation = (id: string) => {
    if (isGenerating) handleStopGeneration();
    skipFetchOnNextConvChangeRef.current = false;
    setCurrentConversationId(id);
  };

  // Rename conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    await updateConversationTitle(id, newTitle);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
  };

  // Trigger Delete confirmation modal
  const openDeleteModal = (id: string) => {
    setDeletingId(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteConversation = async () => {
    if (!deletingId) return;

    await deleteConversation(deletingId);
    setConversations((prev) => prev.filter((c) => c.id !== deletingId));

    if (currentConversationId === deletingId) {
      handleNewChat();
    }
    setDeletingId(null);
  };

  // Stop Generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  // Core Send Message Logic with SSE Streaming
  const executeStream = async (
    convId: string,
    promptText: string,
    history: Message[]
  ) => {
    setIsGenerating(true);
    userScrolledUpRef.current = false;

    const userMsgId = 'msg_u_' + Date.now();
    const assistantMsgId = 'msg_a_' + Date.now();
    const now = new Date().toISOString();

    const userMessage: Message = {
      id: userMsgId,
      conversationId: convId,
      role: 'user',
      content: promptText,
      createdAt: now,
    };

    const initialAssistantMessage: Message = {
      id: assistantMsgId,
      conversationId: convId,
      role: 'assistant',
      content: '',
      createdAt: now,
    };

    const updatedMessages = [...history, userMessage, initialAssistantMessage];
    setCurrentMessages(updatedMessages);

    // Abort controller setup
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedContent = '';

    await streamChatCompletion({
      conversationId: convId,
      message: promptText,
      model: settings.selectedModel || 'gemini-3.5-flash',
      messagesHistory: history,
      signal: controller.signal,
      onToken: (token) => {
        accumulatedContent += token;
        setCurrentMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        );
      },
      onTitleUpdate: (newTitle) => {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: newTitle } : c))
        );
      },
      onDone: (fullText) => {
        setIsGenerating(false);
        abortControllerRef.current = null;
        loadConversationsList();
      },
      onError: (errorMsg) => {
        setIsGenerating(false);
        abortControllerRef.current = null;
        setCurrentMessages((prev) => {
          const exists = prev.some((m) => m.id === assistantMsgId);
          if (exists) {
            return prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: errorMsg, error: true }
                : msg
            );
          } else {
            return [
              ...prev,
              {
                id: assistantMsgId,
                conversationId: convId,
                role: 'assistant',
                content: errorMsg,
                createdAt: now,
                error: true,
              },
            ];
          }
        });
      },
    });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    const promptText = input.trim();
    setInput('');

    let convId = currentConversationId;

    if (!convId) {
      const newConv = await createConversation(promptText.slice(0, 30));
      convId = newConv.id;
      skipFetchOnNextConvChangeRef.current = true;
      setCurrentConversationId(convId);
      
      const summary: ConversationSummary = {
        id: newConv.id,
        title: newConv.title,
        createdAt: newConv.createdAt,
        updatedAt: newConv.updatedAt,
        messageCount: 0,
      };
      setConversations((prev) => [summary, ...prev]);
    }

    executeStream(convId, promptText, currentMessages);
  };

  // Regenerate Response
  const handleRegenerateResponse = () => {
    if (isGenerating || !currentConversationId || currentMessages.length === 0) return;

    let lastUserIndex = -1;
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      if (currentMessages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const promptText = currentMessages[lastUserIndex].content;
    const historyBeforePrompt = currentMessages.slice(0, lastUserIndex);

    executeStream(currentConversationId, promptText, historyBeforePrompt);
  };

  // Edit User Message
  const handleEditMessage = (newContent: string) => {
    if (isGenerating || !currentConversationId) return;

    executeStream(currentConversationId, newContent, currentMessages);
  };

  const activeConvTitle =
    conversations.find((c) => c.id === currentConversationId)?.title || 'New Chat';

  const deletingConvTitle =
    conversations.find((c) => c.id === deletingId)?.title || 'Conversation';

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={openDeleteModal}
        onOpenSettings={() => setSettingsModalOpen(true)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <main className="chat-area">
        <Header
          title={activeConvTitle}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
          onNewChat={handleNewChat}
        />

        {/* Messages or Empty State */}
        <div
          className="messages-container"
          ref={messagesContainerRef}
          onScroll={handleScroll}
        >
          {currentMessages.length === 0 ? (
            <EmptyState
              onSelectPrompt={(prompt) => {
                setInput(prompt);
              }}
            />
          ) : (
            <div className="messages-wrapper">
              {currentMessages.map((msg, index) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  isLast={index === currentMessages.length - 1}
                  isStreaming={isGenerating && index === currentMessages.length - 1}
                  onRegenerate={handleRegenerateResponse}
                  onEditMessage={
                    msg.role === 'user'
                      ? (newText) => handleEditMessage(newText)
                      : undefined
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Floating Scroll To Bottom Button */}
        {showScrollBottomBtn && (
          <button
            className="scroll-bottom-btn"
            onClick={() => scrollToBottom(true)}
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={18} />
          </button>
        )}

        {/* Message Composer */}
        <MessageComposer
          input={input}
          setInput={setInput}
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          onStopGeneration={handleStopGeneration}
        />
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onConversationsCleared={() => {
          setConversations([]);
          handleNewChat();
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDeleteConversation}
        conversationTitle={deletingConvTitle}
      />
    </div>
  );
};

export default App;
