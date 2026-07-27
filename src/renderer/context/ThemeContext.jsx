import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // Load stored theme setting if available
    if (window.api && window.api.getSettings) {
      window.api.getSettings().then(s => {
        if (s && s.theme) {
          setTheme(s.theme);
        }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (window.api && window.api.saveSettings) {
      window.api.saveSettings({ theme: nextTheme }).catch(() => {});
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
