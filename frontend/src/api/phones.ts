// phones.ts - API utility for fetching phones

const API_BASE = process.env.REACT_APP_API_BASE || "/api";

export interface Phone {
  id: number;
  name: string;
  brand: string;
  price: string;
  price_original?: number;
  img_url?: string;
}

export interface PhoneListResponse {
  items: Phone[];
  total: number;
}

export type SortOrder = "default" | "price_high" | "price_low";

export async function fetchPhones({
  page = 1,
  pageSize = 20,
  sort = "default",
  minPrice,
  maxPrice,
}: {
  page?: number;
  pageSize?: number;
  sort?: SortOrder;
  minPrice?: number;
  maxPrice?: number;
} = {}): Promise<PhoneListResponse> {
  const skip = (page - 1) * pageSize;
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: pageSize.toString(),
  });
  if (minPrice !== undefined) params.append("min_price", minPrice.toString());
  if (maxPrice !== undefined) params.append("max_price", maxPrice.toString());
  // Sorting is handled client-side for now, unless backend supports it

  const res = await fetch(`${API_BASE}/api/v1/phones?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch phones");
  const data = await res.json();
  let items = data.items;
  if (sort === "price_high") {
    items = [...items].sort((a, b) => (b.price_original || 0) - (a.price_original || 0));
  } else if (sort === "price_low") {
    items = [...items].sort((a, b) => (a.price_original || 0) - (b.price_original || 0));
  }
  return { items, total: data.total };
} 