import { useState, useEffect, useCallback } from 'react';

const useLinkDetector = (text) => {
  const [links, setLinks] = useState([]);
  const [textSegments, setTextSegments] = useState([]);

  const extractLinks = useCallback((inputText) => {
    // Regex để phát hiện URL
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
    if (!inputText) {
      setLinks([]);
      setTextSegments([]);
      return;
    }

    const foundLinks = [];
    const segments = [];
    let lastIndex = 0;
    let match;

    // Tìm tất cả các link trong text
    while ((match = urlRegex.exec(inputText)) !== null) {
      let url = match[0];

      // Xử lý các URL không có http/https
      if (url.startsWith('www.')) {
        url = 'https://' + url;
      } else if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      // Kiểm tra xem URL có hợp lệ không
      try {
        new URL(url);

        // Thêm text trước link vào segments
        if (match.index > lastIndex) {
          segments.push({
            type: 'text',
            content: inputText.slice(lastIndex, match.index)
          });
        }

        // Thêm link vào segments và foundLinks
        segments.push({
          type: 'link',
          content: match[0],
          url: url
        });

        foundLinks.push({
          original: match[0],
          normalized: url,
          index: match.index
        });

        lastIndex = match.index + match[0].length;
      } catch (error) {
        // URL không hợp lệ, bỏ qua
        continue;
      }
    }

    // Thêm phần text còn lại
    if (lastIndex < inputText.length) {
      segments.push({
        type: 'text',
        content: inputText.slice(lastIndex)
      });
    }

    setLinks(foundLinks);
    setTextSegments(segments.length > 0 ? segments : [{ type: 'text', content: inputText }]);
  }, []);

  useEffect(() => {
    extractLinks(text);
  }, [text, extractLinks]);

  return {
    links,
    textSegments,
    hasLinks: links.length > 0
  };
};

export default useLinkDetector;