import React, { useEffect, useRef } from 'react';
import { Message as MessageType } from '../types';
import { Message } from './Message';

interface ChatWindowProps {
  messages: MessageType[];
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="max-w-3xl mx-auto w-full flex-1">
        <div className="space-y-6">
            {messages.map((msg) => (
                <Message key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
        </div>
    </div>
  );
};
