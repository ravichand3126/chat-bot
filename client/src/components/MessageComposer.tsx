import React, { useRef, useEffect } from 'react';
import { ArrowUp, Square } from 'lucide-react';

interface MessageComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSendMessage: () => void;
  isGenerating: boolean;
  onStopGeneration: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  input,
  setInput,
  onSendMessage,
  isGenerating,
  onStopGeneration,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating && input.trim()) {
        onSendMessage();
      }
    }
  };

  return (
    <div className="composer-container">
      <div className="composer-wrapper">
        <textarea
          ref={textareaRef}
          className="composer-textarea"
          placeholder="Ask anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        {isGenerating ? (
          <button
            className="composer-stop-btn"
            onClick={onStopGeneration}
            title="Stop generation"
            aria-label="Stop AI generation"
          >
            <Square size={16} fill="currentColor" />
          </button>
        ) : (
          <button
            className="composer-send-btn"
            onClick={onSendMessage}
            disabled={!input.trim()}
            title="Send message"
            aria-label="Send message"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
