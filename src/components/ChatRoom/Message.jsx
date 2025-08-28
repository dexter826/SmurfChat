import React from "react";
import { formatRelative } from "date-fns/esm";
import { AuthContext } from "../../Context/AuthProvider.jsx";

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
}) {
  const { user } = React.useContext(AuthContext);
  const isOwn = uid === user?.uid;
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
        <div
          className={`${
            isOwn
              ? "bg-skybrand-600 text-white border-skybrand-600 rounded-2xl rounded-tr-sm"
              : "bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100 border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm"
          } border px-3 py-2`}
        >
          <span className="break-words">{text}</span>
        </div>
      </div>
    </div>
  );
}
