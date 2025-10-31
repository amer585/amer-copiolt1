import React, { useState, useEffect } from 'react';
import { Message as MessageType, ModelType } from '../types';
import { GeminiIcon } from './icons/GeminiIcon';
import { UserIcon } from './icons/UserIcon';
import ReactMarkdown from 'react-markdown';

const getModelDisplayName = (model: ModelType) => {
    if (model === 'pro') return 'Gemini 2.5 Pro';
    if (model === 'pro-extreme') return 'Gemini Extreme';
    return 'Gemini 2.5 Flash';
}

const ChevronDownIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const MessageHeader: React.FC<{ message: MessageType }> = ({ message }) => {
    const [elapsed, setElapsed] = useState(() => {
        if (message.startTime) {
            const end = message.endTime || Date.now();
            return Math.floor((end - message.startTime) / 1000);
        }
        return 0;
    });

    useEffect(() => {
        if (message.isStreaming && message.startTime) {
            const interval = setInterval(() => {
                setElapsed(Math.floor((Date.now() - message.startTime!) / 1000));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [message.isStreaming, message.startTime]);
    
    const durationText = message.isStreaming ? `Running for ${elapsed}s` : `Ran for ${elapsed}s`;

    return (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {getModelDisplayName(message.model!)} • {durationText}
        </div>
    );
};

const ProMessageThoughtPanel: React.FC<{ message: MessageType }> = ({ message }) => {
    const totalDuration = (message.endTime && message.startTime)
        ? Math.floor((message.endTime - message.startTime) / 1000)
        : 0;

    const summaryContent = message.isStreaming ? (
        <div className="flex items-center gap-2 font-medium">
            <div className="w-4 h-4 border-2 border-gray-400/50 dark:border-gray-500/50 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin"></div>
            <span>Thinking...</span>
        </div>
    ) : (
        <span className="font-medium">{`Thought for ${totalDuration} seconds`}</span>
    );

    return (
        <details className="bg-brand-gray-200 dark:bg-brand-gray-800 rounded-lg overflow-hidden">
            <summary className="p-3 flex items-center justify-between cursor-pointer select-none">
                {summaryContent}
                <div className="chevron-icon text-gray-500 dark:text-gray-400">
                    <ChevronDownIcon />
                </div>
            </summary>
            {/* No content is rendered inside, effectively hiding the chain of thought */}
        </details>
    );
};

const StandardMessageContent: React.FC<{ message: MessageType }> = ({ message }) => (
    <div className={`p-4 rounded-2xl prose dark:prose-invert break-words bg-brand-gray-200 dark:bg-brand-gray-800 rounded-bl-none`}>
        {message.image && <img src={message.image} alt="Generated content" className="max-w-xs rounded-lg mb-2" />}
        <ReactMarkdown>{message.text}</ReactMarkdown>
        {message.isStreaming && <span className="streaming-cursor"></span>}
    </div>
);


export const Message: React.FC<{ message: MessageType }> = ({ message }) => {
  const isUser = message.sender === 'user';
  const isProModel = message.model === 'pro' || message.model === 'pro-extreme';

  if (isUser) {
    return (
      <div className="flex items-start gap-4 max-w-full flex-row-reverse">
          <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-brand-gray-300 dark:bg-brand-popup">
              <UserIcon />
          </div>
          <div className="flex flex-col max-w-[85%] md:max-w-[80%] items-end">
              <div className="p-4 rounded-2xl prose dark:prose-invert break-words bg-blue-600 dark:bg-blue-800 text-white rounded-br-none">
                  {message.image && <img src={message.image} alt="User upload" className="max-w-xs rounded-lg mb-2" />}
                  <ReactMarkdown>{message.text}</ReactMarkdown>
              </div>
          </div>
      </div>
    );
  }

  // Bot message rendering
  return (
    <div className="flex items-start gap-4 max-w-full">
        <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-brand-gray-800">
            <GeminiIcon />
        </div>
        
        <div className="flex flex-col w-full max-w-[85%] md:max-w-[80%]">
            {isProModel ? (
                <>
                    <MessageHeader message={message} />
                    <ProMessageThoughtPanel message={message} />
                    {!message.isStreaming && (
                        <div className="mt-4">
                            <StandardMessageContent message={message} />
                        </div>
                    )}
                </>
            ) : (
                <StandardMessageContent message={message} />
            )}

            {message.sources && message.sources.length > 0 && (
                 <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
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
    </div>
  );
};