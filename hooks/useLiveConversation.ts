import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { getGenAI } from '../services/geminiService';
import { encode, decode, decodeAudioData, createPcmBlob } from '../utils/audioUtils';
import { Message } from '../types';

export function useLiveConversation(
    addMessage: (message: Message) => void
) {
    const [isRecording, setIsRecording] = useState(false);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const sources = useRef(new Set<AudioBufferSourceNode>()).current;
    let nextStartTime = 0;

    const stopConversation = useCallback(() => {
        if (!isRecording) return;
        console.log('Stopping conversation');
        setIsRecording(false);
        
        sessionPromiseRef.current?.then(session => session.close());
        sessionPromiseRef.current = null;
        
        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();
        inputAudioContextRef.current?.close();
        
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());

    }, [isRecording]);


    const startConversation = useCallback(async () => {
        if (isRecording) return;
        console.log('Starting conversation');
        setIsRecording(true);
        const ai = getGenAI();

        // FIX: Cast window to `any` to allow access to `webkitAudioContext` for older browser compatibility, which resolves the TypeScript error.
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        let currentInputTranscription = '';
        let currentOutputTranscription = '';

        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: async () => {
                    console.log('Live session opened');
                    mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const inputAudioContext = inputAudioContextRef.current!;
                    mediaStreamSourceRef.current = inputAudioContext.createMediaStreamSource(mediaStreamRef.current);
                    scriptProcessorRef.current = inputAudioContext.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createPcmBlob(inputData);
                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };

                    mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                    scriptProcessorRef.current.connect(inputAudioContext.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        currentInputTranscription += message.serverContent.inputTranscription.text;
                    }
                    if (message.serverContent?.outputTranscription) {
                        currentOutputTranscription += message.serverContent.outputTranscription.text;
                    }
                    if (message.serverContent?.turnComplete) {
                        const finalInput = currentInputTranscription;
                        const finalOutput = currentOutputTranscription;
                        if(finalInput) addMessage({ id: crypto.randomUUID(), text: finalInput, sender: 'user' });
                        if(finalOutput) addMessage({ id: crypto.randomUUID(), text: finalOutput, sender: 'bot' });
                        currentInputTranscription = '';
                        currentOutputTranscription = '';
                    }

                    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                    if (audioData) {
                        const outputAudioContext = outputAudioContextRef.current!;
                        nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                        const audioBuffer = await decodeAudioData(
                            decode(audioData),
                            outputAudioContext,
                            24000,
                            1,
                        );
                        const source = outputAudioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputAudioContext.destination);
                        source.addEventListener('ended', () => {
                            sources.delete(source);
                        });
                        source.start(nextStartTime);
                        nextStartTime += audioBuffer.duration;
                        sources.add(source);
                    }
                    if (message.serverContent?.interrupted) {
                        for (const source of sources.values()) {
                          source.stop();
                          sources.delete(source);
                        }
                        nextStartTime = 0;
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    addMessage({ id: crypto.randomUUID(), text: `Live connection error: ${e.message}`, sender: 'bot' });
                    stopConversation();
                },
                onclose: (e: CloseEvent) => {
                    console.log('Live session closed');
                    stopConversation();
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                },
            },
        });
    }, [isRecording, addMessage, stopConversation, sources]);

    return { isRecording, startConversation, stopConversation };
}