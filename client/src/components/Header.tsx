import React from 'react';
import { Menu, Plus } from 'lucide-react';

interface HeaderProps {
  title: string;
  onToggleMobileSidebar: () => void;
  onNewChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onToggleMobileSidebar,
  onNewChat,
}) => {
  return (
    <header className="chat-header">
      <div className="header-left">
        <button
          className="icon-btn mobile-menu-btn"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>
        <h2 className="header-title">{title || 'AI Assistant'}</h2>
      </div>

      <div className="header-actions">
        <button
          className="icon-btn"
          onClick={onNewChat}
          title="New Chat"
          aria-label="Start new conversation"
        >
          <Plus size={20} />
        </button>
      </div>
    </header>
  );
};
