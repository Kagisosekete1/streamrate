import { registerPlugin } from "@capacitor/core";

export interface NativeReelPlaybackState {
  state?: "idle" | "buffering" | "ready" | "ended" | "error";
  isPlaying?: boolean;
  position?: number;
  duration?: number;
  message?: string;
}

export interface NativeReelPlayerPlugin {
  show(options: { url: string; nextUrl?: string }): Promise<void>;
  beginLocalPreview(options: { mimeType: string }): Promise<void>;
  appendLocalPreviewChunk(options: { base64: string }): Promise<void>;
  finishLocalPreview(): Promise<void>;
  showLocalPreview(): Promise<void>;
  clearLocalPreview(): Promise<void>;
  setBounds(options: { left: number; top: number; width: number; height: number }): Promise<void>;
  setMuted(options: { muted: boolean }): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  getState(): Promise<NativeReelPlaybackState>;
  hide(): Promise<void>;
  addListener(
    eventName: "playbackState",
    listener: (state: NativeReelPlaybackState) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

export const NativeReelPlayer = registerPlugin<NativeReelPlayerPlugin>("NativeReelPlayer");
