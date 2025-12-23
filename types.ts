
export enum ToolType {
  GENERATE = 'GENERATE',
  EDIT = 'EDIT',
  ANIMATE = 'ANIMATE',
  HISTORY = 'HISTORY'
}

export type ImageSize = '1K' | '2K' | '4K';
export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

export interface GeneratedAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  timestamp: number;
}

export interface GenerationConfig {
  size?: ImageSize;
  aspectRatio: AspectRatio;
  prompt: string;
  model: string;
}

// Fixed: Define AIStudio interface to match existing global type and resolve collision.
export interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    // Fixed: Added readonly modifier and used AIStudio type to match environment declaration.
    readonly aistudio: AIStudio;
  }
}
