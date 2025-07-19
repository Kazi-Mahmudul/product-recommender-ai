# Design Document: Phone Model Update

## Overview

This design document outlines the changes needed to update the phone model system to accommodate new camera detail columns and fix data type issues with several existing columns. The changes will affect the database model, Pydantic schemas, and data loading utilities.

## Architecture

The current system follows a standard FastAPI architecture with:
- SQLAlchemy ORM models in `app/models/`
- Pydantic schemas in `app/schemas/`
- CRUD operations in `app/crud/`
- Data loading utilities in `app/utils/`

The changes will be isolated to these components without affecting the overall architecture.

## Components and Interfaces

### 1. Database Model Updates

The `Phone` model in `app/models/phone.py` needs to be updated to:
- Add new columns: `main_camera` and `front_camera` as `String` type
- Change data types of the following columns from numeric types to `String`:
  - `screen_size_inches` (currently `Float`)
  - `pixel_density_ppi` (currently `Integer`)
  - `refresh_rate_hz` (currently `Integer`)
  - `display_brightness` (currently `String` - already correct)
  - `capacity` (currently `String` - already correct)
  - `weight` (currently `String` - already correct)
  - `thickness` (currently `String` - already correct)

### 2. Schema Updates

The Pydantic schema in `app/schemas/phone.py` needs to be updated to:
- Add new fields: `main_camera` and `front_camera` as `Optional[str]`
- Change data types of the following fields from numeric types to `Optional[str]`:
  - `screen_size_inches` (currently `Optional[float]`)
  - `pixel_density_ppi` (currently `Optional[int]`)
  - `refresh_rate_hz` (currently `Optional[int]`)
  - `display_brightness` (currently `Optional[str]` - already correct)
  - `capacity` (currently `Optional[str]` - already correct)
  - `weight` (currently `Optional[str]` - already correct)
  - `thickness` (currently `Optional[str]` - already correct)

### 3. Data Loader Updates

The data loader utility in `app/utils/data_loader.py` needs to be updated to:
- Add the new columns to the list of valid columns
- Remove the changed columns from the list of numeric columns
- Add the changed columns to the list of string columns

## Data Models

### Updated Phone Model

```python
# Partial example showing the changes
class Phone(Base):
    __tablename__ = "phones"
    
    # ... existing fields ...
    
    # Updated fields (changed from numeric to string)
    screen_size_inches = Column(String(255))  # Changed from Float
    pixel_density_ppi = Column(String(255))   # Changed from Integer
    refresh_rate_hz = Column(String(255))     # Changed from Integer
    display_brightness = Column(String(255))  # Already String
    capacity = Column(String(255))            # Already String
    weight = Column(String(255))              # Already String
    thickness = Column(String(255))           # Already String
    
    # New fields
    main_camera = Column(String(512))
    front_camera = Column(String(512))
    
    # ... rest of the fields ...
```

### Updated Phone Schema

```python
# Partial example showing the changes
class PhoneBase(BaseModel):
    # ... existing fields ...
    
    # Updated fields (changed from numeric to string)
    screen_size_inches: Optional[str] = None  # Changed from Optional[float]
    pixel_density_ppi: Optional[str] = None   # Changed from Optional[int]
    refresh_rate_hz: Optional[str] = None     # Changed from Optional[int]
    display_brightness: Optional[str] = None  # Already Optional[str]
    capacity: Optional[str] = None            # Already Optional[str]
    weight: Optional[str] = None              # Already Optional[str]
    thickness: Optional[str] = None           # Already Optional[str]
    
    # New fields
    main_camera: Optional[str] = None
    front_camera: Optional[str] = None
    
    # ... rest of the fields ...
```

## Error Handling

The existing error handling in the data loader is sufficient for the changes. It already:
- Logs errors when creating Phone objects
- Handles exceptions during data loading
- Rolls back database transactions on error

## Testing Strategy

1. **Unit Tests**:
   - Test the updated Phone model with string values for the changed fields
   - Test the updated Phone schema with string values for the changed fields
   - Test the data loader with a sample CSV containing the new columns and string values

2. **Integration Tests**:
   - Test loading a complete dataset with the new columns and string values
   - Test retrieving phone data with the new columns and string values

3. **Database Migration Testing**:
   - Test the migration script to ensure it properly updates the database schema
   - Verify that existing data is preserved during migration

## Database Migration

A database migration will be needed to:
1. Add the new columns: `main_camera` and `front_camera`
2. Change the data types of the affected columns

The migration will be created using Alembic with the following steps:
1. Generate a new migration script using `alembic revision -m "add_camera_columns_and_fix_datatypes"`
2. Implement the upgrade and downgrade functions in the migration script
3. Run the migration using `alembic upgrade head`