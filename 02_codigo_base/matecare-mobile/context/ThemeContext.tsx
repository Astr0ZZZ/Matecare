import React, { createContext, useContext, useState } from 'react';
import { THEMES, ThemeDefinition, ThemeType } from '../constants/themes';

interface ThemeContextType {
  theme: ThemeDefinition;
  setTheme: (type: ThemeType) => void;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Simplificado: Sin AsyncStorage para evitar errores de "Native module is null" en Expo Go
  const [activeTheme, setActiveTheme] = useState<ThemeType>('TACTICAL');

  const setTheme = (type: ThemeType) => {
    setActiveTheme(type);
  };

  return (
    <ThemeContext.Provider value={{ theme: THEMES[activeTheme], setTheme, isLoaded: true }}>
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
