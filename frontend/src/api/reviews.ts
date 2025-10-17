import { httpClient } from '../services/httpClient';
import { apiConfig } from '../services/apiConfig';

export interface Review {
  id: number;
  slug: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  session_id: string;
}

export interface CreateReviewRequest {
  slug: string;
  rating: number;
  review_text?: string;
}

export interface UpdateReviewRequest {
  rating: number;
  review_text?: string;
}

/**
 * Generate or retrieve a session ID for anonymous reviews
 * @returns Session ID
 */
function getSessionId(): string {
  let sessionId = localStorage.getItem('review_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('review_session_id', sessionId);
  }
  return sessionId;
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
    const sessionId = getSessionId();
    const url = apiConfig.getEndpointURL('main', '/api/v1/reviews/');
    const response = await httpClient.post<Review>(url, reviewData, {
      headers: {
        'session_id': sessionId
      }
    });
    return response;
  } catch (error) {
    console.error('Error creating review:', error);
    throw error;
  }
}

/**
 * Update an existing review
 * @param reviewId - The ID of the review to update
 * @param reviewData - The updated review data
 * @returns Promise resolving to the updated review
 */
export async function updateReview(reviewId: number, reviewData: UpdateReviewRequest): Promise<Review> {
  try {
    const sessionId = getSessionId();
    const url = apiConfig.getEndpointURL('main', `/api/v1/reviews/${reviewId}`);
    const response = await httpClient.put<Review>(url, reviewData, {
      headers: {
        'session_id': sessionId
      }
    });
    return response;
  } catch (error) {
    console.error('Error updating review:', error);
    throw error;
  }
}

/**
 * Delete a review
 * @param reviewId - The ID of the review to delete
 * @returns Promise resolving to success status
 */
export async function deleteReview(reviewId: number): Promise<boolean> {
  try {
    const sessionId = getSessionId();
    const url = apiConfig.getEndpointURL('main', `/api/v1/reviews/${reviewId}`);
    await httpClient.delete(url, {
      headers: {
        'session_id': sessionId
      }
    });
    return true;
  } catch (error) {
    console.error('Error deleting review:', error);
    throw error;
  }
}