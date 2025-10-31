
import { GoogleGenAI, Modality, type GenerateContentResponse, type GroundingChunk, type LiveSession, type LiveCallbacks } from "@google/genai";
import type { ImageData, Mode, GroundingSource } from '../types';
import { Mode as ModeEnum } from '../types';

let ai: GoogleGenAI;
const getAi = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};


export const generateChatResponse = async (
    prompt: string,
    mode: Mode,
    history: { role: string; parts: { text: string }[] }[],
    image?: ImageData | null,
) => {
    const modelMap: { [key in Mode]?: string } = {
        [ModeEnum.Chat]: 'gemini-2.5-flash',
        [ModeEnum.ChatLite]: 'gemini-flash-lite-latest',
        [ModeEnum.Thinking]: 'gemini-2.5-pro',
        [ModeEnum.ImageUnderstand]: 'gemini-2.5-flash',
        [ModeEnum.SearchGrounding]: 'gemini-2.5-flash',
    };
    
    const model = modelMap[mode];
    if (!model) {
        throw new Error(`Invalid mode for chat: ${mode}`);
    }

    const contents: any = {
        role: 'user',
        parts: [{ text: prompt }],
    };

    if (image) {
        contents.parts.unshift({
            inlineData: {
                mimeType: image.mimeType,
                data: image.base64,
            },
        });
    }

    const config: any = {};
    const tools: any[] = [];
    
    if (mode === ModeEnum.Thinking) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }
    
    if (mode === ModeEnum.SearchGrounding) {
        tools.push({ googleSearch: {} });
    }
    
    const response: GenerateContentResponse = await getAi().models.generateContent({
        model: model,
        contents: [...history, contents],
        config: Object.keys(config).length > 0 ? config : undefined,
        tools: tools.length > 0 ? tools : undefined,
    });

    const text = response.text;
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    let sources: GroundingSource[] = [];

    if (groundingMetadata?.groundingChunks) {
        sources = groundingMetadata.groundingChunks
            .filter((chunk: GroundingChunk) => chunk.web)
            .map((chunk: GroundingChunk) => ({
                uri: chunk.web!.uri,
                title: chunk.web!.title,
            }));
    }
    
    return { text, sources };
};

export const generateImage = async (prompt: string): Promise<string> => {
    const response = await getAi().models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '1:1',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return base64ImageBytes;
    }
    throw new Error("Image generation failed.");
};


export const generateSpeech = async (text: string): Promise<string> => {
    const response = await getAi().models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
        return base64Audio;
    }
    throw new Error("TTS generation failed.");
};

export const connectLiveSession = async (callbacks: LiveCallbacks): Promise<LiveSession> => {
    return getAi().live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: 'You are a helpful and friendly AI assistant. Be conversational and keep your responses concise.',
        },
    });
};

export const transcribeAudio = async (callbacks: LiveCallbacks): Promise<LiveSession> => {
     return getAi().live.connect({
        model: 'gemini-2.5-flash',
        callbacks: callbacks,
        config: {
            inputAudioTranscription: {},
        },
    });
};
