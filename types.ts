export type ModelType = 'flash' | 'pro';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  isStreaming?: boolean;
  image?: string; // Base64 encoded image
  sources?: {
      uri: string;
      title: string;
  }[];
}
