# Design Document

## Overview

This design document outlines the approach for enhancing the result sections of the ChatPage in the ePick application. The implementation will focus on ensuring consistent brand color application across all result components, improving the visual design of cards, charts, and tables, and adding navigation functionality to enable users to access detailed information and comparison features.

## Architecture

The changes will be implemented within the existing React component architecture of the frontend application. We'll be modifying the following key components:

1. **ChatPage Component**: Update the rendering of chat results to use enhanced components
2. **Component Styling**: Modify specific result components to use the correct brand colors and improved designs
3. **Component Functionality**: Enhance components with additional features like navigation and interactivity

## Components and Interfaces

### 1. Color System Updates

We'll ensure consistent use of the brand colors across all chat result components:

```javascript
// Brand colors to be used consistently
const brandColors = {
  green: "#377D5B",      // Main brand color - EpickGreen
  darkGreen: "#80EF80",  // Accent brand color - EpickDarkGreen
  
  // Light mode specific colors
  light: {
    background: "#f7f3ef",
    cardBackground: "#fff7f0",
    text: "#6b4b2b",
    highlight: "#d4a88d",
    highlightHover: "#b07b50",
    border: "#eae4da"
  },
  
  // Dark mode specific colors
  dark: {
    background: "#181818",
    cardBackground: "#232323",
    text: "#e2b892",
    highlight: "#e2b892",
    highlightHover: "#d4a88d",
    border: "#333333"
  }
};
```

### 2. Enhanced Phone Recommendation Card

The phone recommendation card will be redesigned to be more visually appealing and interactive:

```typescript
interface PhoneCardProps {
  phone: Phone;
  darkMode: boolean;
  onViewDetails: (phoneId: string) => void;
  onAddToCompare: (phone: Phone) => void;
}
```

Key design changes:
- Improved layout with better spacing and visual hierarchy
- Enhanced typography with proper font weights and sizes
- Hover effects for interactive elements
- Clear call-to-action buttons for "View Details" and "Compare"
- Consistent use of brand colors
- Responsive design for mobile devices

### 3. Enhanced Comparison Chart

The comparison chart will be updated to use the brand colors and provide more interactive features:

```typescript
interface ComparisonChartProps {
  features: Feature[];
  phones: Phone[];
  darkMode: boolean;
  onPhoneSelect: (phoneId: string) => void;
}
```

Key design changes:
- Use brand colors for chart elements
- Enhanced tooltips with more detailed information
- Hover effects for bars and other interactive elements
- Clear visual indicators for the best option in each category
- Responsive design for mobile devices

### 4. Enhanced Specification Table

The specification table will be redesigned to be more readable and organized:

```typescript
interface SpecificationTableProps {
  phones: Phone[];
  darkMode: boolean;
  onPhoneSelect: (phoneId: string) => void;
}
```

Key design changes:
- Improved layout with better spacing and alignment
- Enhanced typography with proper font weights and sizes
- Highlighting of important specifications or differences
- Grouping of specifications into logical categories
- Responsive design for mobile devices

### 5. Navigation Implementation

We'll implement navigation from chat results to detailed pages:

```typescript
// In ChatPage component
const handleViewDetails = (phoneId: string) => {
  navigate(`/phone/${phoneId}`);
};

const handleCompare = (phones: Phone[]) => {
  const phoneIds = phones.map(phone => phone.id).join(',');
  navigate(`/compare?phones=${phoneIds}`);
};
```

### 6. Comparison Feature Implementation

We'll add the ability to compare phones directly from chat results:

```typescript
// In ChatPage component
const [phonesToCompare, setPhonesToCompare] = useState<Phone[]>([]);

const handleAddToCompare = (phone: Phone) => {
  setPhonesToCompare(prev => {
    // Check if phone is already in the comparison list
    if (prev.some(p => p.id === phone.id)) {
      return prev;
    }
    // Limit to 4 phones maximum
    if (prev.length >= 4) {
      return [...prev.slice(1), phone];
    }
    return [...prev, phone];
  });
};

const handleCompareSelected = () => {
  if (phonesToCompare.length > 1) {
    handleCompare(phonesToCompare);
  }
};
```

