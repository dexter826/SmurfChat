import React, { createContext, useContext, useState } from "react";
import AlertModal from "../components/Common/AlertModal";

// Tạo context cho Alert
const AlertContext = createContext();

// Hook để sử dụng AlertContext
export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};

// Provider cung cấp các hàm alert cho toàn bộ ứng dụng
export const AlertProvider = ({ children }) => {
  // State quản lý trạng thái của alert
  const [alert, setAlert] = useState({
    isVisible: false,
    title: "",
    message: "",
    type: "info",
    showCancel: false,
    onConfirm: null,
    onCancel: null,
  });

  // Hàm hiển thị alert với các tùy chọn
  const showAlert = ({
    title,
    message,
    type = "info",
    onConfirm,
    onCancel,
    showCancel = false,
  }) => {
    setAlert({
      isVisible: true,
      title,
      message,
      type,
      showCancel,
      onConfirm: onConfirm || (() => hideAlert()),
      onCancel: onCancel || (() => hideAlert()),
    });
  };

  // Hàm ẩn alert
  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, isVisible: false }));
  };

  // Hàm hiển thị alert xác nhận và trả về Promise
  const confirm = (message, title = "Xác nhận") => {
    return new Promise((resolve) => {
      showAlert({
        title,
        message,
        type: "confirm",
        showCancel: true,
        onConfirm: () => {
          hideAlert();
          resolve(true);
        },
        onCancel: () => {
          hideAlert();
          resolve(false);
        },
      });
    });
  };

  // Hàm hiển thị alert thành công
  const success = (message, title = "Thành công") => {
    showAlert({ title, message, type: "success" });
  };

  // Hàm hiển thị alert lỗi
  const error = (message, title = "Lỗi") => {
    showAlert({ title, message, type: "error" });
  };

  // Hàm hiển thị alert cảnh báo
  const warning = (message, title = "Cảnh báo") => {
    showAlert({ title, message, type: "warning" });
  };

  // Hàm hiển thị alert thông tin
  const info = (message, title = "Thông báo") => {
    showAlert({ title, message, type: "info" });
  };

  // Render Provider và AlertModal
  return (
    <AlertContext.Provider
      value={{ showAlert, hideAlert, confirm, success, error, warning, info }}
    >
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
