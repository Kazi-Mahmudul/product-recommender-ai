import { httpClient } from '../services/httpClient';
import { apiConfig } from '../services/apiConfig';

export interface Review {
  id: number;
  slug: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

export interface CreateReviewRequest {
  slug: string;
  rating: number;
  review_text?: string;
}

/**
 * Fetch all reviews for a specific phone by slug
 * @param slug - The phone slug
 * @returns Promise resolving to array of reviews
 */
export async function fetchReviewsByPhoneSlug(slug: string): Promise<Review[]> {
  try {
    const url = apiConfig.getEndpointURL('main', `/api/v1/reviews/${slug}`);
    const response = await httpClient.get<Review[]>(url);
    return response;
  } catch (error) {
    console.error('Error fetching reviews:', error);
    throw error;
  }
}

/**
 * Create a new review for a phone
 * @param reviewData - The review data to create
 * @returns Promise resolving to the created review
 */
export async function createReview(reviewData: CreateReviewRequest): Promise<Review> {
  try {
    const url = apiConfig.getEndpointURL('main', '/api/v1/reviews/');
    const response = await httpClient.post<Review>(url, reviewData);
    return response;
  } catch (error) {
    console.error('Error creating review:', error);
    throw error;
  }
}