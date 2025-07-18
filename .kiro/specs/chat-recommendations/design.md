# Design Document: Enhanced Chat Recommendations UI

## Overview

This design document outlines the approach for improving the visual presentation of phone recommendations in the chat interface. The primary goals are to simplify the badge system, create a more aesthetically pleasing design, and ensure a consistent visual hierarchy that highlights the most important information for each recommended phone.

## Architecture

The enhanced recommendation UI will maintain the existing data flow architecture:

1. User submits a query to the chat interface
2. Backend processes the query and returns phone recommendations
3. Frontend renders the recommendations in the chat interface

The changes will focus on the presentation layer (frontend) without modifying the underlying data structure or API contracts.

## Components and Interfaces

### Badge Selection Component

A new utility component will be created to handle badge selection logic:

```typescript
// Simplified interface for badge selection
interface BadgeSelectionProps {
  phone: Phone;
  recommendations: RecommendationData;
}

// Returns the most relevant badge for a phone
function selectPrimaryBadge(props: BadgeSelectionProps): Badge;
```

The badge selection algorithm will prioritize badges in the following order:
1. Value-based badges (Best Value)
2. Feature-specific badges (Battery King, Top Camera)
3. Status badges (New Launch, Popular)

### Enhanced Phone Card Component

The phone card component will be redesigned with the following structure:

```jsx
<PhoneCard>
  <CardHeader>
    <PrimaryBadge />
    <BrandName />
  </CardHeader>
  <CardBody>
    <PhoneImage />
    <PhoneDetails>
      <PhoneName />
      <PhonePrice />
      <KeySpecifications />
    </PhoneDetails>
  </CardBody>
  <CardFooter>
    <HighlightFeature />
  </CardFooter>
</PhoneCard>
```

### Recommendation Section Component

The recommendation section will be redesigned to provide a consistent container for phone cards:

```jsx
<RecommendationSection>
  <SectionHeader>
    <Title>Based on your query, here are some recommendations:</Title>
  </SectionHeader>
  <PhoneCardGrid>
    {phones.map(phone => <PhoneCard phone={phone} />)}
  </PhoneCardGrid>
</RecommendationSection>
```

## Data Models

The existing data models will be used, with a focus on extracting and prioritizing the most relevant information:

```typescript
interface Phone {
  id: number;
  name: string;
  brand: string;
  price: string;
  img_url: string;
  // Other phone specifications
}

interface RecommendationData {
  phone: Phone;
  score: number;
  match_reason: string;
  highlights?: string[];
  badges?: string[];
}

interface Badge {
  type: 'value' | 'feature' | 'status';
  label: string;
  priority: number;
}
```

## Design System

### Color Palette

The recommendation UI will use a refined color palette that aligns with the application's design language:

- **Primary**: `#6A7FDB` (soft blue) - Used for primary actions and emphasis
- **Secondary**: `#F7F9FB` (off-white) - Used for card backgrounds
- **Accent**: `#FF9A76` (soft coral) - Used for highlighting important information
- **Text Primary**: `#2D3142` (dark blue-gray) - Used for primary text
- **Text Secondary**: `#747A8C` (medium gray) - Used for secondary text
- **Border**: `#E1E5EB` (light gray) - Used for card borders and dividers
- **Badge Background**: `#EDF2F7` (very light blue-gray) - Used for badge backgrounds
- **Badge Text**: `#4A5568` (medium blue-gray) - Used for badge text

### Typography

- **Phone Name**: 16px, 600 weight
- **Brand Name**: 14px, 400 weight
- **Price**: 18px, 700 weight
- **Badge Text**: 12px, 600 weight
- **Specifications**: 13px, 400 weight
- **Highlight Feature**: 14px, 500 weight

### Spacing System

- **Card Padding**: 16px
- **Section Padding**: 24px
- **Card Gap**: 16px
- **Element Spacing**: 8px

### Badge Design

Badges will follow a consistent design:
- Subtle rounded corners (border-radius: 4px)
- Light background with contrasting text
- Small icon when appropriate
- Compact size to avoid visual clutter

## Error Handling

1. If no badges are available, no badge will be shown rather than displaying a placeholder
2. If the phone image fails to load, a placeholder image will be displayed
3. If key specifications are missing, those fields will be omitted rather than showing "N/A"

## Testing Strategy

1. **Unit Tests**:
   - Test badge selection algorithm with various phone data
   - Test phone card rendering with different data combinations
   - Test responsive behavior with various viewport sizes

2. **Visual Regression Tests**:
   - Compare before/after screenshots of the recommendation UI
   - Ensure consistent rendering across different browsers

3. **User Testing**:
   - Gather feedback on the clarity and visual appeal of the new design
   - Measure user engagement with the recommendations

## Mockups

### Phone Card Design

```
┌────────────────────────────┐
│ [Badge]       Brand Name   │
│                            │
│  ┌────────┐                │
│  │        │  Phone Name    │
│  │ Phone  │                │
│  │ Image  │  ₹45,000       │
│  │        │                │
│  └────────┘  50MP | 5000mAh│
│               12GB | 256GB │
│                            │
│ ✨ Key Highlight Feature   │
└────────────────────────────┘
```

### Recommendation Section

```
┌────────────────────────────────────────────────────────────────┐
│ Based on your query, here are some recommendations:            │
│                                                                │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐       │
│ │ Phone Card 1   │ │ Phone Card 2   │ │ Phone Card 3   │       │
│ └────────────────┘ └────────────────┘ └────────────────┘       │
│                                                                │
│ ┌────────────────┐ ┌────────────────┐                          │
│ │ Phone Card 4   │ │ Phone Card 5   │                          │
│ └────────────────┘ └────────────────┘                          │
└────────────────────────────────────────────────────────────────┘
```

## Responsive Design

The recommendation section will adapt to different screen sizes:

- **Desktop**: Grid layout with 3-4 cards per row
- **Tablet**: Grid layout with 2 cards per row
- **Mobile**: Single column layout with full-width cards

Card content will remain consistent across devices, with adjustments to font sizes and image dimensions to ensure readability on smaller screens.