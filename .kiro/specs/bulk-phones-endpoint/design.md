# Design Document

## Overview

The bulk phones endpoint will provide an efficient way to fetch multiple phones in a single API request. This endpoint will be implemented as `/api/v1/phones/bulk?ids=1,2,3` and will leverage existing database infrastructure while adding optimized bulk retrieval capabilities.

The design focuses on performance optimization through single database queries, proper error handling for partial failures, and maintaining compatibility with existing phone data structures.

## Architecture

### API Endpoint Design
- **Route**: `GET /api/v1/phones/bulk`
- **Query Parameter**: `ids` (comma-separated list of phone IDs)
- **Response Format**: JSON with `phones` array and `not_found` array
- **Integration**: Added to existing `app/api/endpoints/phones.py` router

### Database Layer Enhancement
- **New CRUD Function**: `get_phones_by_ids()` in `app/crud/phone.py`
- **Query Optimization**: Single database query using SQLAlchemy `IN` clause
- **Data Transformation**: Reuse existing `phone_to_dict()` function for consistency

### Error Handling Strategy
- **Input Validation**: Parse and validate comma-separated IDs
- **Partial Success**: Return found phones even if some IDs are invalid
- **Rate Limiting**: Maximum 50 phone IDs per request
- **HTTP Status Codes**: 200 for success, 400 for bad input, 422 for validation errors

## Components and Interfaces

### 1. API Endpoint Component

```python
@router.get("/bulk", response_model=BulkPhonesResponse)
def get_phones_bulk(
    ids: str = Query(..., description="Comma-separated phone IDs"),
    db: Session = Depends(get_db)
):
```

**Input Interface:**
- `ids`: String containing comma-separated phone IDs (e.g., "1,2,3,4")

**Output Interface:**
```python
class BulkPhonesResponse(BaseModel):
    phones: List[Phone]
    not_found: List[int]
    total_requested: int
    total_found: int
```

### 2. CRUD Layer Component

```python
def get_phones_by_ids(db: Session, phone_ids: List[int]) -> Tuple[List[Phone], List[int]]:
```

**Functionality:**
- Execute single database query with `IN` clause
- Return tuple of (found_phones, not_found_ids)
- Maintain order based on input ID sequence

### 3. Input Validation Component

```python
def parse_and_validate_ids(ids_string: str) -> List[int]:
```

**Validation Rules:**
- Parse comma-separated string to integers
- Remove duplicates while preserving order
- Validate maximum 50 IDs per request
- Raise appropriate exceptions for invalid input

## Data Models

### Request Model
```python
# Query parameter validation
ids: str = Query(
    ..., 
    description="Comma-separated phone IDs (max 50)",
    regex=r"^[\d,\s]+$"
)
```

### Response Model
```python
class BulkPhonesResponse(BaseModel):
    phones: List[Phone]  # Existing Phone schema
    not_found: List[int]  # IDs that weren't found
    total_requested: int  # Total IDs requested
    total_found: int     # Total phones found
```

### Database Query Model
```python
# SQLAlchemy query structure
query = db.query(Phone).filter(Phone.id.in_(phone_ids))
```

## Error Handling

### Input Validation Errors
- **Empty IDs**: Return 400 with "No phone IDs provided"
- **Invalid Format**: Return 400 with "Invalid ID format"
- **Too Many IDs**: Return 400 with "Maximum 50 IDs allowed"
- **Non-numeric IDs**: Return 422 with details about invalid IDs

### Database Errors
- **Connection Issues**: Return 500 with generic error message
- **Query Timeout**: Return 500 with timeout message
- **Partial Results**: Return 200 with available data and not_found list

### Response Structure for Errors
```python
{
    "detail": "Error message",
    "error_code": "VALIDATION_ERROR|DATABASE_ERROR|RATE_LIMIT_ERROR",
    "invalid_ids": [list of problematic IDs] # for validation errors
}
```

## Testing Strategy

### Unit Tests
1. **Input Validation Tests**
   - Valid comma-separated IDs
   - Invalid ID formats
   - Empty input handling
   - Rate limiting (>50 IDs)

2. **CRUD Function Tests**
   - Single ID retrieval
   - Multiple valid IDs
   - Mix of valid/invalid IDs
   - Database connection errors

3. **Response Format Tests**
   - Correct phone data structure
   - Not found IDs handling
   - Count accuracy

### Integration Tests
1. **End-to-End API Tests**
   - Complete request/response cycle
   - Error response formats
   - Performance with maximum IDs

2. **Database Integration Tests**
   - Query optimization verification
   - Transaction handling
   - Connection pooling behavior

### Performance Tests
1. **Load Testing**
   - 50 IDs per request performance
   - Concurrent request handling
   - Memory usage patterns

2. **Database Performance**
   - Query execution time measurement
   - Index utilization verification
   - Connection pool efficiency

## Implementation Sequence

### Phase 1: Core Functionality
1. Add `BulkPhonesResponse` schema
2. Implement `get_phones_by_ids()` CRUD function
3. Create input validation helper
4. Add bulk endpoint to router

### Phase 2: Error Handling
1. Add comprehensive input validation
2. Implement error response formatting
3. Add rate limiting logic
4. Handle database exceptions

### Phase 3: Optimization
1. Add query performance monitoring
2. Implement response caching headers
3. Add request logging
4. Optimize database query execution

### Phase 4: Testing & Documentation
1. Write comprehensive unit tests
2. Add integration tests
3. Performance testing
4. API documentation updates