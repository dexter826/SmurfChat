import React, { useState } from 'react';
import { formatFileSize } from '../../firebase/services';

const FilePreview = ({ file, onDownload }) => {
  const [imageError, setImageError] = useState(false);

  const handleDownload = () => {
    if (onDownload) {
      onDownload(file);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderFileIcon = (category) => {
    const iconClass = "w-8 h-8";
    
    switch (category) {
      case 'image':
        return (
          <svg className={`${iconClass} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'video':
        return (
          <svg className={`${iconClass} text-purple-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'audio':
      case 'voice':
        return (
          <svg className={`${iconClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        );
      case 'pdf':
        return (
          <svg className={`${iconClass} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'document':
        return (
          <svg className={`${iconClass} text-blue-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'archive':
        return (
          <svg className={`${iconClass} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        );
      default:
        return (
          <svg className={`${iconClass} text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  // Image preview
  if (file.category === 'image' && !imageError) {
    return (
      <div className="max-w-sm">
        <img
          src={file.url}
          alt={file.name}
          className="rounded-lg max-h-64 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={handleDownload}
          onError={() => setImageError(true)}
        />
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {file.name} • {formatFileSize(file.size)}
        </div>
      </div>
    );
  }

  // Video preview
  if (file.category === 'video') {
    return (
      <div className="max-w-sm">
        <video
          controls
          className="rounded-lg max-h-64"
          preload="metadata"
        >
          <source src={file.url} type={file.type} />
          Trình duyệt không hỗ trợ video này.
        </video>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {file.name} • {formatFileSize(file.size)}
        </div>
      </div>
    );
  }

  // Audio/Voice preview
  if (file.category === 'audio' || file.category === 'voice') {
    return (
      <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg max-w-sm">
        {renderFileIcon(file.category)}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {file.category === 'voice' ? 'Tin nhắn thoại' : file.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {file.duration && `${Math.floor(file.duration / 60)}:${(file.duration % 60).toString().padStart(2, '0')} • `}
            {formatFileSize(file.size)}
          </div>
          <audio controls className="mt-2 w-full h-8" preload="metadata">
            <source src={file.url} type={file.type || 'audio/webm'} />
            {/* Fallback sources for better compatibility */}
            <source src={file.url} type="audio/webm" />
            <source src={file.url} type="audio/mp4" />
            <source src={file.url} type="audio/ogg" />
            Trình duyệt không hỗ trợ audio này.
          </audio>
        </div>
      </div>
    );
  }

  // Generic file preview
  return (
    <div 
      className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors max-w-sm"
      onClick={handleDownload}
    >
      {renderFileIcon(file.category)}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {file.name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatFileSize(file.size)}
        </div>
      </div>
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
  );
};

export default FilePreview;
