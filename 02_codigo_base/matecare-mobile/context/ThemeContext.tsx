import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEMES, ThemeDefinition, ThemeType } from '../constants/themes';

import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'matecare_theme';

// Safe storage wrapper
const SafeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Silently fail
    }
  }
};

interface ThemeContextType {
  theme: ThemeDefinition;
  setTheme: (type: ThemeType) => void;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTheme, setActiveTheme] = useState<ThemeType>('NEVERLAND');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    SafeStorage.getItem(THEME_STORAGE_KEY)
      .then(saved => {
        if (saved && THEMES[saved as ThemeType]) {
          setActiveTheme(saved as ThemeType);
        }
      })
      .catch(err => {
        console.error("Theme storage error:", err);
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  const setTheme = (type: ThemeType) => {
    setActiveTheme(type);
    SafeStorage.setItem(THEME_STORAGE_KEY, type);
  };

  return (
    <ThemeContext.Provider value={{ theme: THEMES[activeTheme], setTheme, isLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

