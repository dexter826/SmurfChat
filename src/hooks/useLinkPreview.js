import { useQuery } from '@tanstack/react-query';

const linkPreviewCache = new Map();

// Hàm lấy preview từ API
const fetchLinkPreview = async (url) => {
    if (!url) return null;

    // Kiểm tra cache trước
    if (linkPreviewCache.has(url)) {
        return linkPreviewCache.get(url);
    }

    try {
        const apiKey = process.env.REACT_APP_LINKPREVIEW_API_KEY;
        if (!apiKey) {
            throw new Error('LinkPreview API key chưa được cấu hình');
        }

        const response = await fetch(
            `https://api.linkpreview.net/?key=${apiKey}&q=${encodeURIComponent(url)}`
        );

        if (!response.ok) {
            throw new Error('Không thể lấy thông tin preview');
        }

        const data = await response.json();

        let preview;
        if (data.title || data.description || data.image) {
            preview = {
                title: data.title || 'Không có tiêu đề',
                description: data.description || '',
                image: data.image || '',
                url: url,
                domain: new URL(url).hostname,
            };
        } else {
            // Dự phòng: Tạo preview cơ bản từ URL
            preview = {
                title: new URL(url).hostname,
                description: url,
                image: '',
                url: url,
                domain: new URL(url).hostname,
            };
        }

        // Lưu vào cache
        linkPreviewCache.set(url, preview);
        return preview;

    } catch (err) {
        console.error('Lỗi khi lấy preview:', err);
        // Dự phòng: Tạo preview cơ bản
        try {
            const domain = new URL(url).hostname;
            const fallbackPreview = {
                title: domain,
                description: url,
                image: '',
                url: url,
                domain: domain,
            };
            linkPreviewCache.set(url, fallbackPreview);
            return fallbackPreview;
        } catch (urlError) {
            throw new Error('URL không hợp lệ');
        }
    }
};

export const useLinkPreview = (url) => {
    return useQuery({
        queryKey: ['linkPreview', url],
        queryFn: () => fetchLinkPreview(url),
        enabled: !!url,
        staleTime: 30 * 60 * 1000, // Cache 30 phút
        cacheTime: 60 * 60 * 1000, // Giữ trong cache 1 giờ
        retry: 1,
        refetchOnWindowFocus: false,
    });
};

// Hàm tiện ích để xóa cache
export const clearLinkPreviewCache = () => {
    linkPreviewCache.clear();
};

// Hàm tiện ích để lấy kích thước cache
export const getLinkPreviewCacheSize = () => {
    return linkPreviewCache.size;
};