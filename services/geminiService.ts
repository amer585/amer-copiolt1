import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { ModelType, ActiveTool } from "../types";

const modelMap = {
    'flash': 'gemini-2.5-flash',
    'pro': 'gemini-2.5-pro',
    'pro-extreme': 'gemini-2.5-pro'
};

export function getGenAI(): GoogleGenAI {
    return new GoogleGenAI({ apiKey: process.env.API_KEY! });
}

export async function generateImage(prompt: string): Promise<string> {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePart?.inlineData) {
        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
    throw new Error("No image was generated. The prompt may have been blocked.");
}


export async function* generateContentStream(
    history: { role: 'user' | 'model', parts: { text: string }[] }[],
    message: string,
    image: string | null,
    model: ModelType,
    activeTool: ActiveTool,
    systemInstruction?: string
): AsyncGenerator<GenerateContentResponse> {
    
    const ai = getGenAI();
    const parts: any[] = [{ text: message }];
    let responseModalities: Modality[] | undefined = undefined;

    if (image) {
        const mimeType = image.match(/data:(.*);base64,/)?.[1] || 'image/png';
        const base64Data = image.split(',')[1];
        parts.unshift({
            inlineData: {
                data: base64Data,
                mimeType,
            },
        });
        // If there's an image and a text prompt, assume image editing is the goal
        if (message.trim()) {
             responseModalities = [Modality.IMAGE];
        }
    }
    
    const config: any = {};
    const finalModel = responseModalities ? 'gemini-2.5-flash-image' : modelMap[model];

    if (activeTool === 'deep-research') {
        config.tools = [{googleSearch: {}}];
    }

    if (finalModel === modelMap['pro']) { // 'gemini-2.5-pro'
        if (model === 'pro') {
            config.thinkingConfig = { thinkingBudget: 16384 };
        } else if (model === 'pro-extreme') {
            config.thinkingConfig = { thinkingBudget: 32768 };
        }
    }

    if (responseModalities) {
        config.responseModalities = responseModalities;
    }
    if (systemInstruction) {
        config.systemInstruction = systemInstruction;
    }

    const result = await ai.models.generateContentStream({
        model: finalModel,
        contents: [
            ...history,
            { role: 'user', parts: parts }
        ],
        config: Object.keys(config).length > 0 ? config : undefined,
    });

    for await (const chunk of result) {
        yield chunk;
    }
}