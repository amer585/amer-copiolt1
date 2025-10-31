import React, { useState, useMemo } from 'react';
import { ChatWindow } from './components/ChatWindow';
import { InputBar } from './components/InputBar';
// Fix: Removed unused import for LiveConversation as the component file is empty and not used.
import { WelcomeHeader } from './components/WelcomeHeader';
import { Message, ModelType } from './types';
import { sendMessageStream } from './services/geminiService';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>('flash');

  // Fix: Added explicit type to 'history' to resolve type mismatch error.
  const history: { role: 'user' | 'model'; parts: { text: string }[] }[] = useMemo(() => {
    return messages
      .filter(m => !m.isStreaming)
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));
  }, [messages]);

  const handleSendMessage = async (text: string, image: string | null) => {
    if (!text.trim() && !image) return;

    const userMessage: Message = { id: crypto.randomUUID(), text, sender: 'user', image };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const botMessageId = crypto.randomUUID();
    const botMessage: Message = { id: botMessageId, text: '', sender: 'bot', isStreaming: true, sources: [] };
    setMessages((prev) => [...prev, botMessage]);

    try {
      const stream = sendMessageStream(history, text, image, selectedModel);
      let fullResponseText = '';
      
      for await (const chunk of stream) {
        fullResponseText += chunk.text;
        
        const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
        const sources = groundingMetadata?.groundingChunks
            ?.map((gc: any) => gc.web || gc.maps)
            .filter(Boolean)
            .map((s: any) => ({ uri: s.uri, title: s.title })) || [];

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId ? { ...msg, text: fullResponseText, sources } : msg
          )
        );
      }
      setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId ? { ...msg, isStreaming: false } : msg
          )
        );

    } catch (error) {
      console.error('Error sending message:', error);
       setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId ? { ...msg, text: 'Sorry, something went wrong.', isStreaming: false } : msg
          )
        );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-brand-dark text-gray-100 font-sans">
       <style>{`
        .prose { max-width: none; }
        .streaming-cursor {
          display: inline-block;
          width: 10px;
          height: 1.2rem;
          background-color: currentColor;
          animation: blink 1s step-end infinite;
          vertical-align: bottom;
        }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
      
      <main className="flex-1 flex flex-col items-center overflow-y-auto p-4 md:p-6">
        {messages.length > 0 ? (
          <ChatWindow messages={messages} />
        ) : (
          <WelcomeHeader />
        )}
      </main>
      
      <div className={`w-full max-w-3xl mx-auto px-4 md:px-0 ${messages.length > 0 ? 'pb-4' : 'pb-10'}`}>
        <InputBar 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading} 
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
        />
      </div>
    </div>
  );
}

export default App;