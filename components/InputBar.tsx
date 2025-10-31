
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { LiveSession } from "@google/genai";
import { SendIcon } from './icons/SendIcon';
import { ImageIcon } from './icons/ImageIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import type { ImageData, Mode } from '../types';
import { Mode as ModeEnum } from '../types';
import { transcribeAudio } from '../services/geminiService';
import { createPcmBlob } from '../utils/audioUtils';

interface InputBarProps {
  onSendMessage: (text: string, image?: ImageData | null) => void;
  isLoading: boolean;
  mode: Mode;
}

export const InputBar: React.FC<InputBarProps> = ({ onSendMessage, isLoading, mode }) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState<ImageData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const handleSend = () => {
    if (isLoading || (!text.trim() && !image)) return;
    onSendMessage(text, image);
    setText('');
    setImage(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setImage({ base64: base64String, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const stopTranscription = useCallback(() => {
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
        sessionPromiseRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
    }
    setIsRecording(false);
  }, []);
  
  const startTranscription = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const source = audioContextRef.current.createMediaStreamSource(stream);
        scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        
        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob = createPcmBlob(inputData);
            if(sessionPromiseRef.current) {
              sessionPromiseRef.current.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            }
        };

        source.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(audioContextRef.current.destination);

        sessionPromiseRef.current = transcribeAudio({
            onopen: () => console.log('Transcription session opened.'),
            onmessage: (message) => {
                const transcript = message.serverContent?.inputTranscription?.text;
                if (transcript) {
                    setText(prev => prev + transcript);
                }
            },
            onerror: (e) => {
                console.error('Transcription error:', e);
                stopTranscription();
            },
            onclose: () => {
                console.log('Transcription session closed.');
                stream.getTracks().forEach(track => track.stop());
            },
        });

        setIsRecording(true);
    } catch (error) {
        console.error("Error starting transcription:", error);
    }
  };
  
  const toggleRecording = () => {
    if (isRecording) {
      stopTranscription();
    } else {
      setText('');
      startTranscription();
    }
  };

  useEffect(() => {
      return () => { // Cleanup on unmount
          stopTranscription();
      }
  }, [stopTranscription]);


  const isImageMode = mode === ModeEnum.ImageUnderstand;
  const placeholderText = 
    mode === ModeEnum.ImageGen ? "Enter a prompt to generate an image..." :
    isImageMode ? "Upload an image and ask a question..." :
    "Type your message here...";

  return (
    <div className="bg-gray-800 p-2 rounded-xl flex items-center gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        disabled={!isImageMode}
      />
      <button 
        onClick={() => fileInputRef.current?.click()} 
        disabled={!isImageMode || isLoading}
        className={`p-2 rounded-full transition-colors ${isImageMode ? 'hover:bg-gray-700' : 'text-gray-600 cursor-not-allowed'}`}
      >
        <ImageIcon />
      </button>

      <button
        onClick={toggleRecording}
        className={`p-2 rounded-full transition-colors ${
          isRecording ? 'bg-red-500/50 text-red-300 animate-pulse' : 'hover:bg-gray-700'
        }`}
      >
        <MicrophoneIcon />
      </button>

      <div className="flex-1 relative">
         <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            }}
            placeholder={placeholderText}
            className="w-full bg-gray-700 text-gray-200 p-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 pr-12"
            rows={1}
            disabled={isLoading}
         />
         {image && (
             <div className="absolute bottom-12 right-2 bg-gray-900/80 p-1 rounded">
                 <img src={`data:image/png;base64,${image.base64}`} className="h-10 w-10 object-cover rounded"/>
             </div>
         )}
      </div>

      <button 
        onClick={handleSend}
        disabled={isLoading || (!text.trim() && !image)}
        className="p-3 bg-cyan-600 rounded-full hover:bg-cyan-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        <SendIcon />
      </button>
    </div>
  );
};
