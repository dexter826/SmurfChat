import React, { useState, useEffect, useCallback } from "react";
import {
  FaTimes,
  FaDownload,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

const FileViewerModal = ({
  isVisible,
  files,
  currentIndex,
  onClose,
  onDownload,
}) => {
  const [imageError, setImageError] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(currentIndex || 0);

  const handlePrevious = useCallback(() => {
    setCurrentFileIndex((prev) =>
      prev > 0 ? prev - 1 : files?.length - 1 || 0
    );
    setImageError(false);
  }, [files?.length]);

  const handleNext = useCallback(() => {
    setCurrentFileIndex((prev) =>
      prev < (files?.length - 1 || 0) ? prev + 1 : 0
    );
    setImageError(false);
  }, [files?.length]);

  useEffect(() => {
    if (currentIndex !== undefined) {
      setCurrentFileIndex(currentIndex);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (isVisible) {
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          onClose();
        } else if (e.key === "ArrowLeft") {
          handlePrevious();
        } else if (e.key === "ArrowRight") {
          handleNext();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isVisible, handleNext, handlePrevious, onClose]);

  if (!isVisible || !files || files.length === 0) return null;

  const currentFile = files[currentFileIndex];

  const handleDownload = () => {
    if (onDownload) {
      onDownload(currentFile);
    } else {
      // Default download behavior
      const link = document.createElement("a");
      link.href = currentFile.url;
      link.download = currentFile.name;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderFileViewer = () => {
    switch (currentFile.category) {
      case "image":
        return (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <img
              src={currentFile.url}
              alt={currentFile.name}
              className="max-w-full max-h-full object-contain"
              onError={() => setImageError(true)}
            />
            {imageError && (
              <div className="flex flex-col items-center justify-center text-white">
                <div className="text-6xl mb-4">🖼️</div>
                <p className="text-lg">Không thể tải ảnh</p>
                <p className="text-sm opacity-75">{currentFile.name}</p>
              </div>
            )}
          </div>
        );

      case "video":
        return (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <video
              controls
              autoPlay
              className="max-w-full max-h-full"
              preload="metadata"
            >
              <source src={currentFile.url} type={currentFile.type} />
              Trình duyệt không hỗ trợ video này.
            </video>
          </div>
        );

      case "audio":
      case "voice":
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-900 p-8">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">
                {currentFile.category === "voice" ? "🎤" : "🎵"}
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {currentFile.category === "voice"
                  ? "Tin nhắn thoại"
                  : currentFile.name}
              </h3>
              <p className="text-gray-300 mb-6">
                {currentFile.duration &&
                  `${Math.floor(currentFile.duration / 60)}:${(
                    currentFile.duration % 60
                  )
                    .toString()
                    .padStart(2, "0")}`}
              </p>
              <audio controls className="w-full max-w-md" preload="metadata">
                <source
                  src={currentFile.url}
                  type={currentFile.type || "audio/webm"}
                />
                <source src={currentFile.url} type="audio/webm" />
                <source src={currentFile.url} type="audio/mp4" />
                <source src={currentFile.url} type="audio/ogg" />
                Trình duyệt không hỗ trợ audio này.
              </audio>
            </div>
          </div>
        );

      case "pdf":
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold mb-2">{currentFile.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                File PDF - {formatFileSize(currentFile.size)}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleDownload}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FaDownload /> Tải xuống
                </button>
                <button
                  onClick={() => window.open(currentFile.url, "_blank")}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Mở trong tab mới
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="text-center">
              <div className="text-6xl mb-4">📎</div>
              <h3 className="text-xl font-semibold mb-2">{currentFile.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {formatFileSize(currentFile.size)}
              </p>
              <button
                onClick={handleDownload}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <FaDownload /> Tải xuống
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold truncate max-w-md">
              {currentFile.name}
            </h3>
            <span className="text-sm opacity-75">
              {currentFileIndex + 1} / {files.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              title="Tải xuống"
            >
              <FaDownload />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              title="Đóng (ESC)"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {files.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors text-white"
            title="Trước (←)"
          >
            <FaChevronLeft size={24} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors text-white"
            title="Tiếp (→)"
          >
            <FaChevronRight size={24} />
          </button>
        </>
      )}

      {/* Main content */}
      <div className="w-full h-full flex items-center justify-center p-4 pt-20">
        {renderFileViewer()}
      </div>
    </div>
  );
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default FileViewerModal;