## Data Models

No changes to data models are required for this implementation. We'll continue to use the existing data structures:

```typescript
interface Phone {
  id: string;
  name: string;
  brand: string;
  price: string;
  img_url: string;
  chipset?: string;
  cpu?: string;
  ram: string;
  internal_storage: string;
  main_camera: string;
  front_camera: string;
  display_type: string;
  screen_size_inches: string;
  battery_capacity_numeric: number;
  capacity?: string;
  overall_device_score: number;
  [key: string]: any;
}

interface Feature {
  key: string;
  label: string;
  percent: number[];
  raw: any[];
}

interface ComparisonResponse {
  type: "comparison";
  phones: Phone[];
  features: Feature[];
}
```

## Error Handling

- Ensure fallback styling is in place if brand colors are not applied correctly
- Handle navigation errors gracefully
- Implement error boundaries around new functionality
- Provide fallback UI for cases where data is missing or malformed

## Testing Strategy

1. **Visual Testing**: Verify that all components display the correct brand colors
2. **Interaction Testing**: Verify that hover states and interactive elements work as expected
3. **Navigation Testing**: Verify that clicking on buttons navigates to the correct pages
4. **Responsive Testing**: Verify that all components display correctly on different screen sizes
5. **Dark Mode Testing**: Verify that all components display correctly in both light and dark modes

## Implementation Considerations

1. **Performance**: Ensure that enhanced visualizations don't impact performance
2. **Accessibility**: Ensure that all interactive elements are keyboard accessible and have appropriate ARIA attributes
3. **Responsiveness**: Ensure that all components display correctly on different screen sizes
4. **Code Reusability**: Extract common styling and functionality into reusable components or hooks

## Design Mockups

### Enhanced Phone Recommendation Card

```
+-----------------------------------+
|                                   |
|  [Phone Image]       Brand Name   |
|                      Phone Name   |
|                                   |
|                      ★★★★☆ 4.5/5  |
|                                   |
|  Key Specs:                       |
|  • RAM: 8GB                       |
|  • Storage: 128GB                 |
|  • Display: 6.5" AMOLED           |
|  • Battery: 5000mAh               |
|                                   |
|  ৳ 25,000                         |
|                                   |
|  [View Details]    [+ Compare]    |
|                                   |
+-----------------------------------+
```

### Enhanced Comparison Chart

```
+-----------------------------------+
|                                   |
|  Feature Comparison               |
|                                   |
|  [Bar Chart with Brand Colors]    |
|                                   |
|  • Phone 1 leads in Performance   |
|  • Phone 2 leads in Camera        |
|  • Phone 3 leads in Battery       |
|                                   |
|  [View Detailed Comparison]       |
|                                   |
+-----------------------------------+
```

### Enhanced Specification Table

```
+-----------------------------------+
|                                   |
|  Specification Comparison         |
|                                   |
|  +-------+--------+--------+      |
|  |       | Phone1 | Phone2 |      |
|  +-------+--------+--------+      |
|  | Price | ৳25000 | ৳30000 |      |
|  +-------+--------+--------+      |
|  | RAM   | 8GB    | 12GB   |      |
|  +-------+--------+--------+      |
|  | ...   | ...    | ...    |      |
|  +-------+--------+--------+      |
|                                   |
|  [View Phone 1]  [View Phone 2]   |
|                                   |
+-----------------------------------+
```

### Comparison Feature UI

```
+-----------------------------------+
|                                   |
|  Selected for Comparison:         |
|                                   |
|  [Phone 1] [Phone 2] [+ Add More] |
|                                   |
|  [Compare Selected Phones]        |
|                                   |
+-----------------------------------+
```