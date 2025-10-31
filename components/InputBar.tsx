import React, { useState, useRef, useEffect } from 'react';
// Fix: Removed unused SendIcon import as the component file is empty and not used.
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { ModelType } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { SearchIcon } from './icons/SearchIcon';
import { ImageIcon } from './icons/ImageIcon';
import { CanvasIcon } from './icons/CanvasIcon';
import { BookIcon } from './icons/BookIcon';
import { UploadIcon } from './icons/UploadIcon';
import { DriveIcon } from './icons/DriveIcon';


interface InputBarProps {
  onSendMessage: (text: string, image: string | null) => void;
  isLoading: boolean;
  selectedModel: ModelType;
  setSelectedModel: (model: ModelType) => void;
}

export const InputBar: React.FC<InputBarProps> = ({ onSendMessage, isLoading, selectedModel, setSelectedModel }) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [activePopup, setActivePopup] = useState<'model' | 'tools' | 'upload' | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popupsRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if ((text.trim() || image) && !isLoading) {
      onSendMessage(text, image);
      setText('');
      setImage(null);
    }
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
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              setImage(reader.result as string);
          };
          reader.readAsDataURL(file);
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

  return (
    <div className="bg-brand-gray-800 rounded-2xl shadow-lg p-3 flex flex-col relative" ref={popupsRef}>
        {/* Model Selector Popup */}
        {activePopup === 'model' && (
            <div className="absolute bottom-full mb-2 w-72 bg-brand-popup rounded-lg shadow-xl p-2">
               <p className="text-sm text-gray-400 px-3 py-2">يمكنك اختيار النموذج الذي يناسبك</p>
                <button onClick={() => handleModelSelect('flash')} className="w-full text-left px-3 py-2 hover:bg-brand-gray-700 rounded-md flex justify-between items-center">
                    <div>
                        <p>مساعدة شاملة سريعة</p>
                        <p className="text-xs text-gray-400">2.5 Flash</p>
                    </div>
                    {selectedModel === 'flash' && <CheckIcon />}
                </button>
                <button onClick={() => handleModelSelect('pro')} className="w-full text-left px-3 py-2 hover:bg-brand-gray-700 rounded-md flex justify-between items-center">
                    <div>
                        <p>الاستدلال، والرياضيات والترميز</p>
                        <p className="text-xs text-gray-400">2.5 Pro</p>
                    </div>
                    {selectedModel === 'pro' && <CheckIcon />}
                </button>
            </div>
        )}

        {/* Tools Popup */}
         {activePopup === 'tools' && (
            <div className="absolute bottom-full mb-2 right-0 w-60 bg-brand-popup rounded-lg shadow-xl p-2">
                <button className="w-full text-left px-3 py-2 hover:bg-brand-gray-700 rounded-md flex items-center">
                    <SearchIcon /> <span className="ml-3">Deep Research</span>
                </button>
                <button className="w-full text-left px-3 py-2 hover:bg-brand-gray-700 rounded-md flex items-center">
                   <ImageIcon /> <span className="ml-3">صور باستخدام Imagen</span>
                </button>
                 <button className="w-full text-left px-3 py-2 hover:bg-brand-gray-700 rounded-md flex items-center">
                   <CanvasIcon /> <span className="ml-3">Canvas</span>
                </button>
                 <button className="w-full text-left px-3 py-2 hover:bg-brand-gray-700 rounded-md flex items-center">
                   <BookIcon /> <span className="ml-3">التعلم الموجه</span>
                </button>
            </div>
        )}

         {/* Upload Popup */}
         {activePopup === 'upload' && (
            <div className="absolute bottom-full mb-2 right-0 w-60 bg-brand-popup rounded-lg shadow-xl p-2">
                <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-3 py-2 hover:bg-brand-gray-700 rounded-md flex items-center">
                    <UploadIcon /> <span className="ml-3">تحميل ملفات</span>
                </button>
                 <button className="w-full text-left px-3 py-2 hover:bg-brand-gray-700 rounded-md flex items-center">
                   <DriveIcon /> <span className="ml-3">إضافة ملفات من Drive</span>
                </button>
            </div>
        )}


        {image && (
            <div className="mb-2">
                <img src={image} alt="upload preview" className="max-h-40 rounded-lg" />
            </div>
        )}
        <div className="flex items-end">
            <button className="p-2 text-gray-400 hover:text-gray-200 self-center">
                <MicrophoneIcon />
            </button>
            <button onClick={() => togglePopup('model')} className="p-2 text-gray-400 hover:text-gray-200 self-center rounded-md flex items-center">
                <span>{selectedModel === 'flash' ? '2.5 Flash' : '2.5 Pro'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اسأل Gemini"
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-56 min-h-[52px] overflow-y-auto px-2 py-2 w-full text-right"
                disabled={isLoading}
            />
            <button onClick={() => togglePopup('tools')} className="p-2 text-gray-400 hover:text-gray-200 self-center rounded-md flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                </svg>
                <span className="mx-2">الأدوات</span>
            </button>
            <button onClick={() => togglePopup('upload')} className="p-2 text-gray-400 hover:text-gray-200 self-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
            </button>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </div>
    </div>
  );
};