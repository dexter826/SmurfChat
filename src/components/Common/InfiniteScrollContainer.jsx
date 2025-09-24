import React, { useEffect, useRef, useCallback } from "react";

const InfiniteScrollContainer = ({
  children,
  hasMore = true,
  loading = false,
  loadMore = () => {},
  threshold = 100, // pixels from bottom to trigger load
  reverse = false, // true for messages (load older on top scroll)
  className = "",
  style = {},
}) => {
  const containerRef = useRef(null);
  const loadingTriggeredRef = useRef(false);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (
      !containerRef.current ||
      loading ||
      !hasMore ||
      loadingTriggeredRef.current
    ) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    if (reverse) {
      // For messages: load when scrolling near top
      if (scrollTop <= threshold) {
        loadingTriggeredRef.current = true;
        loadMore();
      }
    } else {
      // For lists: load when scrolling near bottom
      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        loadingTriggeredRef.current = true;
        loadMore();
      }
    }
  }, [loading, hasMore, loadMore, threshold, reverse]);

  // Reset loading trigger when loading completes
  useEffect(() => {
    if (!loading) {
      loadingTriggeredRef.current = false;
    }
  }, [loading]);

  // Add scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Auto-load initial data if container is not scrollable
  useEffect(() => {
    const container = containerRef.current;
    if (container && hasMore && !loading) {
      const isScrollable = container.scrollHeight > container.clientHeight;
      if (!isScrollable && !loadingTriggeredRef.current) {
        loadingTriggeredRef.current = true;
        loadMore();
      }
    }
  }, [hasMore, loading, loadMore, children]);

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{
        height: "100%",
        ...style,
      }}
    >
      {/* Loading indicator for reverse scroll (messages) */}
      {reverse && loading && (
        <div className="flex justify-center items-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-500">
            Đang tải tin nhắn cũ...
          </span>
        </div>
      )}

      {children}

      {/* Loading indicator for normal scroll */}
      {!reverse && loading && (
        <div className="flex justify-center items-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-500">Đang tải thêm...</span>
        </div>
      )}

      {/* No more data indicator */}
      {!hasMore && !loading && (
        <div className="text-center p-4 text-sm text-gray-400">
          {reverse ? "Đã tải hết tin nhắn" : "Không còn dữ liệu"}
        </div>
      )}
    </div>
  );
};

export default InfiniteScrollContainer;
