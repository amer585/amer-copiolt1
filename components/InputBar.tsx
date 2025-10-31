import React, { useRef, useEffect, useState } from 'react';
import { SendIcon } from './icons/SendIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { ModelType, ActiveTool } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { SearchIcon } from './icons/SearchIcon';
import { ImageIcon } from './icons/ImageIcon';
import { BookIcon } from './icons/BookIcon';
import { UploadIcon } from './icons/UploadIcon';
import { XIcon } from './icons/XIcon';
import { FilterIcon } from './icons/FilterIcon';
import { BrainIcon } from './icons/BrainIcon';


interface InputBarProps {
  onSendMessage: () => void;
  isLoading: boolean;
  selectedModel: ModelType;
  setSelectedModel: (model: ModelType) => void;
  text: string;
  setText: (text: string) => void;
  image: string | null;
  setImage: (image: string | null) => void;
  handleFile: (file: File) => void;
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
}

export const InputBar: React.FC<InputBarProps> = ({ 
    onSendMessage, isLoading, selectedModel, setSelectedModel, 
    text, setText, image, setImage, handleFile,
    activeTool, setActiveTool, isRecording, startRecording, stopRecording
}) => {
  const [activePopup, setActivePopup] = useState<'model' | 'tools' | 'upload' | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popupsRef = useRef<HTMLDivElement>(null);
  
  const getIsSendDisabled = () => {
    if (isLoading) return true;
    if (activeTool === 'image-generation') {
        return !text.trim();
    }
    // For deep-research, study-learn, and no tool
    return !text.trim() && !image;
  };
  const isSendDisabled = getIsSendDisabled();

  const handleSend = () => {
    if (isSendDisabled) return;
    onSendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        textarea.style.height = `${scrollHeight}px`;
    }
  }, [text]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0]);
      }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupsRef.current && !popupsRef.current.contains(event.target as Node)) {
        setActivePopup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const togglePopup = (popup: 'model' | 'tools' | 'upload') => {
    setActivePopup(activePopup === popup ? null : popup);
  };
  
  const handleModelSelect = (model: ModelType) => {
    setSelectedModel(model);
    setActivePopup(null);
  }

  const handleToolSelect = (tool: ActiveTool) => {
    setActiveTool(activeTool === tool ? null : tool);
    setActivePopup(null);
  }

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  const getPlaceholderText = () => {
    if (activeTool === 'image-generation') return 'Describe the image you want to create...';
    if (activeTool === 'deep-research') return 'Ask Gemini with Google Search...';
    if (activeTool === 'study-learn') return 'What would you like to learn about today?';
    if (image) return 'Describe the image or ask a question...';
    return 'Ask Gemini...';
  }
  
  const getModelDisplayText = () => {
      if (selectedModel === 'flash') return '2.5 Flash';
      if (selectedModel === 'pro') return '2.5 Pro';
      return 'Extreme';
  }

  return (
    <div className="bg-brand-gray-200 dark:bg-brand-gray-800 rounded-2xl shadow-lg p-2 flex flex-col relative" ref={popupsRef}>
        {/* Popups */}
        {activePopup === 'model' && (
            <div className="absolute bottom-full mb-2 w-72 bg-brand-gray-300 dark:bg-brand-popup rounded-lg shadow-xl p-2 text-gray-800 dark:text-gray-100">
               <p className="text-sm text-gray-600 dark:text-gray-400 px-3 py-2">Select a model</p>
                <button onClick={() => handleModelSelect('flash')} className="w-full text-left px-3 py-2 hover:bg-brand-gray-400/50 dark:hover:bg-brand-gray-700 rounded-md flex justify-between items-center">
                    <div>
                        <p>Fast all-around assistance</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">2.5 Flash</p>
                    </div>
                    {selectedModel === 'flash' && <CheckIcon />}
                </button>
                <button onClick={() => handleModelSelect('pro')} className="w-full text-left px-3 py-2 hover:bg-brand-gray-400/50 dark:hover:bg-brand-gray-700 rounded-md flex justify-between items-center">
                    <div>
                        <p>Reasoning, math and coding</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">2.5 Pro</p>
                    </div>
                    {selectedModel === 'pro' && <CheckIcon />}
                </button>
                <button onClick={() => handleModelSelect('pro-extreme')} className="w-full text-left px-3 py-2 hover:bg-brand-gray-400/50 dark:hover:bg-brand-gray-700 rounded-md flex justify-between items-center">
                    <div>
                        <p className="flex items-center"><BrainIcon /> <span className="ml-2">Extreme Thinking</span></p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Complex tasks requiring deep thought</p>
                    </div>
                    {selectedModel === 'pro-extreme' && <CheckIcon />}
                </button>
            </div>
        )}
         {activePopup === 'tools' && (
            <div className="absolute bottom-full mb-2 right-0 w-60 bg-brand-gray-300 dark:bg-brand-popup rounded-lg shadow-xl p-2 text-gray-800 dark:text-gray-100">
                <button onClick={() => handleToolSelect('deep-research')} className={`w-full text-left px-3 py-2 hover:bg-brand-gray-400/50 dark:hover:bg-brand-gray-700 rounded-md flex items-center ${activeTool === 'deep-research' ? 'bg-blue-600 dark:bg-blue-800 text-white' : ''}`}>
                    <SearchIcon /> <span className="ml-3">Deep Research</span>
                </button>
                <button onClick={() => handleToolSelect('image-generation')} className={`w-full text-left px-3 py-2 hover:bg-brand-gray-400/50 dark:hover:bg-brand-gray-700 rounded-md flex items-center ${activeTool === 'image-generation' ? 'bg-blue-600 dark:bg-blue-800 text-white' : ''}`}>
                   <ImageIcon /> <span className="ml-3">Images with Imagen</span>
                </button>
                 <button onClick={() => handleToolSelect('study-learn')} className={`w-full text-left px-3 py-2 hover:bg-brand-gray-400/50 dark:hover:bg-brand-gray-700 rounded-md flex items-center ${activeTool === 'study-learn' ? 'bg-blue-600 dark:bg-blue-800 text-white' : ''}`}>
                   <BookIcon /> <span className="ml-3">Guided Learning</span>
                </button>
            </div>
        )}
         {activePopup === 'upload' && (
            <div className="absolute bottom-full mb-2 right-0 w-60 bg-brand-gray-300 dark:bg-brand-popup rounded-lg shadow-xl p-2 text-gray-800 dark:text-gray-100">
                <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-3 py-2 hover:bg-brand-gray-400/50 dark:hover:bg-brand-gray-700 rounded-md flex items-center">
                    <UploadIcon /> <span className="ml-3">Upload files</span>
                </button>
            </div>
        )}

        {/* Active Tool Indicator */}
        {activeTool && (
             <div className="mb-2 text-xs text-blue-200 bg-blue-900/50 rounded-full px-3 py-1 self-start flex items-center">
                {activeTool === 'deep-research' && <><SearchIcon /> <span className="ml-2">Deep Research Mode</span></>}
                {activeTool === 'image-generation' && <><ImageIcon /> <span className="ml-2">Image Generation Mode</span></>}
                {activeTool === 'study-learn' && <><BookIcon /> <span className="ml-2">Study Learn Mode</span></>}
                <button onClick={() => setActiveTool(null)} className="ml-2 text-gray-400 hover:text-white"><XIcon/></button>
            </div>
        )}

        {/* Image Preview */}
        {image && (
            <div className="mb-2 relative self-start">
                <img src={image} alt="upload preview" className="max-h-40 rounded-lg" />
                <button onClick={() => setImage(null)} className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white hover:bg-black">
                  <XIcon />
                </button>
            </div>
        )}

        <div className="flex items-end">
             <button onClick={handleMicClick} className={`p-2 self-center rounded-full ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                <MicrophoneIcon />
            </button>
            <button onClick={() => togglePopup('model')} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 self-center rounded-md flex items-center">
                <span>{getModelDisplayText()}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            
            <div className="flex-1 mx-2 relative">
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={getPlaceholderText()}
                    className="bg-white dark:bg-brand-gray-900/80 border border-gray-400 dark:border-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none max-h-56 min-h-[52px] overflow-y-auto px-4 py-3 w-full text-left smooth-resize text-base"
                    disabled={isLoading || isRecording}
                />
            </div>

             <button onClick={() => togglePopup('upload')} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 self-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
            </button>
             <button onClick={() => togglePopup('tools')} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 self-center rounded-md flex items-center">
                <FilterIcon />
                <span className="mx-2">Tools</span>
            </button>
            <button onClick={handleSend} disabled={isSendDisabled} className={`p-2 rounded-full self-center ${isSendDisabled ? 'text-gray-400 dark:text-gray-600' : 'text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300'}`}>
                <SendIcon />
            </button>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </div>
    </div>
  );
};