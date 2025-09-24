import React, { useState, useMemo } from "react";
import {
  FaTimes,
  FaSearch,
  FaFilter,
  FaImage,
  FaVideo,
  FaFileAudio,
  FaFile,
  FaDownload,
  FaSpinner,
} from "react-icons/fa";
import { FileViewerModal } from "../FileUpload";
import { formatFileSize } from "../../firebase/services";
import useMediaGallery from "../../hooks/useMediaGallery";

const MediaGallery = ({ isVisible, onClose, chatType, chatId, chatName }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [currentViewFile, setCurrentViewFile] = useState(null);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  const { mediaFiles, loading, error, stats } = useMediaGallery(
    chatType,
    chatId
  );

  const filters = [
    { key: "all", label: "Tất cả", icon: FaFile },
    { key: "image", label: "Ảnh", icon: FaImage },
    { key: "video", label: "Video", icon: FaVideo },
    { key: "audio", label: "Âm thanh", icon: FaFileAudio },
    { key: "document", label: "Tài liệu", icon: FaFile },
  ];

  const filteredFiles = useMemo(() => {
    let files = mediaFiles;

    // Filter by type
    if (selectedFilter !== "all") {
      files = files.filter((file) => {
        const category = file.fileData?.category;
        if (selectedFilter === "audio") {
          return category === "audio" || category === "voice";
        }
        if (selectedFilter === "document") {
          return ["pdf", "document", "archive"].includes(category);
        }
        return category === selectedFilter;
      });
    }

    // Filter by search term
    if (searchTerm) {
      files = files.filter(
        (file) =>
          file.fileData?.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          file.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return files.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
  }, [mediaFiles, selectedFilter, searchTerm]);

  const handleViewFile = (file, index) => {
    setCurrentViewFile(file);
    setCurrentFileIndex(index);
    setShowFileViewer(true);
  };

  const handleCloseFileViewer = () => {
    setShowFileViewer(false);
    setCurrentViewFile(null);
    setCurrentFileIndex(0);
  };

  const handleDownload = (file) => {
    const link = document.createElement("a");
    link.href = file.fileData.url;
    link.download = file.fileData.name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (seconds) => {
    return new Date(seconds * 1000).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFileIcon = (category) => {
    const iconClass = "w-8 h-8";
    switch (category) {
      case "image":
        return <FaImage className={`${iconClass} text-green-500`} />;
      case "video":
        return <FaVideo className={`${iconClass} text-purple-500`} />;
      case "audio":
      case "voice":
        return <FaFileAudio className={`${iconClass} text-blue-500`} />;
      case "pdf":
        return <FaFile className={`${iconClass} text-red-500`} />;
      default:
        return <FaFile className={`${iconClass} text-gray-500`} />;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-gray-700 z-40 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Thư viện file
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {chatName} • {stats.total} file{stats.total !== 1 ? "s" : ""}
          </p>
          {stats.total > 0 && (
            <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.images > 0 && <span>🖼️ {stats.images} ảnh</span>}
              {stats.videos > 0 && <span>🎥 {stats.videos} video</span>}
              {stats.audio > 0 && <span>🎵 {stats.audio} âm thanh</span>}
              {stats.documents > 0 && (
                <span>📄 {stats.documents} tài liệu</span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-400"
          title="Đóng"
        >
          <FaTimes size={18} />
        </button>
      </div>

      {/* Search and Filter */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800">
        <div className="flex gap-2">
          {/* Search */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-skybrand-500"
            />
          </div>

          {/* Filter */}
          <div className="relative">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-skybrand-500 min-w-[100px]"
            >
              {filters.map((filter) => (
                <option key={filter.key} value={filter.key}>
                  {filter.label}
                </option>
              ))}
            </select>
            <FaFilter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <FaSpinner className="w-12 h-12 mb-3 animate-spin" />
            <p className="text-sm font-medium">Đang tải...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-red-500 dark:text-red-400">
            <FaFile className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">Lỗi tải file</p>
            <p className="text-xs text-center px-2">{error}</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <FaFile className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">
              {mediaFiles.length === 0
                ? "Chưa có file nào"
                : "Không tìm thấy file nào"}
            </p>
            <p className="text-xs text-center px-2">
              {mediaFiles.length === 0
                ? "Chia sẻ file để xem tại đây"
                : "Thử thay đổi bộ lọc"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredFiles.map((file, index) => (
              <div
                key={file.id}
                className="group relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleViewFile(file, index)}
              >
                {/* File Preview */}
                <div className="aspect-square flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                  {file.fileData.category === "image" ? (
                    <img
                      src={file.fileData.url}
                      alt={file.fileData.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center p-2">
                      {getFileIcon(file.fileData.category)}
                      <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center truncate w-full">
                        {file.fileData.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* File Info Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 flex items-end">
                  <div className="p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs font-medium truncate">
                      {file.fileData.name}
                    </p>
                    <p className="text-xs opacity-75">
                      {formatFileSize(file.fileData.size)}
                    </p>
                  </div>
                </div>

                {/* Download Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file);
                  }}
                  className="absolute top-1 right-1 p-1 bg-black bg-opacity-50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-70"
                  title="Tải xuống"
                >
                  <FaDownload size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Viewer Modal */}
      <FileViewerModal
        isVisible={showFileViewer}
        files={currentViewFile ? [currentViewFile] : []}
        currentIndex={currentFileIndex}
        onClose={handleCloseFileViewer}
      />
    </div>
  );
};

export default MediaGallery;
