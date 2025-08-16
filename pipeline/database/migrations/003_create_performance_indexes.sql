-- Create performance optimization indexes
-- Migration: 003_create_performance_indexes.sql

-- Partial indexes for non-null values (more efficient)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_price_original_not_null 
    ON phones(price_original) WHERE price_original IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_overall_score_not_null 
    ON phones(overall_device_score) WHERE overall_device_score IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_performance_score_not_null 
    ON phones(performance_score) WHERE performance_score IS NOT NULL;

-- Composite indexes for common filtering patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_brand_category_score 
    ON phones(brand, price_category, overall_device_score DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_popular_category_score 
    ON phones(is_popular_brand, price_category, overall_device_score DESC) 
    WHERE is_popular_brand = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_new_releases_score 
    ON phones(is_new_release, overall_device_score DESC) 
    WHERE is_new_release = true;

-- Indexes for recommendation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_price_range_score 
    ON phones(price_original, overall_device_score DESC) 
    WHERE price_original IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_ram_storage_score 
    ON phones(ram_gb, storage_gb, overall_device_score DESC) 
    WHERE ram_gb IS NOT NULL AND storage_gb IS NOT NULL;

-- Indexes for camera-focused queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_camera_features 
    ON phones(camera_count, primary_camera_mp, camera_score DESC) 
    WHERE camera_count IS NOT NULL;

-- Indexes for performance-focused queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_performance_features 
    ON phones(processor_rank, ram_gb, performance_score DESC) 
    WHERE processor_rank IS NOT NULL;

-- Indexes for battery-focused queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_battery_features 
    ON phones(battery_capacity_numeric, has_fast_charging, battery_score DESC) 
    WHERE battery_capacity_numeric IS NOT NULL;

-- Text search indexes for name and brand
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_name_trgm 
    ON phones USING gin(name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_brand_trgm 
    ON phones USING gin(brand gin_trgm_ops);

-- Enable trigram extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Functional indexes for case-insensitive searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_name_lower 
    ON phones(lower(name));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_brand_lower 
    ON phones(lower(brand));

-- Index for pipeline management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_pipeline_managed 
    ON phones(is_pipeline_managed, scraped_at DESC) 
    WHERE is_pipeline_managed = true;

-- Index for data quality monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_quality_score 
    ON phones(data_quality_score DESC, scraped_at DESC) 
    WHERE data_quality_score IS NOT NULL;

-- Covering index for common SELECT queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_listing_cover 
    ON phones(brand, price_category, overall_device_score DESC) 
    INCLUDE (name, price_original, img_url, slug);

-- Index for URL-based lookups (already exists but ensure it's optimized)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_url_unique 
    ON phones(url) WHERE url IS NOT NULL;

-- Analyze tables to update statistics
ANALYZE phones;
ANALYZE processor_rankings;

-- Create materialized view for top phones by category (optional optimization)
CREATE MATERIALIZED VIEW IF NOT EXISTS top_phones_by_category AS
SELECT 
    price_category,
    brand,
    name,
    price_original,
    overall_device_score,
    performance_score,
    camera_score,
    battery_score,
    display_score,
    connectivity_score,
    img_url,
    slug,
    ROW_NUMBER() OVER (PARTITION BY price_category ORDER BY overall_device_score DESC) as rank_in_category
FROM phones 
WHERE 
    price_category IS NOT NULL 
    AND overall_device_score IS NOT NULL
    AND is_pipeline_managed = true;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_top_phones_category_rank 
    ON top_phones_by_category(price_category, rank_in_category);

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_top_phones_by_category()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY top_phones_by_category;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON INDEX idx_phones_brand_category_score IS 'Optimized for brand + category filtering with score ordering';
COMMENT ON INDEX idx_phones_price_range_score IS 'Optimized for price range queries with score ordering';
COMMENT ON MATERIALIZED VIEW top_phones_by_category IS 'Pre-computed top phones by price category for fast queries';