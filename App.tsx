import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ChatWindow } from './components/ChatWindow';
import { InputBar } from './components/InputBar';
import { WelcomeHeader } from './components/WelcomeHeader';
import { Message, ModelType, ActiveTool } from './types';
import { generateContentStream, generateImage } from './services/geminiService';
import { useLiveConversation } from './hooks/useLiveConversation';
import { DragDropOverlay } from './components/DragDropOverlay';
import { ThemeToggle } from './components/ThemeToggle';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>('flash');
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('dark');
    } else {
      body.classList.remove('dark');
    }
  }, [theme]);

  const history: { role: 'user' | 'model'; parts: { text: string }[] }[] = useMemo(() => {
    return messages
      .filter(m => !m.isStreaming)
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));
  }, [messages]);

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  }

  const { isRecording, startConversation, stopConversation } = useLiveConversation(addMessage);

  const handleSendMessage = async (prompt?: string) => {
    const messageText = typeof prompt === 'string' ? prompt : text;
    
    let isSendDisabled = false;
    if (isLoading) {
        isSendDisabled = true;
    } else if (activeTool === 'image-generation') {
        isSendDisabled = !messageText.trim();
    } else {
        isSendDisabled = !messageText.trim() && !image;
    }

    if (isSendDisabled) return;


    const userMessage: Message = { id: crypto.randomUUID(), text: messageText, sender: 'user', image };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setText('');
    setImage(null);

    const botMessageId = crypto.randomUUID();
    const isImageEditing = !!(image && messageText.trim());
    
    const botMessage: Message = { 
        id: botMessageId, 
        text: '', 
        sender: 'bot', 
        isStreaming: true, 
        sources: [], 
        model: isImageEditing ? 'flash' : selectedModel,
        startTime: Date.now()
    };
    setMessages((prev) => [...prev, botMessage]);

    try {
      if (activeTool === 'image-generation') {
        const generatedImage = await generateImage(messageText);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId ? { ...msg, text: '', image: generatedImage, isStreaming: false, endTime: Date.now() } : msg
          )
        );
      } else {
        let systemInstruction: string | undefined = undefined;
        if (activeTool === 'study-learn') {
            systemInstruction = "You are an expert tutor specializing in simplifying complex topics for learners of all levels. Your goal is to guide the user to a deeper understanding. Ask clarifying questions, provide real-world examples, and break down problems into smaller, manageable steps. Maintain a patient, encouraging, and supportive tone throughout the conversation.";
        }
        
        const stream = generateContentStream(history, messageText, image, selectedModel, activeTool, systemInstruction);
        let fullResponseText = '';
        let fullResponseImage: string | undefined = undefined;
        
        for await (const chunk of stream) {
          if (chunk.text) {
            fullResponseText += chunk.text;
          }
          
          const imagePart = chunk.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          if (imagePart?.inlineData) {
            fullResponseImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
          }

          const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
          const sources = groundingMetadata?.groundingChunks
              ?.map((gc: any) => gc.web || gc.maps)
              .filter(Boolean)
              .map((s: any) => ({ uri: s.uri, title: s.title })) || [];

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId ? { ...msg, text: fullResponseText, image: fullResponseImage, sources } : msg
            )
          );
        }
        setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId ? { ...msg, isStreaming: false, endTime: Date.now() } : msg
            )
          );
      }
    } catch (error) {
      console.error('Error sending message:', error);
       setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId ? { ...msg, text: `Sorry, something went wrong: ${(error as Error).message}`, isStreaming: false, endTime: Date.now() } : msg
          )
        );
    } finally {
      setIsLoading(false);
      setActiveTool(null);
    }
  };
  
  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      className="flex flex-col h-screen bg-transparent text-gray-800 dark:text-gray-100 font-sans relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && <DragDropOverlay />}
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
        .smooth-resize {
            transition: height 0.2s ease-in-out;
        }
        summary::-webkit-details-marker { display: none; }
        summary { list-style: none; }
        details[open] summary .chevron-icon { transform: rotate(180deg); }
        .chevron-icon { transition: transform 0.2s; }
      `}</style>
      
      <header className="absolute top-4 left-4 z-10">
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </header>

      <main className="flex-1 flex flex-col items-center overflow-y-auto p-4 md:p-6">
        {messages.length > 0 ? (
          <ChatWindow messages={messages} />
        ) : (
          <WelcomeHeader />
        )}
      </main>
      
      <div className={`w-full max-w-3xl mx-auto px-4 md:px-0 ${messages.length > 0 ? 'pb-4' : 'pb-10'}`}>
        <InputBar 
            onSendMessage={() => handleSendMessage()}
            isLoading={isLoading} 
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            text={text}
            setText={setText}
            image={image}
            setImage={setImage}
            handleFile={handleFile}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            isRecording={isRecording}
            startRecording={startConversation}
            stopRecording={stopConversation}
        />
      </div>
    </div>
  );
}

export default App;