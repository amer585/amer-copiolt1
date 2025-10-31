
import React, { useState, useRef, useCallback } from 'react';
import type { LiveSession, LiveServerMessage } from '@google/genai';
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

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
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

            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);
                if (sessionPromiseRef.current) {
                    sessionPromiseRef.current.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                }
            };
            
            source.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);

            sessionPromiseRef.current = connectLiveSession({
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
        <div className="flex flex-col h-full items-center justify-center p-4 bg-gray-800/50 rounded-lg">
            <div className="w-full max-w-2xl flex-1 overflow-y-auto bg-gray-900/70 p-4 rounded-t-lg">
                <h3 className="text-lg font-semibold mb-4 text-cyan-400">Live Transcript</h3>
                <div className="space-y-4">
                    {transcriptions.map((t, i) => (
                        <div key={i} className={`flex ${t.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <p className={`p-3 rounded-lg max-w-lg ${t.speaker === 'user' ? 'bg-cyan-600/70 text-white' : 'bg-gray-700'}`}>
                                <span className="font-bold capitalize">{t.speaker}: </span>{t.text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-full max-w-2xl bg-gray-800 p-4 rounded-b-lg flex flex-col items-center">
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
