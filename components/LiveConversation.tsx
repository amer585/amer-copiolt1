import React, { useState, useRef, useCallback } from 'react';
// FIX: Replaced non-existent `LiveSession` type with `Connection`.
import type { Connection, LiveServerMessage } from '@google/genai';
import { connectLiveSession } from '../services/geminiService';
import { decode, decodeAudioData, createPcmBlob } from '../utils/audioUtils';

interface TranscriptionEntry {
    speaker: 'user' | 'model';
    text: string;
}

export const LiveConversation: React.FC = () => {
    const [isLive, setIsLive] = useState(false);
    const [status, setStatus] = useState('Idle');
    const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);

    // FIX: Replaced non-existent `LiveSession` type with `Connection`.
    const sessionPromiseRef = useRef<Promise<Connection> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const outputSources = useRef<Set<AudioBufferSourceNode>>(new Set());
    
    const currentInputTranscription = useRef<string>('');
    const currentOutputTranscription = useRef<string>('');

    const stopConversation = useCallback(() => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        outputSources.current.forEach(source => source.stop());
        outputSources.current.clear();
        
        setIsLive(false);
        setStatus('Conversation ended.');
    }, []);

    const startConversation = async () => {
        if (isLive) return;
        
        setTranscriptions([]);
        currentInputTranscription.current = '';
        currentOutputTranscription.current = '';
        setStatus('Initializing...');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

            // FIX: Create the session promise before setting up the audio processor
            // to avoid race conditions and adhere to API guidelines.
            const sessionPromise = connectLiveSession({
                onopen: () => {
                    setIsLive(true);
                    setStatus('Connected. Speak now...');
                },
                onmessage: async (message: LiveServerMessage) => {
                    handleServerMessage(message);
                },
                onerror: (e) => {
                    console.error("Live session error:", e);
                    setStatus('Error occurred. Please try again.');
                    stopConversation();
                },
                onclose: () => {
                    setStatus('Connection closed.');
                    stopConversation();
                },
            });

            sessionPromiseRef.current = sessionPromise;

            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);
                // FIX: Removed conditional check and directly use the promise
                // as per the API guidelines to prevent race conditions.
                sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            
            source.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);

        } catch (error) {
            console.error("Failed to start microphone:", error);
            setStatus('Could not start microphone. Please check permissions.');
        }
    };
    
    const handleServerMessage = async (message: LiveServerMessage) => {
        // Handle audio output
        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (audioData && outputAudioContextRef.current) {
            const outputCtx = outputAudioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
            const audioBuffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
            const source = outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputCtx.destination);
            source.addEventListener('ended', () => outputSources.current.delete(source));
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            outputSources.current.add(source);
        }

        // Handle interruptions
        if (message.serverContent?.interrupted) {
            outputSources.current.forEach(source => source.stop());
            outputSources.current.clear();
            nextStartTimeRef.current = 0;
        }
        
        // Handle transcriptions
        if (message.serverContent?.outputTranscription) {
            currentOutputTranscription.current += message.serverContent.outputTranscription.text;
        }
        if (message.serverContent?.inputTranscription) {
            currentInputTranscription.current += message.serverContent.inputTranscription.text;
        }

        if (message.serverContent?.turnComplete) {
            const fullInput = currentInputTranscription.current;
            const fullOutput = currentOutputTranscription.current;
            setTranscriptions(prev => [...prev, 
                { speaker: 'user', text: fullInput },
                { speaker: 'model', text: fullOutput }
            ]);
            currentInputTranscription.current = '';
            currentOutputTranscription.current = '';
        }
    };


    return (
        <div className="flex flex-col h-full items-center justify-center p-4 bg-[#202124]/50 rounded-lg">
            <div className="w-full max-w-2xl flex-1 overflow-y-auto bg-black/20 p-4 rounded-t-lg">
                <h3 className="text-lg font-semibold mb-4 text-blue-300">Live Transcript</h3>
                <div className="space-y-4">
                    {transcriptions.map((t, i) => (
                        <div key={i} className={`flex ${t.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <p className={`p-3 rounded-lg max-w-lg ${t.speaker === 'user' ? 'bg-blue-600/80 text-white' : 'bg-[#303134]'}`}>
                                <span className="font-bold capitalize">{t.speaker}: </span>{t.text}
                            </p>
                        </div>
                    ))}
                     {isLive && !status.startsWith('Connected') && (
                         <div className="flex justify-center items-center p-4">
                           <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                         </div>
                     )}
                </div>
            </div>
            <div className="w-full max-w-2xl bg-[#2a2b2e] p-4 rounded-b-lg flex flex-col items-center">
                 <p className="text-gray-400 mb-4 h-6">{status}</p>
                <button
                    onClick={isLive ? stopConversation : startConversation}
                    className={`px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 flex items-center gap-3 ${
                        isLive 
                        ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' 
                        : 'bg-green-600 hover:bg-green-500 text-white'
                    }`}
                >
                    {isLive ? 'Stop Conversation' : 'Start Conversation'}
                </button>
            </div>
        </div>
    );
};