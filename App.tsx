import React, { useState, useCallback, useRef } from 'react';
import { Sidebar as RightSidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { InputBar } from './components/InputBar';
import { LiveConversation } from './components/LiveConversation';
import { generateChatResponse, generateImage } from './services/geminiService';
import type { Message, Mode, ImageData } from './types';
import { Sender, Mode as ModeEnum } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>(ModeEnum.Chat);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasStartedChat, setHasStartedChat] = useState<boolean>(false);
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

    if (!hasStartedChat) {
      setHasStartedChat(true);
      setMessages([userMessage]);
    } else {
      setMessages(prev => [...prev, userMessage]);
    }
    
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
  }, [mode, hasStartedChat]);
  
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    if(hasStartedChat) {
        chatHistory.current = []; 
        const systemMessageText = newMode === ModeEnum.Live 
          ? "Live conversation mode activated. Click 'Start Conversation' below."
          : `Switched to ${newMode} mode.`;
          
        setMessages(prev => [...prev, {
          id: 'mode-change-' + Date.now(),
          sender: Sender.System,
          text: systemMessageText,
        }]);
    }
  };

  const handleNewChat = () => {
    setHasStartedChat(false);
    setMessages([]);
    chatHistory.current = [];
    setMode(ModeEnum.Chat);
  };

  return (
    <div className="flex h-screen">
      <div className="flex flex-col flex-1 relative bg-[#1e1f20]">
        {!hasStartedChat && mode !== ModeEnum.Live ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
              <h1 dir="rtl" className="text-5xl font-medium mb-12 text-center bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
                <span className="text-gray-400">مرحباً,</span> Amer
              </h1>
              <InputBar 
                  onSendMessage={handleSendMessage} 
                  isLoading={isLoading} 
                  mode={mode} 
                  onModeChange={handleModeChange}
                  isCentered={true} 
              />
            </div>
          </div>
        ) : (
          <>
            <main className="flex-1 overflow-y-auto p-4 flex flex-col">
              {mode === ModeEnum.Live ? (
                 <LiveConversation />
              ) : (
                <ChatWindow messages={messages} isLoading={isLoading} />
              )}
            </main>
            {mode !== ModeEnum.Live && (
                 <footer className="p-4 bg-[#1e1f20]">
                   <InputBar 
                      onSendMessage={handleSendMessage} 
                      isLoading={isLoading} 
                      mode={mode}
                      onModeChange={handleModeChange}
                      isCentered={false}
                   />
                 </footer>
            )}
          </>
        )}
      </div>
      <RightSidebar onNewChat={handleNewChat} />
    </div>
  );
};

export default App;