// Utility function to generate keywords for search functionality
// Used for creating searchable keywords from display names and emails
// Optimized version - generates ~10 keywords instead of 50+

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
  
  // Add full name
  keywords.add(normalizedName);
  
  // Add individual words
  words.forEach(word => {
    keywords.add(word);
  });
  
  // Add prefix keywords for each word (for auto-complete)
  words.forEach(word => {
    for (let i = 1; i <= word.length; i++) {
      const prefix = word.substring(0, i);
      if (prefix.length >= 2) { // Only add prefixes with 2+ characters
        keywords.add(prefix);
      }
    }
  });
  
  // Add first name + last name combination (common search pattern)
  if (words.length >= 2) {
    keywords.add(`${words[0]} ${words[words.length - 1]}`);
  }
  
  // Convert Set to Array and limit to reasonable number
  const result = Array.from(keywords);
  
  // Limit to 15 keywords maximum to prevent bloat
  return result.slice(0, 15);
};
