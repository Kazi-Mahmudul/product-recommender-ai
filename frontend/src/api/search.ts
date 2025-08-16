import axios from "axios";

export interface SearchResult {
  id: string;
  name: string;
  brand: string;
  price: number | string;
  img_url: string;
  ram?: string;
  internal_storage?: string;
  slug?: string; // Add slug for navigation
}

export const searchPhones = async (query: string): Promise<SearchResult[]> => {
  if (!query || query.trim().length < 2) return [];

  try {
    const res = await axios.get(
      `${process.env.REACT_APP_API_BASE}/api/v1/phones?search=${encodeURIComponent(query)}&limit=10`
    );
    return res.data.items || [];
  } catch (error) {
    console.error("Error searching phones:", error);
    return [];
  }
};

// Use the same function name to maintain compatibility but use the proper API
export const fuzzySearchPhones = async (
  query: string
): Promise<SearchResult[]> => {
  return searchPhones(query);
};
