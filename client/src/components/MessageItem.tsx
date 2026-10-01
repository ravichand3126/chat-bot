import React, { useState } from 'react';
import { Message } from '../types/chat';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Copy, Check, RefreshCw, Edit2, AlertTriangle } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  isLast: boolean;
  isStreaming: boolean;
  onRegenerate?: () => void;
  onEditMessage?: (newContent: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isLast,
  isStreaming,
  onRegenerate,
  onEditMessage,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && onEditMessage) {
      onEditMessage(editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  return (
    <div className={`message-item ${isUser ? 'user-message' : 'ai-message'}`}>
      <div className={`avatar ${isUser ? 'user' : 'ai'}`}>
        {isUser ? 'YOU' : 'AI'}
      </div>

      <div className="message-body">
        <div className="message-header">
          <span className="message-sender">{isUser ? 'You' : 'AI Assistant'}</span>
          <span className="message-time">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {isEditing ? (
          <div>
            <textarea
              className="edit-textarea"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
            <div className="edit-actions">
              <button className="btn-sm btn-outline" onClick={handleCancelEdit}>
                Cancel
              </button>
              <button className="btn-sm btn-primary" onClick={handleSaveEdit}>
                Save & Resubmit
              </button>
            </div>
          </div>
        ) : (
          <div className="message-content">
            {message.error ? (
              <div className="status-badge" style={{ marginTop: 4 }}>
                <AlertTriangle size={14} />
                <span>{message.content}</span>
              </div>
            ) : isUser ? (
              <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
            ) : (
              <>
                <MarkdownRenderer content={message.content} />
                {isStreaming && isLast && (
                  <div className="typing-indicator" aria-label="AI is generating response">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!isEditing && !message.error && (
          <div className="message-toolbar">
            <button
              className="icon-btn"
              onClick={handleCopy}
              title="Copy response"
              aria-label="Copy response text"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>

            {isUser && onEditMessage && !isStreaming && (
              <button
                className="icon-btn"
                onClick={() => setIsEditing(true)}
                title="Edit message"
                aria-label="Edit message"
              >
                <Edit2 size={14} />
              </button>
            )}

            {!isUser && isLast && onRegenerate && !isStreaming && (
              <button
                className="icon-btn"
                onClick={onRegenerate}
                title="Regenerate response"
                aria-label="Regenerate response"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
