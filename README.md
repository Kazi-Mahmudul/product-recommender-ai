# Mobile Phone Recommender API

A scalable FastAPI-based API for storing and serving mobile phone data. This API is designed to power an AI-based product recommendation and comparison system.

## Project Structure

```
product_recommender/
├── .env                    # Environment variables
├── alembic.ini             # Alembic configuration
├── requirements.txt        # Dependencies
├── .gitignore              # Git ignore file
├── alembic/                # Database migrations
│   └── versions/           
├── app/
│   ├── __init__.py
│   ├── main.py             # FastAPI application
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py       # Configuration from environment
│   │   └── database.py     # Database connection
│   ├── models/
│   │   ├── __init__.py
│   │   └── phone.py        # SQLAlchemy models
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── phone.py        # Pydantic models
│   ├── crud/
│   │   ├── __init__.py
│   │   └── phone.py        # Database operations
│   ├── api/
│   │   ├── __init__.py
│   │   ├── api.py          # API router
│   │   └── endpoints/
│   │       ├── __init__.py
│   │       └── phones.py   # Phone endpoints
│   └── utils/
│       ├── __init__.py
│       └── data_loader.py  # CSV to DB loader
└── scripts/
    └── load_data.py        # Script to load initial data
```

## Setup Instructions

### 1. Prerequisites

- Python 3.8+
- MySQL 8.0+
- Git

### 2. Create MySQL Database

Connect to MySQL and run:

```sql
CREATE DATABASE product_recommender;
CREATE USER 'product_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON product_recommender.* TO 'product_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Clone Repository

```bash
git clone <repository-url>
cd product_recommender
```

### 4. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
```

### 5. Install Dependencies

```bash
pip install -r requirements.txt
```

### 6. Configure Environment Variables

Copy the example `.env` file and modify it:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```
DATABASE_URL=mysql+pymysql://product_user:secure_password@localhost/product_recommender
DEBUG=True
API_PREFIX=/api/v1
```

### 7. Create Database Tables

Option 1: Using the script:

```bash
python scripts/load_data.py --create-tables
```

Option 2: Using Alembic:

```bash
alembic revision --autogenerate -m "Create initial tables"
alembic upgrade head
```

### 8. Load Data

```bash
python scripts/load_data.py --csv mobiledokan_data.csv
```

### 9. Run the API

```bash
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

## API Documentation

Interactive API documentation is available at:
- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc

## API Endpoints

The API provides the following endpoints:

- `GET /api/v1/phones/`: Get a paginated list of phones with optional filtering
- `GET /api/v1/phones/{phone_id}`: Get a specific phone by ID
- `GET /api/v1/phones/name/{phone_name}`: Get a specific phone by name
- `GET /api/v1/phones/brands`: Get all unique phone brands
- `GET /api/v1/phones/price-range`: Get the minimum and maximum phone prices

## Future Plans

This API will be integrated with:
- AI-powered product comparison
- Natural language query support
- Chart-based visualization
- Recommendation engine

## Deployment

For production deployment:
1. Set `DEBUG=False` in `.env`
2. Use a proper WSGI server like Gunicorn
3. Set up a reverse proxy with Nginx
4. Configure SSL/TLS

Example production deployment:

```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app
```