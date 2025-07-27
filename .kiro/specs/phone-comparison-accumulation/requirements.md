# Requirements Document

## Introduction

The current phone comparison feature has a critical usability issue where clicking "Compare" buttons on individual phones navigates directly to a single-phone comparison page instead of allowing users to accumulate multiple phones for comparison. This feature will implement a proper comparison accumulation system that allows users to select multiple phones from different pages (PhonesPage, PhoneDetailsPage) and build up a comparison list before viewing the comparison results.

## Requirements

### Requirement 1

**User Story:** As a user browsing phones, I want to click "Compare" buttons on multiple phones to add them to a comparison list, so that I can compare several phones side-by-side without losing my previous selections.

#### Acceptance Criteria

1. WHEN a user clicks a "Compare" button on a phone THEN the system SHALL add that phone to a persistent comparison list
2. WHEN a phone is already in the comparison list AND the user clicks "Compare" on it THEN the system SHALL remove it from the comparison list
3. WHEN the comparison list reaches the maximum limit (5 phones) AND the user tries to add another phone THEN the system SHALL show an error message and not add the phone
4. WHEN a user navigates between different pages THEN the comparison list SHALL persist across page navigation

### Requirement 2

**User Story:** As a user with phones in my comparison list, I want to see a visual indicator of my current selections, so that I know which phones I've selected and can manage my comparison list.

#### Acceptance Criteria

1. WHEN phones are added to the comparison list THEN the system SHALL display a floating comparison widget showing selected phones
2. WHEN the comparison widget is displayed THEN it SHALL show phone thumbnails, names, and count (e.g., "3/5 selected")
3. WHEN a user clicks on a phone in the comparison widget THEN the system SHALL provide an option to remove that phone from the list
4. WHEN the comparison list is empty THEN the comparison widget SHALL be hidden

### Requirement 3

**User Story:** As a user with phones in my comparison list, I want to navigate to the comparison page to see detailed comparisons, so that I can make informed decisions about which phone to purchase.

#### Acceptance Criteria

1. WHEN the comparison widget is displayed AND contains at least 2 phones THEN it SHALL show an enabled "Compare Now" button
2. WHEN the comparison widget contains less than 2 phones THEN the "Compare Now" button SHALL be disabled with appropriate messaging
3. WHEN a user clicks "Compare Now" THEN the system SHALL navigate to the comparison page with all selected phone IDs in the URL
4. WHEN a user navigates to the comparison page THEN the comparison list SHALL be cleared after successful navigation

### Requirement 4

**User Story:** As a user on phone listing pages, I want to see visual feedback on which phones I've already selected for comparison, so that I don't accidentally select the same phone multiple times.

#### Acceptance Criteria

1. WHEN a phone is in the comparison list THEN its "Compare" button SHALL show a different visual state (e.g., filled/selected appearance)
2. WHEN a phone is in the comparison list THEN the button text or icon SHALL indicate it's selected (e.g., "Added" or checkmark)
3. WHEN a user hovers over a selected phone's compare button THEN it SHALL show "Remove from comparison" tooltip
4. WHEN a user hovers over an unselected phone's compare button THEN it SHALL show "Add to comparison" tooltip

### Requirement 5

**User Story:** As a user, I want my comparison selections to persist during my browsing session, so that I don't lose my selections if I accidentally refresh the page or navigate away.

#### Acceptance Criteria

1. WHEN a user adds phones to the comparison list THEN the selections SHALL be stored in browser localStorage
2. WHEN a user refreshes the page or returns to the site THEN their previous comparison selections SHALL be restored
3. WHEN a user explicitly clears their comparison or completes a comparison THEN the localStorage SHALL be cleared
4. WHEN localStorage contains invalid phone IDs THEN the system SHALL gracefully handle the error and remove invalid entries