import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'dark' | 'light';
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

const DARK_QUERY = '(prefers-color-scheme: dark)';

// Preferencja systemowa to zewnętrzne źródło prawdy, więc czytamy ją przez
// useSyncExternalStore zamiast kopiować do stanu efektem. Referencje muszą być
// stabilne, stąd definicje poza komponentem.
function subscribeToSystemTheme(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

const getSystemPrefersDark = () => window.matchMedia(DARK_QUERY).matches;

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'graintally-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
  });

  const systemPrefersDark = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemPrefersDark,
    () => false
  );

  // Wyliczane, nie trzymane w stanie. Przy poprzedniej wersji (useState +
  // ustawianie w efekcie) pierwszy render szedł zawsze jako 'light', więc
  // ikona motywu mrugała przy wejściu w trybie ciemnym.
  const resolvedTheme: 'dark' | 'light' =
    theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;

  // Klasa na <html> to synchronizacja z zewnętrznym systemem (DOM), czyli
  // właściwe zastosowanie efektu.
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = (next: Theme) => {
    localStorage.setItem(storageKey, next);
    setThemeState(next);
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
