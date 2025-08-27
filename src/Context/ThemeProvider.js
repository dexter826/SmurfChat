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

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const theme = {
    isDarkMode,
    colors: {
      primary: isDarkMode ? '#1890ff' : '#1890ff',
      secondary: isDarkMode ? '#722ed1' : '#52c41a',
      background: isDarkMode ? '#141414' : '#ffffff',
      surface: isDarkMode ? '#1f1f1f' : '#f5f5f5',
      sidebar: isDarkMode ? '#001529' : '#ffffff',
      sidebarHover: isDarkMode ? '#112545' : '#f0f8ff',
      text: isDarkMode ? '#ffffff' : '#000000',
      textSecondary: isDarkMode ? '#a0a0a0' : '#666666',
      border: isDarkMode ? '#303030' : '#d9d9d9',
      unread: isDarkMode ? '#ffffff' : '#000000',
      read: isDarkMode ? '#a0a0a0' : '#666666',
    }
  };

  return (
    <ThemeContext.Provider value={{ ...theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
