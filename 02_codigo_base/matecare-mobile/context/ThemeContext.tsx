import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEMES, ThemeDefinition, ThemeType } from '../constants/themes';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
  theme: ThemeDefinition;
  setTheme: (type: ThemeType) => void;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTheme, setActiveTheme] = useState<ThemeType>('TACTICAL');
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar el tema guardado al iniciar
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('MATECARE_THEME');
        if (savedTheme && THEMES[savedTheme as ThemeType]) {
          setActiveTheme(savedTheme as ThemeType);
        }
      } catch (e) {
        console.error('Error loading theme:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (type: ThemeType) => {
    setActiveTheme(type);
    try {
      await AsyncStorage.setItem('MATECARE_THEME', type);
    } catch (e) {
      console.error('Error saving theme:', e);
    }
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
