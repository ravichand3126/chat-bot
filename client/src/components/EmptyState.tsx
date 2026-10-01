import React from 'react';
import { MessageSquare, Code, Sparkles, HelpCircle } from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (promptText: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectPrompt }) => {
  const suggestions = [
    {
      icon: <MessageSquare size={16} />,
      title: 'Brainstorm concepts',
      desc: 'Formulate ideas for a new web project or architectural approach',
      prompt: 'Help me brainstorm ideas for a high-performance minimalist web application.',
    },
    {
      icon: <Code size={16} />,
      title: 'Write code & scripts',
      desc: 'Generate clean, maintainable functions or resolve complex logic',
      prompt: 'Write a TypeScript function to parse and validate JSON streaming chunks.',
    },
    {
      icon: <Sparkles size={16} />,
      title: 'Summarize & analyze',
      desc: 'Refine text, edit technical articles, or structure information',
      prompt: 'Explain the core principles of clean REST API design with streaming capabilities.',
    },
    {
      icon: <HelpCircle size={16} />,
      title: 'Ask technical questions',
      desc: 'Get direct, detailed answers to technical problems',
      prompt: 'What are the main advantages of Server-Sent Events over WebSockets for LLM chat apps?',
    },
  ];

  return (
    <div className="empty-state">
      <h1 className="empty-title">AI Assistant</h1>
      <p className="empty-subtitle">How can I help you today?</p>

      <div className="prompt-suggestions">
        {suggestions.map((item, index) => (
          <button
            key={index}
            className="suggestion-card"
            onClick={() => onSelectPrompt(item.prompt)}
          >
            <div className="suggestion-title">{item.title}</div>
            <div className="suggestion-desc">{item.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
