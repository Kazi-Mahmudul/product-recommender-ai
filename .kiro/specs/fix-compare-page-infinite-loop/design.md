# Design Document

## Overview

The infinite loop issue in the compare page stems from improper request lifecycle management in the `useComparisonState` hook and insufficient error handling in the `fetchPhonesByIds` function. The design focuses on implementing robust request deduplication, proper cleanup mechanisms, exponential backoff retry logic, and race condition prevention.

## Architecture

### Core Components

1. **Enhanced useComparisonState Hook**: Improved with request deduplication, proper cleanup, and debouncing
2. **Retry Logic Service**: Centralized retry mechanism with exponential backoff
3. **Request Cache**: In-memory cache to prevent duplicate requests
4. **AbortController Integration**: Proper request cancellation support

### Data Flow

```
URL Change → useComparisonState → Request Deduplication → API Call → Cache Update → State Update
     ↓                                      ↓
Component Unmount → Cleanup → AbortController → Cancel Pending Requests
```

## Components and Interfaces

### 1. Enhanced useComparisonState Hook

**Key Improvements:**
- Request deduplication using request fingerprinting
- AbortController for request cancellation
- Debounced API calls to prevent rapid-fire requests
- Proper cleanup on component unmount
- Exponential backoff retry logic

**Interface Changes:**
```typescript
interface ComparisonState {
  phones: Phone[];
  selectedPhoneIds: number[];
  isLoading: boolean;
  error: string | null;
  isValidComparison: boolean;
  retryCount: number; // New field
  isRetrying: boolean; // New field
}

interface ComparisonActions {
  setSelectedPhoneIds: (phoneIds: number[]) => void;
  addPhone: (phoneId: number) => void;
  removePhone: (phoneId: number) => void;
  replacePhone: (oldPhoneId: number, newPhoneId: number) => void;
  clearError: () => void;
  refreshPhones: () => Promise<void>;
  retryFetch: () => Promise<void>; // New method
}
```

### 2. Request Management Service

**Purpose:** Centralized request lifecycle management with caching and deduplication

**Key Features:**
- Request fingerprinting based on phone IDs
- In-memory cache with TTL (Time To Live)
- AbortController management
- Request queuing to prevent concurrent duplicate requests

**Interface:**
```typescript
interface RequestManager {
  fetchPhones(phoneIds: number[], signal?: AbortSignal): Promise<Phone[]>;
  cancelRequest(requestId: string): void;
  clearCache(): void;
  isRequestPending(phoneIds: number[]): boolean;
}
```

### 3. Retry Logic Service

**Purpose:** Implement exponential backoff retry logic with configurable parameters

**Configuration:**
- Initial delay: 1000ms
- Maximum delay: 30000ms (30 seconds)
- Maximum retry attempts: 3
- Backoff multiplier: 2

**Interface:**
```typescript
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface RetryService {
  executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    signal?: AbortSignal
  ): Promise<T>;
}
```

## Data Models

### Request Cache Entry
```typescript
interface CacheEntry {
  data: Phone[];
  timestamp: number;
  ttl: number;
  requestId: string;
}
```

### Request State
```typescript
interface RequestState {
  isLoading: boolean;
  retryCount: number;
  lastError: Error | null;
  abortController: AbortController | null;
}
```

## Error Handling

### Error Classification
1. **Network Errors**: `ERR_INSUFFICIENT_RESOURCES`, `Failed to fetch`
2. **HTTP Errors**: 404, 429, 500, etc.
3. **Timeout Errors**: Request timeout
4. **Abort Errors**: Request cancelled

### Error Recovery Strategies
1. **Network Errors**: Exponential backoff retry with longer delays
2. **HTTP 429 (Rate Limiting)**: Respect retry-after header or use exponential backoff
3. **HTTP 404**: No retry, mark specific phones as not found
4. **HTTP 500+**: Retry with exponential backoff
5. **Timeout**: Retry with increased timeout
6. **Abort**: No retry, clean state

### Error Display Strategy
- Show loading state during retries
- Display retry attempt count
- Provide manual retry option
- Show partial results when some phones load successfully

## Testing Strategy

### Unit Tests
1. **useComparisonState Hook Tests**
   - Request deduplication logic
   - AbortController cleanup
   - Retry mechanism
   - State management

2. **Request Manager Tests**
   - Cache hit/miss scenarios
   - Request cancellation
   - Concurrent request handling

3. **Retry Service Tests**
   - Exponential backoff calculation
   - Maximum retry limits
   - Error classification

### Integration Tests
1. **Compare Page Tests**
   - URL parameter changes
   - Component unmounting
   - Error state handling
   - Loading state management

2. **API Integration Tests**
   - Network failure simulation
   - Rate limiting scenarios
   - Partial data loading

### Performance Tests
1. **Memory Leak Tests**
   - Component mount/unmount cycles
   - Request cancellation verification

2. **Load Tests**
   - Multiple concurrent comparisons
   - Cache effectiveness
   - Request deduplication under load

## Implementation Approach

### Phase 1: Request Lifecycle Management
1. Implement AbortController integration
2. Add request deduplication logic
3. Implement proper cleanup mechanisms

### Phase 2: Retry Logic
1. Create retry service with exponential backoff
2. Integrate retry logic into fetchPhonesByIds
3. Add error classification and recovery strategies

### Phase 3: Caching and Optimization
1. Implement request cache with TTL
2. Add debouncing for rapid state changes
3. Optimize re-render cycles

### Phase 4: User Experience Improvements
1. Enhanced loading states
2. Retry attempt indicators
3. Partial data display
4. Manual retry options

## Security Considerations

1. **Request Validation**: Validate phone IDs before making API calls
2. **Rate Limiting**: Respect API rate limits and implement client-side throttling
3. **Memory Management**: Prevent memory leaks from uncancelled requests
4. **Error Information**: Avoid exposing sensitive error details to users

## Performance Considerations

1. **Request Deduplication**: Prevent duplicate API calls for same phone IDs
2. **Caching**: Cache successful responses to reduce API load
3. **Debouncing**: Debounce rapid state changes to prevent excessive requests
4. **Cleanup**: Proper cleanup of event listeners and timers
5. **Bundle Size**: Minimize impact on bundle size with efficient imports