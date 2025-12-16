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

  // Ensure we always use HTTPS in production
  let API_BASE = process.env.REACT_APP_API_BASE || "/api";
  // if (API_BASE.startsWith('http://')) {
  //   API_BASE = API_BASE.replace('http://', 'https://');
  // }

  try {
    // Ensure no double slashes in URL
    const baseUrl = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const res = await axios.get(
      `${baseUrl}/api/v1/phones?search=${encodeURIComponent(query)}&limit=10`
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

export const recordSearchEvent = async (query: string): Promise<void> => {
  try {
    let API_BASE = process.env.REACT_APP_API_BASE || "/api";
    const baseUrl = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;

    // We get the token from localStorage if available to ensure request is authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) return; // Don't record for guests if not supported

    await axios.post(
      `${baseUrl}/api/v1/phones/events/search?query=${encodeURIComponent(query)}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
  } catch (error) {
    console.error("Failed to record search event:", error);
  }
};
