import React, { useState } from 'react';
import { ConversationSummary } from '../types/chat';
import { Plus, Search, Settings, Trash2, Edit2, Check, X } from 'lucide-react';

interface SidebarProps {
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  onOpenSettings,
  mobileOpen,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (c: ConversationSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const submitRename = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={onCloseMobile}
      />
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-title">
            <span>AI Assistant</span>
          </div>

          <button className="new-chat-btn" onClick={() => { onNewChat(); onCloseMobile(); }}>
            <Plus size={18} />
            <span>New Chat</span>
          </button>

          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="conversation-list">
          {filteredConversations.length === 0 ? (
            <div style={{ padding: '16px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
              {searchQuery ? 'No matching conversations' : 'No conversations yet'}
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = c.id === currentConversationId;
              const isEditing = editingId === c.id;

              return (
                <div
                  key={c.id}
                  className={`conversation-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (!isEditing) {
                      onSelectConversation(c.id);
                      onCloseMobile();
                    }
                  }}
                >
                  <div className="conversation-info">
                    {isEditing ? (
                      <form
                        onSubmit={(e) => submitRename(c.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <input
                          type="text"
                          className="search-input"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          autoFocus
                          style={{ padding: '2px 6px', fontSize: 13 }}
                        />
                        <button type="submit" className="icon-btn" title="Save title">
                          <Check size={14} />
                        </button>
                        <button type="button" className="icon-btn" onClick={cancelRename} title="Cancel">
                          <X size={14} />
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="conversation-title">{c.title}</span>
                        <span className="conversation-date">
                          {new Date(c.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="conversation-actions">
                      <button
                        className="icon-btn"
                        onClick={(e) => startRename(c, e)}
                        title="Rename conversation"
                        aria-label="Rename conversation"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(c.id);
                        }}
                        title="Delete conversation"
                        aria-label="Delete conversation"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="sidebar-footer">
          <button
            className="settings-btn"
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
};
