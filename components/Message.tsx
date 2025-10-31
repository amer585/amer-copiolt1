import React from 'react';
import { Message as MessageType } from '../types';
import { BotIcon } from './icons/BotIcon';
import { UserIcon } from './icons/UserIcon';
import ReactMarkdown from 'react-markdown';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex items-start gap-4`}>
        {!isUser && (
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-popup flex items-center justify-center">
                <BotIcon />
            </div>
        )}
        <div className={`w-full`}>
            <div className={`max-w-full p-4 rounded-lg prose dark:prose-invert break-words inline-block ${
                isUser
                    ? 'bg-blue-900/50 text-white ml-auto block text-right'
                    : 'bg-brand-gray-800'
                }`}
            >
                {message.image && <img src={message.image} alt="User upload" className="max-w-xs rounded-lg mb-2" />}
                <ReactMarkdown>{message.text}</ReactMarkdown>
                {message.isStreaming && <span className="streaming-cursor"></span>}
            </div>
            {message.sources && message.sources.length > 0 && (
                 <div className="mt-2 text-xs text-gray-400">
                    <h3 className="font-bold mb-1">Sources:</h3>
                    <ul className="list-disc list-inside">
                        {message.sources.map(source => (
                            <li key={source.uri} className="truncate">
                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                    {source.title || source.uri}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
        {isUser && (
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-popup flex items-center justify-center">
                <UserIcon />
            </div>
        )}
    </div>
  );
};
