# Design Document

## Overview

The phone comparison page is a comprehensive feature that allows users to compare up to 5 smartphones side-by-side with detailed specifications, AI-powered insights, and interactive visualizations. The design follows the existing Epick brand guidelines with EpickDarkGreen as the primary color and maintains consistency with the current React/TypeScript architecture.

## Architecture

### Component Structure
```
ComparePage/
├── ComparisonPage.tsx (Main container)
├── components/
│   ├── StickyProductCards.tsx (Sticky overview cards)
│   ├── ComparisonTable.tsx (Feature-by-feature table)
│   ├── MetricChart.tsx (Recharts visualization)
│   ├── AIVerdictBlock.tsx (AI insights section)
│   ├── PhonePickerModal.tsx (Add/change phone modal)
│   └── ComparisonActions.tsx (Export/share actions)
├── hooks/
│   ├── useComparisonState.ts (State management)
│   ├── usePhoneSelection.ts (Phone selection logic)
│   └── useAIVerdict.ts (AI verdict generation)
└── utils/
    ├── comparisonUtils.ts (Comparison logic)
    ├── slugUtils.ts (URL slug generation)
    └── exportUtils.ts (PDF export functionality)
```

### Routing Architecture
- **Dynamic Route**: `/compare/:phoneIds` where phoneIds is a dash-separated list of phone IDs
- **Slug Format**: `/compare/poco-x6-vs-redmi-note-13` (generated from phone names)
- **URL State Management**: Phone selection synced with URL for shareability
- **Navigation Integration**: Seamless integration with existing PhonesPage and PhoneDetailsPage

### State Management
- **Local State**: React hooks for component-level state
- **URL State**: Phone selection persisted in URL parameters
- **Local Storage**: Comparison history and user preferences
- **Context**: Shared comparison state across components when needed

## Components and Interfaces

### 1. StickyProductCards Component
```typescript
interface StickyProductCardsProps {
  phones: Phone[];
  verdictBadges: Record<number, string>;
  onRemovePhone: (phoneId: number) => void;
  onChangePhone: (phoneId: number) => void;
  onAddPhone: () => void;
  maxPhones: number;
}
```

**Features:**
- Sticky positioning during scroll
- Responsive horizontal layout
- Remove/Change buttons for each phone
- Add phone button (when under 5 phones)
- Verdict badges display
- Mobile-optimized touch interactions

### 2. ComparisonTable Component
```typescript
interface ComparisonTableProps {
  phones: Phone[];
  specifications: SpecificationRow[];
  highlightBest: boolean;
}

interface SpecificationRow {
  key: string;
  label: string;
  getValue: (phone: Phone) => string | number | null;
  compareFunction?: (a: any, b: any) => number;
  formatValue?: (value: any) => string;
}
```

**Features:**
- Responsive table with horizontal scroll on mobile
- Best value highlighting with green background
- Sortable columns
- Missing data handling with "N/A" placeholders
- Accessibility-compliant table structure

### 3. MetricChart Component
```typescript
interface MetricChartProps {
  phones: Phone[];
  metrics: ChartMetric[];
  chartType: 'bar' | 'radar';
}

interface ChartMetric {
  key: string;
  label: string;
  getValue: (phone: Phone) => number;
  maxValue: number;
  color: string;
}
```

**Features:**
- Recharts-based horizontal bar chart
- Responsive design for mobile/desktop
- Interactive tooltips with detailed values
- Color-coded bars for different phones
- Normalized metrics for fair comparison

### 4. AIVerdictBlock Component
```typescript
interface AIVerdictBlockProps {
  phones: Phone[];
  verdict: string | null;
  isLoading: boolean;
  onAskMore: () => void;
  onRetry: () => void;
}
```

**Features:**
- AI-generated comparison insights using Gemini API
- Loading states and error handling
- "Ask AI More" button integration with ChatPage
- Retry functionality for failed requests
- Fallback content when AI is unavailable

### 5. PhonePickerModal Component
```typescript
interface PhonePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhone: (phone: Phone) => void;
  excludePhoneIds: number[];
  suggestedPhones?: Phone[];
}
```

**Features:**
- Search functionality for phone selection
- Suggested phones based on current comparison
- Exclusion of already selected phones
- Responsive modal design
- Keyboard navigation support

## Data Models

### Extended Phone Interface
The existing `Phone` interface from `api/phones.ts` will be used with additional computed properties:

```typescript
interface ComparisonPhone extends Phone {
  // Computed properties for comparison
  verdictBadge?: string;
  comparisonScore?: number;
  highlights?: string[];
  
  // Normalized metrics for charting
  normalizedMetrics?: {
    price: number;
    performance: number;
    camera: number;
    battery: number;
    display: number;
    storage: number;
  };
}
```

