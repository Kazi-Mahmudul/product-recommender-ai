-- Add derived columns to phones table for enhanced features
-- Migration: 002_add_derived_columns_to_phones.sql

-- Price Features
ALTER TABLE phones ADD COLUMN IF NOT EXISTS price_original DECIMAL(10,2);
ALTER TABLE phones ADD COLUMN IF NOT EXISTS price_category VARCHAR(50);
ALTER TABLE phones ADD COLUMN IF NOT EXISTS price_per_gb DECIMAL(8,2);
ALTER TABLE phones ADD COLUMN IF NOT EXISTS price_per_gb_ram DECIMAL(8,2);

-- Display Features
ALTER TABLE phones ADD COLUMN IF NOT EXISTS screen_size_numeric DECIMAL(4,2);
ALTER TABLE phones ADD COLUMN IF NOT EXISTS resolution_width INTEGER;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS resolution_height INTEGER;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS ppi_numeric INTEGER;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS refresh_rate_numeric INTEGER;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS display_score DECIMAL(5,2);

-- Camera Features
ALTER TABLE phones ADD COLUMN IF NOT EXISTS camera_count INTEGER;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS primary_camera_mp DECIMAL(6,2);
ALTER TABLE phones ADD COLUMN IF NOT EXISTS selfie_camera_mp DECIMAL(6,2);
ALTER TABLE phones ADD COLUMN IF NOT EXISTS camera_score DECIMAL(5,2);

-- Performance Features
ALTER TABLE phones ADD COLUMN IF NOT EXISTS ram_gb DECIMAL(6,2);
ALTER TABLE phones ADD COLUMN IF NOT EXISTS storage_gb DECIMAL(8,2);
ALTER TABLE phones ADD COLUMN IF NOT EXISTS processor_rank INTEGER;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS performance_score DECIMAL(5,2);

-- Battery Features
ALTER TABLE phones ADD COLUMN IF NOT EXISTS battery_capacity_numeric INTEGER;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS charging_wattage DECIMAL(6,2);
ALTER TABLE phones ADD COLUMN IF NOT EXISTS has_fast_charging BOOLEAN DEFAULT FALSE;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS has_wireless_charging BOOLEAN DEFAULT FALSE;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS battery_score DECIMAL(5,2);

-- Connectivity Features
ALTER TABLE phones ADD COLUMN IF NOT EXISTS connectivity_score DECIMAL(5,2);
ALTER TABLE phones ADD COLUMN IF NOT EXISTS security_score DECIMAL(5,2);

-- Overall Features
ALTER TABLE phones ADD COLUMN IF NOT EXISTS overall_device_score DECIMAL(5,2);
ALTER TABLE phones ADD COLUMN IF NOT EXISTS is_popular_brand BOOLEAN DEFAULT FALSE;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Release and Status Features
ALTER TABLE phones ADD COLUMN IF NOT EXISTS release_date_clean DATE;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS is_new_release BOOLEAN;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS age_in_months INTEGER;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS is_upcoming BOOLEAN DEFAULT FALSE;

-- Data Quality and Pipeline Features
ALTER TABLE phones ADD COLUMN IF NOT EXISTS data_quality_score DECIMAL(5,2);
ALTER TABLE phones ADD COLUMN IF NOT EXISTS last_price_check TIMESTAMP;

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_phones_price_category ON phones(price_category);
CREATE INDEX IF NOT EXISTS idx_phones_price_original ON phones(price_original);
CREATE INDEX IF NOT EXISTS idx_phones_overall_device_score ON phones(overall_device_score);
CREATE INDEX IF NOT EXISTS idx_phones_performance_score ON phones(performance_score);
CREATE INDEX IF NOT EXISTS idx_phones_camera_score ON phones(camera_score);
CREATE INDEX IF NOT EXISTS idx_phones_battery_score ON phones(battery_score);
CREATE INDEX IF NOT EXISTS idx_phones_display_score ON phones(display_score);
CREATE INDEX IF NOT EXISTS idx_phones_connectivity_score ON phones(connectivity_score);
CREATE INDEX IF NOT EXISTS idx_phones_is_popular_brand ON phones(is_popular_brand);
CREATE INDEX IF NOT EXISTS idx_phones_slug ON phones(slug);
CREATE INDEX IF NOT EXISTS idx_phones_ram_gb ON phones(ram_gb);
CREATE INDEX IF NOT EXISTS idx_phones_storage_gb ON phones(storage_gb);
CREATE INDEX IF NOT EXISTS idx_phones_is_new_release ON phones(is_new_release);
CREATE INDEX IF NOT EXISTS idx_phones_data_quality_score ON phones(data_quality_score);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_phones_brand_price ON phones(brand, price_original);
CREATE INDEX IF NOT EXISTS idx_phones_category_score ON phones(price_category, overall_device_score);
CREATE INDEX IF NOT EXISTS idx_phones_popular_score ON phones(is_popular_brand, overall_device_score);

-- Add constraints
ALTER TABLE phones ADD CONSTRAINT chk_price_original_positive 
    CHECK (price_original IS NULL OR price_original > 0);

ALTER TABLE phones ADD CONSTRAINT chk_scores_range 
    CHECK (
        (display_score IS NULL OR (display_score >= 0 AND display_score <= 100)) AND
        (camera_score IS NULL OR (camera_score >= 0 AND camera_score <= 100)) AND
        (battery_score IS NULL OR (battery_score >= 0 AND battery_score <= 100)) AND
        (performance_score IS NULL OR (performance_score >= 0 AND performance_score <= 100)) AND
        (connectivity_score IS NULL OR (connectivity_score >= 0 AND connectivity_score <= 100)) AND
        (security_score IS NULL OR (security_score >= 0 AND security_score <= 100)) AND
        (overall_device_score IS NULL OR (overall_device_score >= 0 AND overall_device_score <= 100)) AND
        (data_quality_score IS NULL OR (data_quality_score >= 0 AND data_quality_score <= 1))
    );

ALTER TABLE phones ADD CONSTRAINT chk_camera_count_positive 
    CHECK (camera_count IS NULL OR camera_count > 0);

ALTER TABLE phones ADD CONSTRAINT chk_ram_storage_positive 
    CHECK (
        (ram_gb IS NULL OR ram_gb > 0) AND
        (storage_gb IS NULL OR storage_gb > 0)
    );

-- Add comments for documentation
COMMENT ON COLUMN phones.price_original IS 'Numeric price value extracted from price text';
COMMENT ON COLUMN phones.price_category IS 'Price category: Budget, Mid-range, Upper Mid-range, Premium, Flagship';
COMMENT ON COLUMN phones.overall_device_score IS 'Weighted overall device score (0-100)';
COMMENT ON COLUMN phones.slug IS 'SEO-friendly URL slug generated from phone name';
COMMENT ON COLUMN phones.data_quality_score IS 'Data completeness and quality score (0-1)';
COMMENT ON COLUMN phones.processor_rank IS 'Processor performance ranking from processor_rankings table';