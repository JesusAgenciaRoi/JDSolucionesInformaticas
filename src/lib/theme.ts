import { useEffect, useState } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 'jd-theme';

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Tema efectivo (claro u oscuro) teniendo en cuenta la elección y el sistema. */
export function effectiveTheme(): 'light' | 'dark' {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(read);
  useEffect(() => {
    const root = document.documentElement;
    if (choice === 'system') delete root.dataset.theme;
    else root.dataset.theme = choice;
    try {
      if (choice === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, choice);
    } catch {
      /* sin almacenamiento: el tema dura la sesión */
    }
    window.dispatchEvent(new Event('jd-theme'));
  }, [choice]);

  /** Alterna entre claro y oscuro partiendo del tema que se ve ahora. */
  const toggle = () => setChoice(effectiveTheme() === 'dark' ? 'light' : 'dark');
  return { choice, setChoice, toggle };
}
