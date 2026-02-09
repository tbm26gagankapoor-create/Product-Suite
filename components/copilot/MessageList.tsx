
import React, { useRef, useEffect } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { QuickActions } from './QuickActions';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'tool_call';
  toolData?: any;
}

interface MessageListProps {
  messages: Message[];
  isProcessing: boolean;
  onQuickAction: (query: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isProcessing,
  onQuickAction,
  messagesEndRef,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 1 && messages[0].role === 'assistant' && (
          <QuickActions onAction={onQuickAction} />
        )}

        {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-md'
                    : 'bg-white dark:bg-[#15171E] border border-gray-100 dark:border-[#1F2128] text-[#172B4D] dark:text-gray-200 rounded-bl-md'
                }`}>
                    <MarkdownRenderer content={msg.content} isUser={msg.role === 'user'} />
                </div>
            </div>
        ))}
        {isProcessing && (
            <div className="flex justify-start">
                <div className="bg-white dark:bg-[#15171E] border border-gray-100 dark:border-[#1F2128] rounded-2xl px-4 py-3 rounded-bl-md shadow-sm flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs text-gray-400">Thinking...</span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
    </div>
  );
};
