export type ModelType = 'flash' | 'pro' | 'pro-extreme';
export type ActiveTool = 'deep-research' | 'image-generation' | 'study-learn' | null;

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  isStreaming?: boolean;
  model?: ModelType;
  startTime?: number;
  endTime?: number;
  image?: string; // Base64 encoded image
  sources?: {
      uri: string;
      title: string;
  }[];
}