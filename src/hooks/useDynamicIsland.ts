import { create } from 'zustand';

export type IslandContent = {
  icon?: string;          // emoji 或图标文字
  title: string;
  subtitle?: string;
  progress?: number;      // 0-100，有进度条时显示
  type?: 'info' | 'success' | 'warning' | 'error';
  actionLabel?: string;
  onAction?: () => void;
} | null;

interface DynamicIslandStore {
  content: IslandContent;
  expanded: boolean;
  setContent: (c: IslandContent) => void;
  expand: () => void;
  collapse: () => void;
  clear: () => void;
}

export const useDynamicIsland = create<DynamicIslandStore>((set) => ({
  content: null,
  expanded: false,
  setContent: (c) => set({ content: c, expanded: true }),
  expand: () => set({ expanded: true }),
  collapse: () => set({ expanded: false }),
  clear: () => set({ content: null, expanded: false }),
}));