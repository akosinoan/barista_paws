import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import Button from './ui/Button';

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return (
    <Button variant="outline" size="icon" onClick={() => setDark(!dark)} aria-label="Toggle theme">
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </Button>
  );
}
