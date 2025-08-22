# Top Searched Phones Pipeline

This pipeline collects search interest data for phones in Bangladesh using Google Trends API (pytrends) and updates the `top_searched` table in the database.

## How it works

1. The pipeline queries the database for popular phone brands (Samsung, Apple, Xiaomi, etc.)
2. It extracts keywords from phone brand and model names
3. It uses the pytrends library to get search interest data from Google Trends for Bangladesh (geo='BD')
4. It matches the trend data with phones in the database
5. It calculates rankings based on search interest
6. It stores the results in the `top_searched` table

## Running the pipeline

### Manual execution

```bash
cd C:\product_recommender
python pipeline/top_searched.py
```

### Using the run script

```bash
cd C:\product_recommender\pipeline
python run_top_searched.py
```

## Configuration

The pipeline focuses on popular phone brands in Bangladesh:
- Samsung
- Apple
- Xiaomi
- Oppo
- Vivo
- Realme
- Huawei
- OnePlus
- Motorola
- Nokia
- Sony

## Schedule

The pipeline should be run periodically (e.g., daily or weekly) to keep the data up to date.

## API Endpoint

The pipeline populates data for the API endpoint:
`GET /api/v1/top-searched/`

This endpoint returns the top searched phones in Bangladesh with their rankings.