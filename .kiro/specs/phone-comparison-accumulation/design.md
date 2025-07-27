# Design Document

## Overview

This design implements a phone comparison accumulation system that allows users to build up a comparison list by clicking "Compare" buttons across different pages. The system uses React Context for global state management, localStorage for persistence, and provides a floating comparison widget for user feedback and navigation.

The solution follows the existing patterns in the codebase, leveraging the current Context API approach (similar to AuthContext) and localStorage usage patterns already established for comparison history and caching.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   UI Components │    │ Comparison       │    │   localStorage  │
│   (PhoneCard,   │◄──►│ Context & Hook   │◄──►│   Persistence   │
│   PhoneDetails, │    │                  │    │                 │
│   ComparePage)  │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│ Comparison      │    │ URL Navigation   │
│ Widget          │    │ & State Sync     │
│ (Floating UI)   │    │                  │
└─────────────────┘    └──────────────────┘
```

### Component Hierarchy

```
App
├── ComparisonProvider (New Context Provider)
│   ├── Navbar
│   ├── Routes
│   │   ├── PhonesPage
│   │   │   └── PhoneCard (Modified)
│   │   ├── PhoneDetailsPage (Modified)
│   │   └── ComparePage (Modified)
│   └── ComparisonWidget (New Floating Component)
```

## Components and Interfaces

### 1. ComparisonContext (New)

**Purpose**: Global state management for comparison accumulation

**Interface**:
```typescript
interface ComparisonContextType {
  // State
  selectedPhones: Phone[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addPhone: (phone: Phone) => void;
  removePhone: (phoneId: string) => void;
  clearComparison: () => void;
  isPhoneSelected: (phoneId: string) => boolean;
  navigateToComparison: () => void;
}
```

**Key Features**:
- Manages up to 5 phones in comparison list
- Persists state to localStorage with key `epick_comparison_selection`
- Provides validation and error handling
- Integrates with existing URL-based comparison system

### 2. useComparison Hook (New)

**Purpose**: Custom hook that provides comparison context functionality

**Interface**:
```typescript
function useComparison(): ComparisonContextType
```

**Implementation Details**:
- Wraps ComparisonContext usage
- Provides type safety and error handling
- Follows existing hook patterns in the codebase

### 3. ComparisonWidget (New Component)

**Purpose**: Floating UI widget showing current comparison selections

**Props**:
```typescript
interface ComparisonWidgetProps {
  // No props needed - uses context
}
```

**Features**:
- Fixed positioning at bottom of screen
- Shows selected phone thumbnails and names
- Displays count (e.g., "3/5 selected")
- Remove buttons for each phone
- "Compare Now" button (enabled when ≥2 phones)
- Responsive design for mobile/desktop
- Auto-hide when empty

### 4. Modified PhoneCard Component

**Changes**:
- Replace direct navigation with comparison context usage
- Update button appearance based on selection state
- Add tooltips for selected/unselected states
- Maintain existing styling and layout

**New Props**:
```typescript
interface PhoneCardProps {
  phone: Phone;
  onFullSpecs: () => void;
  // onCompare removed - handled internally via context
}
```

### 5. Modified PhoneDetailsPage Component

**Changes**:
- Replace direct navigation with comparison context usage
- Update compare button to use context
- Show selection state in button

### 6. Modified ComparePage Component

**Changes**:
- Clear comparison selections after successful navigation
- Maintain existing functionality for URL-based comparisons
- Handle edge cases where context and URL state differ

## Data Models

### ComparisonSelection (localStorage)

```typescript
interface ComparisonSelection {
  phones: Phone[];
  timestamp: number;
  version: string; // For future migration compatibility
}
```

**Storage Key**: `epick_comparison_selection`

**Storage Strategy**:
- Save on every add/remove operation
- Load on app initialization
- Clear after successful comparison navigation
- Handle corruption gracefully with fallback to empty state

### Phone Data Structure

Uses existing `Phone` interface from `types/phone.ts` with the following key fields for comparison widget:
- `id`: Unique identifier
- `name`: Display name
- `brand`: Brand name
- `img_url`: Thumbnail image
- `price`: Price display

## Error Handling

### Validation Rules

1. **Maximum Limit**: Prevent adding more than 5 phones
2. **Duplicate Prevention**: Don't allow same phone twice
3. **Invalid Phone Data**: Handle missing required fields
4. **localStorage Errors**: Graceful fallback when storage fails

### Error States

```typescript
type ComparisonError = 
  | 'MAX_PHONES_REACHED'
  | 'PHONE_ALREADY_SELECTED'
  | 'INVALID_PHONE_DATA'
  | 'STORAGE_ERROR'
  | 'NETWORK_ERROR';
```

### Error Handling Strategy

- Show user-friendly error messages in ComparisonWidget
- Auto-clear errors after 5 seconds
- Provide retry mechanisms where appropriate
- Log detailed errors to console for debugging

## Testing Strategy

### Unit Tests

1. **ComparisonContext Tests**:
   - Add/remove phone functionality
   - Maximum limit enforcement
   - Duplicate prevention
   - localStorage persistence
   - Error handling

2. **ComparisonWidget Tests**:
   - Rendering with different phone counts
   - Button states and interactions
   - Responsive behavior
   - Error display

3. **Modified Component Tests**:
   - PhoneCard selection state display
   - PhoneDetailsPage integration
   - ComparePage clearing behavior

### Integration Tests

1. **Cross-Page Navigation**:
   - Add phones from PhonesPage
   - Navigate to PhoneDetailsPage
   - Verify selections persist
   - Complete comparison flow

2. **localStorage Persistence**:
   - Page refresh scenarios
   - Browser tab switching
   - Storage quota handling

### E2E Tests

1. **Complete User Journey**:
   - Browse phones → Select multiple → Compare → Clear
   - Error scenarios (max limit, duplicates)
   - Mobile responsive behavior

## Implementation Phases

### Phase 1: Core Context and Hook
- Create ComparisonContext and Provider
- Implement useComparison hook
- Add localStorage persistence
- Basic error handling

### Phase 2: UI Components
- Create ComparisonWidget component
- Implement floating positioning and responsive design
- Add phone thumbnails and remove functionality

### Phase 3: Component Integration
- Modify PhoneCard component
- Update PhoneDetailsPage
- Integrate with existing ComparePage

### Phase 4: Polish and Testing
- Add animations and transitions
- Implement comprehensive error handling
- Add unit and integration tests
- Performance optimization

## Technical Considerations

### Performance
- Minimize re-renders using React.memo and useMemo
- Debounce localStorage writes if needed
- Lazy load phone images in widget

### Accessibility
- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader compatibility
- Focus management

### Browser Compatibility
- localStorage availability detection
- Graceful degradation for older browsers
- Mobile touch interactions

### Security
- Sanitize phone data before storage
- Validate data structure on load
- Handle malicious localStorage manipulation

## Migration Strategy

### Backward Compatibility
- Existing URL-based comparison continues to work
- No breaking changes to existing components
- Gradual rollout possible

### Data Migration
- No existing data to migrate
- Version field in storage for future migrations
- Graceful handling of old/invalid data formats