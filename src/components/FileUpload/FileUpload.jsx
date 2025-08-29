import React, { useState, useRef } from "react";
import {
  uploadFile,
  uploadImage,
  captureAndUploadPhoto,
  shareLocation,
  getFileCategory,
} from "../../supabase/storage";
import { AuthContext } from "../../Context/AuthProvider";
import { useAlert } from "../../Context/AlertProvider";

const FileUpload = ({ onFileUploaded, onLocationShared, disabled = false }) => {
  const { user } = React.useContext(AuthContext);
  const { error } = useAlert();
  const [isUploading, setIsUploading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Handle file selection and upload
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        // Validate file before upload
        if (!file.type) {
          throw new Error(`File "${file.name}" không có định dạng hợp lệ`);
        }

        const category = getFileCategory(file.type);
        let result;

        if (category === "image") {
          result = await uploadImage(file, user.uid);
        } else {
          result = await uploadFile(file, "files", user.uid);
        }

        onFileUploaded({
          ...result,
          category,
          messageType: "file",
        });
      }
    } catch (err) {
      console.error("Error uploading files:", err);
      // Show more specific error message
      const errorMessage =
        err.message || "Lỗi khi tải file lên. Vui lòng thử lại.";
      error(errorMessage);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  // Handle camera capture
  const handleCameraCapture = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      error("Camera không được hỗ trợ trên thiết bị này");
      return;
    }

    setIsUploading(true);
    try {
      const result = await captureAndUploadPhoto(user.uid);
      onFileUploaded({
        ...result,
        category: "image",
        messageType: "file",
      });
    } catch (err) {
      console.error("Error capturing photo:", err);
      error("Lỗi khi chụp ảnh. Vui lòng kiểm tra quyền truy cập camera.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle location sharing
  const handleLocationShare = async () => {
    if (!navigator.geolocation) {
      error("Định vị không được hỗ trợ trên thiết bị này");
      return;
    }

    setIsUploading(true);
    try {
      const locationData = await shareLocation(user.uid);
      onLocationShared({
        ...locationData,
        messageType: "location",
      });
    } catch (err) {
      console.error("Error sharing location:", err);
      error("Lỗi khi chia sẻ vị trí. Vui lòng kiểm tra quyền truy cập vị trí.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="*/*"
        disabled={disabled || isUploading}
      />
            <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="image-upload"
        disabled={disabled || isUploading}
      />

      {/* Toggle Button */}
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={disabled || isUploading}
        className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
        title="Tùy chọn đính kèm"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>

      {/* Options Menu */}
      {showOptions && (
        <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 flex space-x-2 z-50">
          {/* File Upload */}
          <button
            onClick={() => {
              fileInputRef.current?.click();
              setShowOptions(false);
            }}
            disabled={disabled || isUploading}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
            title="Tải file lên"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>

          {/* Image Upload */}
          <button
            onClick={() => {
              imageInputRef.current?.click();
              setShowOptions(false);
            }}
            disabled={disabled || isUploading}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
            title="Tải ảnh lên"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>

          {/* Camera */}
          <button
            onClick={() => {
              handleCameraCapture();
              setShowOptions(false);
            }}
            disabled={disabled || isUploading}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
            title="Chụp ảnh"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          {/* Location */}
          <button
            onClick={() => {
              handleLocationShare();
              setShowOptions(false);
            }}
            disabled={disabled || isUploading}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
            title="Chia sẻ vị trí"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          {/* Loading indicator */}
          {isUploading && (
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 px-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              <span className="text-sm">Đang tải...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
