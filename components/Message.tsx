import React, { useState } from 'react';
import type { Message as MessageType } from '../types';
import { Sender } from '../types';
import { BotIcon } from './icons/BotIcon';
import { UserIcon } from './icons/UserIcon';
import { SpeakerIcon } from './icons/SpeakerIcon';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleTextToSpeech = async (text: string) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
        const base64Audio = await generateSpeech(text);
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        source.onended = () => {
            setIsSpeaking(false);
            audioContext.close();
        };
    } catch (error) {
        console.error("Error generating or playing speech:", error);
        setIsSpeaking(false);
    }
  };

  const isUser = message.sender === Sender.User;
  const isSystem = message.sender === Sender.System;

  if (isSystem) {
      return (
          <div className="text-center text-sm text-gray-400 italic my-4">
              {message.text}
          </div>
      )
  }

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#303134] flex items-center justify-center"><BotIcon /></div>}
      
      <div className={`max-w-xl p-4 rounded-2xl shadow-md ${isUser ? 'bg-blue-600/90 text-white' : 'bg-[#303134] text-gray-200'}`}>
        <p className="whitespace-pre-wrap">{message.text}</p>
        {message.image && <img src={`data:image/png;base64,${message.image}`} alt="content" className="mt-4 rounded-lg max-w-sm" />}
        
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 border-t border-gray-600/50 pt-3">
            <h4 className="text-xs font-semibold text-gray-400 mb-2">Sources:</h4>
            <ul className="space-y-1">
              {message.sources.map((source, index) => (
                <li key={index}>
                  <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-300 hover:underline break-all">
                    {source.title || source.uri}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {message.sender === Sender.AI && (
        <button onClick={() => handleTextToSpeech(message.text)} disabled={isSpeaking} className="p-2 rounded-full hover:bg-gray-700/50 transition-colors self-center">
            {isSpeaking ? <div className="w-5 h-5 animate-spin rounded-full border-b-2 border-blue-400" /> : <SpeakerIcon />}
        </button>
      )}

      {isUser && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center"><UserIcon /></div>}
    </div>
  );
};