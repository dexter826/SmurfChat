import { useState, useEffect } from 'react';

// Cache cho images để tránh load lại
const imageCache = new Map();

export const useImageCache = (src, fallbackSrc = null) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!src) {
            setImageSrc(fallbackSrc);
            setLoading(false);
            return;
        }

        // Kiểm tra cache trước
        if (imageCache.has(src)) {
            setImageSrc(imageCache.get(src));
            setLoading(false);
            return;
        }

        const img = new Image();

        const handleLoad = () => {
            imageCache.set(src, src);
            setImageSrc(src);
            setLoading(false);
            setError(null);
        };

        const handleError = () => {
            if (fallbackSrc && fallbackSrc !== src) {
                // Thử fallback nếu có
                if (imageCache.has(fallbackSrc)) {
                    setImageSrc(imageCache.get(fallbackSrc));
                } else {
                    setImageSrc(fallbackSrc);
                }
            }
            setLoading(false);
            setError(true);
        };

        img.addEventListener('load', handleLoad);
        img.addEventListener('error', handleError);
        img.src = src;

        return () => {
            img.removeEventListener('load', handleLoad);
            img.removeEventListener('error', handleError);
        };
    }, [src, fallbackSrc]);

    return { imageSrc, loading, error };
};

// Hook để preload images
export const useImagePreload = (srcs) => {
    const [loadedCount, setLoadedCount] = useState(0);
    const [totalCount] = useState(srcs.length);

    useEffect(() => {
        if (!srcs.length) return;

        let loaded = 0;

        srcs.forEach(src => {
            if (imageCache.has(src)) {
                loaded++;
                setLoadedCount(loaded);
                return;
            }

            const img = new Image();
            img.onload = () => {
                imageCache.set(src, src);
                loaded++;
                setLoadedCount(loaded);
            };
            img.onerror = () => {
                loaded++;
                setLoadedCount(loaded);
            };
            img.src = src;
        });
    }, [srcs]);

    return {
        loadedCount,
        totalCount,
        isComplete: loadedCount === totalCount,
        progress: totalCount > 0 ? (loadedCount / totalCount) * 100 : 100
    };
};

// Utility function để clear cache
export const clearImageCache = () => {
    imageCache.clear();
};

// Utility function để get cache size
export const getImageCacheSize = () => {
    return imageCache.size;
};