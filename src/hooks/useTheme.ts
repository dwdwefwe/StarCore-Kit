import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeStore {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

export const useTheme = create<ThemeStore>((set) => {
  const stored = (localStorage.getItem('theme') as Theme) || 'light';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');
  document.documentElement.classList.toggle('dark', initial === 'dark');

  return {
    theme: initial,
    toggle: () =>
      set((state) => {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
        return { theme: newTheme };
      }),
    setTheme: (t) => {
      localStorage.setItem('theme', t);
      document.documentElement.classList.toggle('dark', t === 'dark');
      set({ theme: t });
    },
  };
});