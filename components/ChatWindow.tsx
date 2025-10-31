import React, { useEffect, useRef } from 'react';
import type { Message as MessageType } from '../types';
import { Message } from './Message';

interface ChatWindowProps {
  messages: MessageType[];
  isLoading: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {messages.map((msg, index) => (
        <Message key={msg.id + '-' + index} message={msg} />
      ))}
      {isLoading && (
        <div className="flex justify-start items-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      )}
      <div ref={endOfMessagesRef} />
    </div>
  );
};