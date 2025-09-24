import React from "react";
import { useLinkPreview } from "../../hooks/useLinkPreview";

const LinkPreview = ({ url }) => {
  const { data: preview, isLoading: loading, error } = useLinkPreview(url);

  const handleClick = (e) => {
    e.preventDefault();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="max-w-sm bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 dark:bg-gray-600"></div>
          <div className="p-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-blue-500 hover:text-blue-600 underline text-sm break-all"
      >
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
        {url}
      </a>
    );
  }

  return (
    <div
      className="max-w-xs bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={handleClick}
    >
      {/* Image preview */}
      {preview.image && (
        <div className="relative h-32 bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <img
            src={preview.image}
            alt={preview.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          {!preview.image && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3 max-w-full overflow-hidden">
        <div className="flex items-start justify-between max-w-full">
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 break-words">
              {preview.title}
            </h3>
            {preview.description && (
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2 break-words">
                {preview.description}
              </p>
            )}
          </div>
          <svg
            className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </div>

        <div className="flex items-center mt-2 max-w-full overflow-hidden">
          <svg
            className="w-3 h-3 text-gray-400 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate break-all">
            {preview.domain}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LinkPreview;
