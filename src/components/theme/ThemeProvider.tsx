import { useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handle = () => setTheme(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, [setTheme]);

  return <>{children}</>;
}