### Comparison State
```typescript
interface ComparisonState {
  phones: ComparisonPhone[];
  selectedPhoneIds: number[];
  aiVerdict: string | null;
  isLoadingVerdict: boolean;
  comparisonHistory: ComparisonHistoryItem[];
  preferences: ComparisonPreferences;
}

interface ComparisonHistoryItem {
  id: string;
  phoneIds: number[];
  timestamp: Date;
  title: string;
}

interface ComparisonPreferences {
  highlightBest: boolean;
  chartType: 'bar' | 'radar';
  defaultMetrics: string[];
}
```

## Error Handling

### API Error Handling
- **Phone Not Found**: Graceful handling with user notification and suggestion to select alternative
- **AI Service Unavailable**: Fallback to basic comparison without AI insights
- **Network Errors**: Retry mechanisms with exponential backoff
- **Rate Limiting**: User-friendly messages with retry suggestions

### User Experience Errors
- **Invalid URLs**: Redirect to comparison page with error message
- **Unsupported Phone Count**: Prevent addition beyond 5 phones with clear messaging
- **Missing Data**: Display "N/A" with tooltips explaining data unavailability

## Testing Strategy

### Unit Tests
- Component rendering with various phone combinations
- Utility functions for slug generation and data formatting
- Hook behavior for state management
- API integration error scenarios

### Integration Tests
- End-to-end comparison flow from phone selection to AI verdict
- URL state synchronization
- Modal interactions and phone selection
- Export functionality

### Accessibility Tests
- Screen reader compatibility
- Keyboard navigation
- Color contrast compliance
- ARIA label correctness

### Performance Tests
- Large dataset handling (5 phones with full specs)
- Chart rendering performance
- Mobile responsiveness
- Memory leak prevention

## AI Integration

### Gemini API Integration
The comparison page will leverage the existing Gemini API integration pattern found in `api/gemini.ts`:

```typescript
interface ComparisonPrompt {
  phones: Phone[];
  userContext?: string;
  comparisonType: 'general' | 'specific' | 'budget' | 'feature';
}

async function generateComparisonVerdict(prompt: ComparisonPrompt): Promise<string> {
  // Use existing fetchGeminiSummary with structured prompt
  const structuredPrompt = buildComparisonPrompt(prompt);
  return await fetchGeminiSummary(structuredPrompt);
}
```

### AI Verdict Generation
- **Context-Aware Prompts**: Include user preferences and comparison context
- **Structured Output**: Request specific format for consistent display
- **Fallback Strategies**: Handle API failures gracefully
- **Caching**: Cache verdicts for identical phone combinations

## Mobile Responsiveness

### Breakpoint Strategy
- **Mobile (< 768px)**: Stacked layout with horizontal scrolling for table
- **Tablet (768px - 1024px)**: Hybrid layout with collapsible sections
- **Desktop (> 1024px)**: Full side-by-side comparison layout

### Touch Interactions
- **Swipe Navigation**: Horizontal swipe for table navigation on mobile
- **Touch-Friendly Buttons**: Minimum 44px touch targets
- **Gesture Support**: Pinch-to-zoom for detailed chart viewing

### Performance Optimizations
- **Lazy Loading**: Load phone images and detailed specs on demand
- **Virtual Scrolling**: For large specification tables
- **Code Splitting**: Separate bundles for comparison page components

## Integration Points

### Navigation Integration
- **Navbar**: Add "Compare" link to main navigation
- **Sidebar**: Include comparison page in mobile sidebar menu
- **Breadcrumbs**: Show comparison context in page navigation

### Existing Page Integration
- **PhonesPage**: Add "Compare" buttons to phone cards
- **PhoneDetailsPage**: Add "Compare" button in hero section
- **ChatPage**: Handle comparison queries and redirect to comparison page

### API Integration
- **Phone API**: Extend existing `fetchPhoneById` for bulk phone fetching
- **Recommendation API**: Integrate with existing recommendation system
- **Gemini API**: Use existing AI integration for verdict generation

## Security Considerations

### Input Validation
- **Phone ID Validation**: Ensure valid phone IDs in URL parameters
- **SQL Injection Prevention**: Sanitize all database queries
- **XSS Protection**: Sanitize user-generated content in AI responses

### Rate Limiting
- **AI API Calls**: Implement client-side rate limiting for Gemini API
- **Export Functionality**: Limit PDF generation frequency
- **Phone Data Fetching**: Cache phone data to reduce API calls

### Privacy
- **Comparison History**: Store locally, not on server
- **User Preferences**: Local storage only
- **Analytics**: Anonymized usage tracking only