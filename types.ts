
export enum Sender {
  User = 'user',
  AI = 'ai',
  System = 'system',
}

export enum Mode {
  Chat = 'Chat',
  ChatLite = 'Chat (Lite)',
  Thinking = 'Thinking Mode',
  ImageGen = 'Image Generation',
  ImageUnderstand = 'Image Understanding',
  SearchGrounding = 'Search Grounding',
  Live = 'Live Conversation',
}

export interface GroundingSource {
    uri: string;
    title: string;
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  image?: string; // base64 image data
  sources?: GroundingSource[];
}

export interface ImageData {
  base64: string;
  mimeType: string;
}
