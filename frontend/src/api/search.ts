import axios from "axios";

export interface SearchResult {
  id: string;
  name: string;
  brand: string;
  price: number | string;
  img_url: string;
  ram?: string;
  internal_storage?: string;
  score?: number; // For fuzzy matching score
}

export const searchPhones = async (query: string): Promise<SearchResult[]> => {
  if (!query || query.trim().length < 2) return [];

  try {
    const res = await axios.get(
      `${process.env.REACT_APP_API_BASE}/api/v1/phones/search?q=${encodeURIComponent(query)}`
    );
    return res.data.items || [];
  } catch (error) {
    console.error("Error searching phones:", error);
    return [];
  }
};

// Fallback function for client-side fuzzy search when API doesn't support it
export const fuzzySearchPhones = async (
  query: string
): Promise<SearchResult[]> => {
  if (!query || query.trim().length < 2) return [];

  try {
    // Get all phones first
    const res = await axios.get(
      `${process.env.REACT_APP_API_BASE}/api/v1/phones/`
    );
    const allPhones = res.data.items || [];

    // Perform client-side fuzzy search
    const normalizedQuery = query.toLowerCase().trim();

    return allPhones
      .filter((phone: any) => {
        const phoneName = `${phone.brand} ${phone.name}`.toLowerCase();
        return phoneName.includes(normalizedQuery);
      })
      .map((phone: any) => ({
        id: phone.id,
        name: phone.name,
        brand: phone.brand,
        price: phone.price,
        img_url: phone.img_url,
        ram: phone.ram,
        internal_storage: phone.internal_storage,
        // Calculate a simple score based on how close the match is
        score: calculateMatchScore(
          `${phone.brand} ${phone.name}`.toLowerCase(),
          normalizedQuery
        ),
      }))
      .sort(
        (a: SearchResult, b: SearchResult) => (b.score || 0) - (a.score || 0)
      )
      .slice(0, 5); // Limit to top 5 results
  } catch (error) {
    console.error("Error performing fuzzy search:", error);
    return [];
  }
};

// Helper function to calculate a simple match score
function calculateMatchScore(text: string, query: string): number {
  // Direct match gets highest score
  if (text === query) return 100;

  // Contains as a whole word gets high score
  if (text.includes(` ${query} `)) return 90;

  // Starts with query gets good score
  if (text.startsWith(query)) return 80;

  // Contains query gets medium score
  if (text.includes(query)) return 70;

  // Calculate Levenshtein distance for fuzzy matching
  const distance = levenshteinDistance(text, query);
  const maxLength = Math.max(text.length, query.length);
  const similarity = 1 - distance / maxLength;

  // Convert to a score out of 60 (lower than direct matches)
  return similarity * 60;
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
