
import React, { useState, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { InputBar } from './components/InputBar';
import { LiveConversation } from './components/LiveConversation';
import { generateChatResponse, generateImage } from './services/geminiService';
import type { Message, Mode, ImageData, GroundingSource } from './types';
import { Sender, Mode as ModeEnum } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>(ModeEnum.Chat);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial',
      sender: Sender.AI,
      text: 'Hello! I am Gemini. Select a mode on the left and let\'s get started.',
    }
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatHistory = useRef<{ role: string; parts: { text: string }[] }[]>([]);

  const handleSendMessage = useCallback(async (text: string, image?: ImageData | null) => {
    if (!text && !image) return;

    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: Sender.User,
      text: text,
      image: image?.base64
    };
    setMessages(prev => [...prev, userMessage]);
    
    if (mode !== ModeEnum.ImageUnderstand) {
         chatHistory.current.push({ role: 'user', parts: [{ text }] });
    }

    let aiResponse: Message | null = null;
    try {
      if (mode === ModeEnum.ImageGen) {
        const generatedImageBase64 = await generateImage(text);
        aiResponse = {
          id: Date.now().toString() + '-ai',
          sender: Sender.AI,
          text: `Here is the generated image for: "${text}"`,
          image: generatedImageBase64
        };
      } else {
        const { text: responseText, sources } = await generateChatResponse(text, mode, chatHistory.current, image);
        aiResponse = {
          id: Date.now().toString() + '-ai',
          sender: Sender.AI,
          text: responseText,
          sources: sources.length > 0 ? sources : undefined,
        };
        chatHistory.current.push({ role: 'model', parts: [{ text: responseText }] });
      }

      if (aiResponse) {
        setMessages(prev => [...prev, aiResponse!]);
      }
    } catch (error) {
      console.error("Error with Gemini API:", error);
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        sender: Sender.System,
        text: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [mode]);
  
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    chatHistory.current = []; 
    const systemMessageText = newMode === ModeEnum.Live 
      ? "Live conversation mode activated. Click 'Start Conversation' below."
      : `Switched to ${newMode} mode.`;
      
    setMessages([{
      id: 'mode-change-' + Date.now(),
      sender: Sender.System,
      text: systemMessageText,
    }]);
  };


  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      <Sidebar currentMode={mode} onModeChange={handleModeChange} />
      <div className="flex flex-col flex-1">
        <header className="bg-gray-800/50 backdrop-blur-sm p-4 border-b border-gray-700 shadow-md">
            <h1 className="text-xl font-bold text-cyan-400">Gemini AI Studio</h1>
            <p className="text-sm text-gray-400">Current Mode: <span className="font-semibold text-cyan-300">{mode}</span></p>
        </header>
        <main className="flex-1 overflow-y-auto p-4">
          {mode === ModeEnum.Live ? (
             <LiveConversation />
          ) : (
            <>
              <ChatWindow messages={messages} isLoading={isLoading} />
            </>
          )}
        </main>
        {mode !== ModeEnum.Live && (
             <footer className="p-4 border-t border-gray-700 bg-gray-900">
               <InputBar onSendMessage={handleSendMessage} isLoading={isLoading} mode={mode}/>
             </footer>
        )}
      </div>
    </div>
  );
};

export default App;
