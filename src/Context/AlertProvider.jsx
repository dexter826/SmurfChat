import React, { createContext, useContext, useState } from 'react';
import AlertModal from '../components/Common/AlertModal';

const AlertContext = createContext();

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState({
    isVisible: false,
    title: '',
    message: '',
    type: 'info',
    showCancel: false,
    onConfirm: null,
    onCancel: null
  });

  const showAlert = ({ title, message, type = 'info', onConfirm, onCancel, showCancel = false }) => {
    setAlert({
      isVisible: true,
      title,
      message,
      type,
      showCancel,
      onConfirm: onConfirm || (() => hideAlert()),
      onCancel: onCancel || (() => hideAlert())
    });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, isVisible: false }));
  };

  const confirm = (message, title = 'Xác nhận') => {
    return new Promise((resolve) => {
      showAlert({
        title,
        message,
        type: 'confirm',
        showCancel: true,
        onConfirm: () => {
          hideAlert();
          resolve(true);
        },
        onCancel: () => {
          hideAlert();
          resolve(false);
        }
      });
    });
  };

  const success = (message, title = 'Thành công') => {
    showAlert({ title, message, type: 'success' });
  };

  const error = (message, title = 'Lỗi') => {
    showAlert({ title, message, type: 'error' });
  };

  const warning = (message, title = 'Cảnh báo') => {
    showAlert({ title, message, type: 'warning' });
  };

  const info = (message, title = 'Thông báo') => {
    showAlert({ title, message, type: 'info' });
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, confirm, success, error, warning, info }}>
      {children}
      <AlertModal
        isVisible={alert.isVisible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        showCancel={alert.showCancel}
        onConfirm={alert.onConfirm}
        onCancel={alert.onCancel}
      />
    </AlertContext.Provider>
  );
};

export default AlertProvider;
