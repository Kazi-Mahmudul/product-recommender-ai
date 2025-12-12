import React, { useState, useEffect } from 'react';
import { Star, User, Calendar, Edit, Trash2 } from 'lucide-react';
import { Review, fetchReviewsByPhoneSlug, createReview, updateReview, deleteReview } from '../../api/reviews';

interface ReviewsSectionProps {
  phoneSlug: string;
  averageRating: number;
  reviewCount: number;
}

interface EditableReview extends Review {
  isEditing?: boolean;
  tempRating?: number;
  tempReviewText?: string;
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ phoneSlug, averageRating, reviewCount }) => {
  const [reviews, setReviews] = useState<EditableReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newReview, setNewReview] = useState({
    rating: 0,
    review_text: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  // Get current session ID on component mount
  useEffect(() => {
    const sessionId = localStorage.getItem('review_session_id') || '';
    setCurrentSessionId(sessionId);
  }, []);

  // Fetch reviews when component mounts
  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        const fetchedReviews = await fetchReviewsByPhoneSlug(phoneSlug);
        // Add isEditing flag to each review
        const reviewsWithEditFlag = fetchedReviews.map(review => ({
          ...review,
          isEditing: false
        }));
        setReviews(reviewsWithEditFlag);
        setError(null);
      } catch (err) {
        setError('Failed to load reviews. Please try again later.');
        console.error('Error fetching reviews:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [phoneSlug]);

  // Handle star rating selection
  const handleRatingSelect = (rating: number) => {
    setNewReview(prev => ({ ...prev, rating }));
  };

  // Handle form submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate rating
    if (newReview.rating === 0) {
      setSubmitError('Please select a star rating.');
      return;
    }
    
    try {
      setSubmitting(true);
      setSubmitError(null);
      
      const reviewData = {
        slug: phoneSlug,
        rating: newReview.rating,
        review_text: newReview.review_text || undefined
      };
      
      const createdReview = await createReview(reviewData);
      
      // Add the new review to the list
      setReviews(prev => [{
        ...createdReview,
        isEditing: false
      }, ...prev]);
      setSubmitSuccess(true);
      
      // Reset form
      setNewReview({
        rating: 0,
        review_text: ''
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      setSubmitError('Failed to submit review. Please try again.');
      console.error('Error submitting review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Format date to "X days ago" format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => {
    const count = reviews.filter(review => review.rating === rating).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { rating, count, percentage };
  });

  // Start editing a review
  const startEditing = (reviewId: number) => {
    setReviews(prev => prev.map(review => 
      review.id === reviewId 
        ? { 
            ...review, 
            isEditing: true,
            tempRating: review.rating,
            tempReviewText: review.review_text || ''
          } 
        : review
    ));
  };

  // Cancel editing a review
  const cancelEditing = (reviewId: number) => {
    setReviews(prev => prev.map(review => 
      review.id === reviewId 
        ? { 
            ...review, 
            isEditing: false,
            tempRating: undefined,
            tempReviewText: undefined
          } 
        : review
    ));
  };

  // Save edited review
  const saveReview = async (reviewId: number) => {
    const review = reviews.find(r => r.id === reviewId);
    if (!review || !review.tempRating) return;

    try {
      const updatedReview = await updateReview(reviewId, {
        rating: review.tempRating,
        review_text: review.tempReviewText || undefined
      });

      setReviews(prev => prev.map(r => 
        r.id === reviewId 
          ? { 
              ...updatedReview,
              isEditing: false,
              tempRating: undefined,
              tempReviewText: undefined
            } 
          : r
      ));
    } catch (err) {
      console.error('Error updating review:', err);
      // Handle error (could show a message to the user)
    }
  };

  // Delete a review
  const handleDeleteReview = async (reviewId: number) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      await deleteReview(reviewId);
      setReviews(prev => prev.filter(review => review.id !== reviewId));
    } catch (err) {
      console.error('Error deleting review:', err);
      // Handle error (could show a message to the user)
    }
  };

  // Handle rating change during editing
  const handleEditRatingSelect = (reviewId: number, rating: number) => {
    setReviews(prev => prev.map(review => 
      review.id === reviewId 
        ? { ...review, tempRating: rating } 
        : review
    ));
  };

  // Handle review text change during editing
  const handleEditReviewTextChange = (reviewId: number, text: string) => {
    setReviews(prev => prev.map(review => 
      review.id === reviewId 
        ? { ...review, tempReviewText: text } 
        : review
    ));
  };

  return (
    <section 
      className="reviews-section rounded-2xl shadow-lg p-6 border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 transition-colors duration-300"
      aria-labelledby="reviews-header"
    >
      {/* Header */}
      <div className="mb-6">
        <h2 id="reviews-header" className="font-bold text-xl md:text-2xl flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Star className="text-yellow-500" size={24} />
          User Reviews & Ratings
        </h2>
        
        {/* Average Rating Summary */}
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
              <span className="text-lg text-gray-500 dark:text-gray-400">/5</span>
            </div>
            <div className="flex items-center justify-center mt-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={20}
                  className={`${i < Math.floor(averageRating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'}`}
                />
              ))}
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Based on {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
            </div>
            
            {/* Rating Distribution */}
            <div className="space-y-2">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-sm w-8 text-gray-600 dark:text-gray-300">{rating}★</span>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm w-8 text-gray-600 dark:text-gray-300 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Add Review Form */}
      <div className="mb-8 p-4 border border-brand/30 dark:border-gray-700 rounded-xl bg-brand/5 dark:bg-gray-800 transition-all duration-300">
        <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">Write a Review</h3>
        
        {submitSuccess && (
          <div className="mb-4 p-3 rounded-lg bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 flex items-center gap-2 animate-fade-in">
            <span>✅</span>
            <span>Review submitted successfully!</span>
          </div>
        )}
        
        {submitError && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 flex items-center gap-2 animate-shake">
            <span>❌</span>
            <span>{submitError}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmitReview} className="space-y-4">
          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Rating
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingSelect(star)}
                  className="transition-transform duration-200 hover:scale-110"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    size={32}
                    className={`${
                      star <= newReview.rating 
                        ? 'text-yellow-500 fill-yellow-500' 
                        : 'text-gray-300 dark:text-gray-600'
                    } transition-colors duration-200`}
                  />
                </button>
              ))}
            </div>
            {newReview.rating > 0 && (
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {newReview.rating} star{newReview.rating !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          
          {/* Review Text */}
          <div>
            <label htmlFor="review-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Review (Optional)
            </label>
            <textarea
              id="review-text"
              value={newReview.review_text}
              onChange={(e) => setNewReview(prev => ({ ...prev, review_text: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand dark:bg-gray-800 dark:text-white transition-all duration-300"
              placeholder="Share your experience with this phone..."
            />
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || newReview.rating === 0}
              className="px-6 py-2 bg-brand/10 hover:bg-brand/20 text-brand dark:text-brand dark:hover:text-hover-light font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:shadow-md"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* Reviews List */}
      <div>
        <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">
          Customer Reviews
        </h3>
        
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 flex items-center gap-2">
            <span>❌</span>
            <span>{error}</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-gray-500 dark:text-gray-400 mb-2">
              <User size={48} className="mx-auto text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              No reviews yet. Be the first to share your experience!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div 
                key={review.id} 
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow duration-300 animate-fade-in"
              >
                {review.isEditing ? (
                  // Edit mode
                  <div className="space-y-4">
                    {/* Edit Rating */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Rating
                      </label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleEditRatingSelect(review.id, star)}
                            className="transition-transform duration-200 hover:scale-110"
                            aria-label={`Rate ${star} stars`}
                          >
                            <Star
                              size={24}
                              className={`${
                                star <= (review.tempRating || 0)
                                  ? 'text-yellow-500 fill-yellow-500' 
                                  : 'text-gray-300 dark:text-gray-600'
                              } transition-colors duration-200`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Edit Review Text */}
                    <div>
                      <label htmlFor={`edit-review-text-${review.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Review
                      </label>
                      <textarea
                        id={`edit-review-text-${review.id}`}
                        value={review.tempReviewText || ''}
                        onChange={(e) => handleEditReviewTextChange(review.id, e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand dark:bg-gray-800 dark:text-white transition-all duration-300"
                        placeholder="Share your experience with this phone..."
                      />
                    </div>
                    
                    {/* Edit Actions */}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => cancelEditing(review.id)}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 font-medium rounded-lg transition-colors duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveReview(review.id)}
                        className="px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand dark:text-brand dark:hover:text-hover-light font-medium rounded-lg transition-colors duration-300 hover:shadow-md"
                        disabled={!review.tempRating}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    {/* Review Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className={`${
                                i < review.rating 
                                  ? 'text-yellow-500 fill-yellow-500' 
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Anonymous User
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Calendar size={14} />
                        <span>{formatDate(review.created_at)}</span>
                      </div>
                    </div>
                    
                    {/* Review Text */}
                    {review.review_text && (
                      <div className="text-gray-700 dark:text-gray-300 mt-2">
                        {review.review_text}
                      </div>
                    )}
                    
                    {/* Edit/Delete Actions - Only show for the review author */}
                    {review.session_id === currentSessionId && (
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={() => startEditing(review.id)}
                          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-300"
                          aria-label="Edit review"
                        >
                          <Edit size={16} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-300"
                          aria-label="Delete review"
                        >
                          <Trash2 size={16} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ReviewsSection;