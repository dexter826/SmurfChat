import React from "react";
import { FaTimes } from "react-icons/fa";

const SeenByModal = ({ isVisible, onClose, seenUsers }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-96 max-w-[90vw] max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Đã xem bởi
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
          >
            <FaTimes className="text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-96">
          {seenUsers.map((user) => (
            <div key={user.uid} className="flex items-center space-x-3 py-2">
              {user.photoURL ? (
                <img
                  className="h-10 w-10 rounded-full object-cover"
                  src={user.photoURL}
                  alt={user.displayName}
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-skybrand-600 text-white font-semibold">
                  {(user.displayName || "?").charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {user.displayName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Đã xem lúc {user.seenAt}
                </p>
              </div>
            </div>
          ))}
        </div>

        {seenUsers.length === 0 && (
          <div className="text-center py-4 text-slate-500 dark:text-slate-400">
            Chưa có ai xem tin nhắn này
          </div>
        )}
      </div>
    </div>
  );
};

export default SeenByModal;
