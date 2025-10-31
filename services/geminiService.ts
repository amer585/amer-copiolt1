// Fix: Removed deprecated GenerateContentRequest import.
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ModelType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const modelMap = {
    'flash': 'gemini-2.5-flash',
    'pro': 'gemini-2.5-pro'
};

export async function* sendMessageStream(
    history: { role: 'user' | 'model', parts: { text: string }[] }[],
    message: string,
    image: string | null,
    model: ModelType
): AsyncGenerator<GenerateContentResponse> {
    
    const parts: any[] = [{ text: message }];
    if (image) {
        const mimeType = image.match(/data:(.*);base64,/)?.[1] || 'image/png';
        const base64Data = image.split(',')[1];
        parts.unshift({
            inlineData: {
                data: base64Data,
                mimeType,
            },
        });
    }

    // Fix: Updated to use the correct method ai.models.generateContentStream directly,
    // as ai.models.create is deprecated.
    const result = await ai.models.generateContentStream({
        model: modelMap[model],
        contents: [
            ...history,
            { role: 'user', parts: parts }
        ],
    });

    for await (const chunk of result) {
        yield chunk;
    }
}

export function getGenAI(): GoogleGenAI {
    return new GoogleGenAI({ apiKey: process.env.API_KEY! });
}