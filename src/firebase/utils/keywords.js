export const generateKeywords = (displayName) => {
  if (!displayName || typeof displayName !== 'string') {
    return [];
  }

  const normalizedName = displayName.toLowerCase().trim();
  const words = normalizedName.split(' ').filter(word => word.length > 0);

  if (words.length === 0) {
    return [];
  }

  const keywords = new Set();

  keywords.add(normalizedName);

  words.forEach(word => {
    keywords.add(word);
  });

  words.forEach(word => {
    for (let i = 1; i <= word.length; i++) {
      const prefix = word.substring(0, i);
      if (prefix.length >= 2) {
        keywords.add(prefix);
      }
    }
  });

  if (words.length >= 2) {
    keywords.add(`${words[0]} ${words[words.length - 1]}`);
  }

  const result = Array.from(keywords);

  return result.slice(0, 15);
};
