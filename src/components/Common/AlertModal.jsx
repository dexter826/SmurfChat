import React from "react";

const AlertModal = ({
  isVisible,
  title,
  message,
  type = "info",
  onConfirm,
  onCancel,
  showCancel = false,
}) => {
  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return {
          icon: "✅",
          bgColor: "bg-green-50 dark:bg-green-900/20",
          borderColor: "border-green-200 dark:border-green-800",
          buttonColor: "bg-green-600 hover:bg-green-700",
        };
      case "error":
        return {
          icon: "❌",
          bgColor: "bg-red-50 dark:bg-red-900/20",
          borderColor: "border-red-200 dark:border-red-800",
          buttonColor: "bg-red-600 hover:bg-red-700",
        };
      case "warning":
        return {
          icon: "⚠️",
          bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
          borderColor: "border-yellow-200 dark:border-yellow-800",
          buttonColor: "bg-yellow-600 hover:bg-yellow-700",
        };
      case "confirm":
        return {
          icon: "❓",
          bgColor: "bg-blue-50 dark:bg-blue-900/20",
          borderColor: "border-blue-200 dark:border-blue-800",
          buttonColor: "bg-blue-600 hover:bg-blue-700",
        };
      default:
        return {
          icon: "ℹ️",
          bgColor: "bg-slate-50 dark:bg-slate-900/20",
          borderColor: "border-slate-200 dark:border-slate-800",
          buttonColor: "bg-skybrand-600 hover:bg-skybrand-700",
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`mx-4 w-full max-w-md rounded-lg border ${styles.borderColor} ${styles.bgColor} p-6 shadow-xl`}
      >
        <div className="flex items-center space-x-3 mb-4">
          <span className="text-2xl">{styles.icon}</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title || "Thông báo"}
          </h3>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300">{message}</p>
        </div>

        <div className="flex justify-end space-x-3">
          {showCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Hủy
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md ${styles.buttonColor}`}
          >
            {showCancel ? "Xác nhận" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
