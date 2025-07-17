/// <reference path="../../../types/global.d.ts" />
import { render, screen, fireEvent } from '@testing-library/react';
import SmartRecommendations from '../SmartRecommendations';
import { useRecommendations } from '../../../hooks/useRecommendations';
import { usePrefetch } from '../../../hooks/usePrefetch';
import { useIntersectionObserverOnce } from '../../../hooks/useIntersectionObserver';

// Mock the hooks
jest.mock('../../../hooks/useRecommendations');
jest.mock('../../../hooks/usePrefetch');
jest.mock('../../../hooks/useIntersectionObserver');

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: jest.fn(() => jest.fn()),
  Link: ({ children }: { children: React.ReactNode }) => children
}));

// Mock data
const mockRecommendations = [
  {
    phone: {
      id: 456,
      name: 'Samsung Galaxy S21',
      brand: 'Samsung',
      model: 'Galaxy S21',
      price: '$799',
      url: '/phones/456',
      img_url: '/test-image.jpg',
      primary_camera_mp: 64,
      battery_capacity_numeric: 4000,
      ram_gb: 8,
      storage_gb: 128,
      screen_size_inches: 6.2
    },
    highlights: ['Better camera', 'Longer battery life'],
    badges: ['Popular', 'Best value'],
    similarityScore: 0.95,
    matchReasons: ['Similar price range']
  },
  {
    phone: {
      id: 789,
      name: 'Apple iPhone 13',
      brand: 'Apple',
      model: 'iPhone 13',
      price: '$899',
      url: '/phones/789',
      img_url: '/test-image-2.jpg',
      primary_camera_mp: 12,
      battery_capacity_numeric: 3240,
      ram_gb: 6,
      storage_gb: 128,
      screen_size_inches: 6.1
    },
    highlights: ['Better performance', 'Premium build'],
    badges: ['Premium'],
    similarityScore: 0.9,
    matchReasons: ['Similar performance profile']
  }
];

// Setup mock implementations
const mockUseRecommendations = useRecommendations as jest.MockedFunction<typeof useRecommendations>;
const mockUsePrefetch = usePrefetch as jest.MockedFunction<typeof usePrefetch>;
const mockUseIntersectionObserverOnce = useIntersectionObserverOnce as jest.MockedFunction<typeof useIntersectionObserverOnce>;

describe('SmartRecommendations Component', () => {
  const mockRefetch = jest.fn();
  const mockRetry = jest.fn();
  const mockResetError = jest.fn();
  const mockPrefetchPhone = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useRecommendations hook
    mockUseRecommendations.mockReturnValue({
      recommendations: [],
      loading: false,
      error: null,
      isNetworkError: false,
      isRetrying: false,
      retryCount: 0,
      refetch: mockRefetch,
      retry: mockRetry,
      resetError: mockResetError
    });
    
    // Mock usePrefetch hook
    mockUsePrefetch.mockReturnValue({
      prefetchPhone: mockPrefetchPhone
    });
    
    // Mock useIntersectionObserverOnce hook
    mockUseIntersectionObserverOnce.mockReturnValue({
      ref: { current: null },
      isIntersecting: false,
      entry: null
    });
  });
  
  test('renders loading state', () => {
    // Mock loading state
    mockUseRecommendations.mockReturnValue({
      recommendations: [],
      loading: true,
      error: null,
      isNetworkError: false,
      isRetrying: false,
      retryCount: 0,
      refetch: mockRefetch,
      retry: mockRetry,
      resetError: mockResetError
    });
    
    render(
      <SmartRecommendations phoneId={123} />
    );
    
    // Check that loading indicator is rendered
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
  
  test('renders error state', () => {
    // Mock error state
    mockUseRecommendations.mockReturnValue({
      recommendations: [],
      loading: false,
      error: 'Failed to fetch',
      isNetworkError: false,
      isRetrying: false,
      retryCount: 0,
      refetch: mockRefetch,
      retry: mockRetry,
      resetError: mockResetError
    });
    
    render(
      <SmartRecommendations phoneId={123} />
    );
    
    // Check that error message is rendered
    expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
    
    // Check that retry button is rendered and works
    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalled();
  });
  
  test('renders network error state', () => {
    // Mock network error state
    mockUseRecommendations.mockReturnValue({
      recommendations: [],
      loading: false,
      error: 'Network error',
      isNetworkError: true,
      isRetrying: false,
      retryCount: 0,
      refetch: mockRefetch,
      retry: mockRetry,
      resetError: mockResetError
    });
    
    render(
      <SmartRecommendations phoneId={123} />
    );
    
    // Check that network error message is rendered
    expect(screen.getByText(/check your internet/i)).toBeInTheDocument();
  });
  
  test('renders empty state', () => {
    // Mock empty recommendations state
    mockUseRecommendations.mockReturnValue({
      recommendations: [],
      loading: false,
      error: null,
      isNetworkError: false,
      isRetrying: false,
      retryCount: 0,
      refetch: mockRefetch,
      retry: mockRetry,
      resetError: mockResetError
    });
    
    // Mock that we've attempted to load
    mockUseIntersectionObserverOnce.mockReturnValue({
      ref: { current: null },
      isIntersecting: true,
      entry: {} as IntersectionObserverEntry
    });
    
    render(
      <SmartRecommendations phoneId={123} />
    );
    
    // Check that empty state message is rendered
    expect(screen.getByText(/No recommendations found/i)).toBeInTheDocument();
  });
  
  test('renders recommendations', () => {
    // Mock successful recommendations state
    mockUseRecommendations.mockReturnValue({
      recommendations: mockRecommendations,
      loading: false,
      error: null,
      isNetworkError: false,
      isRetrying: false,
      retryCount: 0,
      refetch: mockRefetch,
      retry: mockRetry,
      resetError: mockResetError
    });
    
    render(
      <SmartRecommendations phoneId={123} />
    );
    
    // Check that recommendations are rendered
    expect(screen.getByText('Samsung Galaxy S21')).toBeInTheDocument();
    expect(screen.getByText('Apple iPhone 13')).toBeInTheDocument();
    
    // Check that highlights are rendered
    expect(screen.getByText('Better camera')).toBeInTheDocument();
    expect(screen.getByText('Premium build')).toBeInTheDocument();
    
    // Check that badges are rendered
    expect(screen.getByText('Popular')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });
  
  test('fetches recommendations when component comes into view', () => {
    // Initially not in view
    mockUseIntersectionObserverOnce.mockReturnValue({
      ref: { current: null },
      isIntersecting: false,
      entry: null
    });
    
    render(
      <SmartRecommendations phoneId={123} />
    );
    
    // Check that refetch was not called
    expect(mockRefetch).not.toHaveBeenCalled();
    
    // Now in view
    mockUseIntersectionObserverOnce.mockReturnValue({
      ref: { current: null },
      isIntersecting: true,
      entry: {} as IntersectionObserverEntry
    });
    
    render(
      <SmartRecommendations phoneId={123} />
    );
    
    // Check that refetch was called
    expect(mockRefetch).toHaveBeenCalled();
  });
  
  test('shows retrying state', () => {
    // Mock retrying state
    mockUseRecommendations.mockReturnValue({
      recommendations: [],
      loading: false,
      error: 'Network error',
      isNetworkError: true,
      isRetrying: true,
      retryCount: 2,
      refetch: mockRefetch,
      retry: mockRetry,
      resetError: mockResetError
    });
    
    render(
      <SmartRecommendations phoneId={123} />
    );
    
    // Check that retry count is shown
    expect(screen.getByText('Retrying 2/3...')).toBeInTheDocument();
  });
});