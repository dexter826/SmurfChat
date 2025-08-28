import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Sync Tailwind's class-based dark mode with React state
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const lightTheme = {
    colors: {
      // Primary colors - rgb(24, 144, 255)
      primary: 'rgb(24, 144, 255)',
      primaryLight: '#40a9ff',
      primaryDark: '#096dd9',

      // Background colors - white
      background: '#ffffff',
      backgroundGradient: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      surface: '#fafafa',
      surfaceElevated: '#ffffff',

      // Text colors - black
      text: '#000000',
      textSecondary: '#666666',
      textMuted: '#8c8c8c',

      // Border and divider colors
      border: '#d9d9d9',
      borderLight: '#f0f0f0',

      // Sidebar colors matching welcome theme
      sidebar: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      sidebarHover: 'rgba(255, 255, 255, 0.15)',
      sidebarText: '#000000',

      // Status colors
      unread: 'rgb(24, 144, 255)',
      success: '#52c41a',
      warning: '#faad14',
      error: '#ff4d4f',

      // Shadow colors from welcome screen
      shadow: 'rgba(0, 0, 0, 0.1)',
      shadowElevated: 'rgba(0, 0, 0, 0.15)'
    }
  };

  const darkTheme = {
    colors: {
      // Primary colors - rgb(24, 144, 255)
      primary: 'rgb(24, 144, 255)',
      primaryLight: '#40a9ff',
      primaryDark: '#096dd9',

      // Dark background colors - black
      background: '#000000',
      backgroundGradient: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      surface: '#1f1f1f',
      surfaceElevated: '#262626',

      // Dark text colors - white
      text: '#ffffff',
      textSecondary: '#a6a6a6',
      textMuted: '#737373',

      // Dark border colors
      border: '#303030',
      borderLight: '#404040',

      // Dark sidebar with gradient
      sidebar: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      sidebarHover: 'rgba(255, 255, 255, 0.1)',
      sidebarText: '#ffffff',

      // Dark status colors
      unread: 'rgb(24, 144, 255)',
      success: '#73d13d',
      warning: '#ffc53d',
      error: '#ff7875',

      // Dark shadow colors
      shadow: 'rgba(0, 0, 0, 0.3)',
      shadowElevated: 'rgba(0, 0, 0, 0.5)'
    }
  };

  const theme = {
    isDarkMode,
    colors: isDarkMode ? darkTheme.colors : lightTheme.colors
  };

  return (
    <ThemeContext.Provider value={{ ...theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
