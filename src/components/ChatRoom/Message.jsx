import React from "react";
import { formatRelative } from "date-fns/esm";
import { AuthContext } from "../../Context/AuthProvider.jsx";
import FilePreview from "../FileUpload/FilePreview";
import LocationPreview from "../FileUpload/LocationPreview";

function formatDate(seconds) {
  let formattedDate = "";

  if (seconds) {
    formattedDate = formatRelative(new Date(seconds * 1000), new Date());

    formattedDate =
      formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  }

  return formattedDate;
}

export default function Message({
  text,
  displayName,
  createdAt,
  photoURL,
  uid,
  messageType = 'text',
  fileData,
  locationData,
  messageStatus = 'sent',
  readBy = [],
}) {
  const { user } = React.useContext(AuthContext);
  const isOwn = uid === user?.uid;

  // Render message status for own messages
  const renderMessageStatus = () => {
    if (!isOwn) return null;

    const getStatusIcon = () => {
      switch (messageStatus) {
        case 'sending':
          return <span className="text-gray-400">⏳</span>;
        case 'sent':
          return <span className="text-gray-400">✓</span>;
        case 'delivered':
          return <span className="text-blue-500">✓✓</span>;
        case 'read':
          return <span className="text-blue-600">✓✓</span>;
        case 'failed':
          return <span className="text-red-500">❌</span>;
        default:
          return <span className="text-gray-400">✓</span>;
      }
    };

    const getStatusText = () => {
      switch (messageStatus) {
        case 'sending':
          return 'Đang gửi...';
        case 'sent':
          return 'Đã gửi';
        case 'delivered':
          return 'Đã nhận';
        case 'read':
          return readBy.length > 1 ? `Đã xem bởi ${readBy.length} người` : 'Đã xem';
        case 'failed':
          return 'Gửi thất bại';
        default:
          return 'Đã gửi';
      }
    };

    return (
      <div className="flex items-center justify-end mt-1 space-x-1">
        {getStatusIcon()}
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          {getStatusText()}
        </span>
      </div>
    );
  };

  const renderMessageContent = () => {
    switch (messageType) {
      case 'file':
      case 'voice':
        return <FilePreview file={fileData} />;
      
      case 'location':
        return <LocationPreview location={locationData} />;
      
      case 'text':
      default:
        return (
          <div
            className={`${
              isOwn
                ? "bg-skybrand-600 text-white border-skybrand-600 rounded-2xl rounded-tr-sm"
                : "bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100 border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm"
            } border px-3 py-2`}
          >
            <span className="break-words">{text}</span>
          </div>
        );
    }
  };

  return (
    <div className={`mb-2 flex items-start ${isOwn ? "flex-row-reverse" : ""}`}>
      <div className="h-8 w-8 flex-shrink-0">
        {photoURL ? (
          <img
            className="h-8 w-8 rounded-full object-cover"
            src={photoURL}
            alt="avatar"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-skybrand-600 text-xs font-semibold text-white">
            {displayName?.charAt(0)?.toUpperCase()}
          </div>
        )}
      </div>
      <div className={`flex max-w-[70%] flex-col ${isOwn ? "mr-2" : "ml-2"}`}>
        <div
          className={`mb-1 flex items-center ${
            isOwn ? "flex-row-reverse" : ""
          }`}
        >
          <span
            className={`text-[12px] font-semibold ${isOwn ? "ml-1" : "mr-1"}`}
          >
            {displayName}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {formatDate(createdAt?.seconds)}
          </span>
        </div>
        {renderMessageContent()}
        {renderMessageStatus()}
      </div>
    </div>
  );
}
