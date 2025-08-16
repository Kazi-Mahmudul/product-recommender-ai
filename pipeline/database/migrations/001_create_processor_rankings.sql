-- Create processor rankings table for mobile phone performance data
-- Migration: 001_create_processor_rankings.sql

CREATE TABLE IF NOT EXISTS processor_rankings (
    id SERIAL PRIMARY KEY,
    processor_name VARCHAR(255) NOT NULL,
    processor_key VARCHAR(255) NOT NULL, -- normalized for matching
    rank INTEGER NOT NULL,
    rating DECIMAL(5,2),
    antutu10 INTEGER,
    geekbench6 INTEGER,
    cores VARCHAR(50),
    clock VARCHAR(50),
    gpu VARCHAR(255),
    company VARCHAR(100),
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(processor_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_processor_rankings_rank ON processor_rankings(rank);
CREATE INDEX IF NOT EXISTS idx_processor_rankings_company ON processor_rankings(company);
CREATE INDEX IF NOT EXISTS idx_processor_rankings_processor_key ON processor_rankings(processor_key);
CREATE INDEX IF NOT EXISTS idx_processor_rankings_processor_name ON processor_rankings(processor_name);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_processor_rankings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_processor_rankings_updated_at
    BEFORE UPDATE ON processor_rankings
    FOR EACH ROW
    EXECUTE FUNCTION update_processor_rankings_updated_at();

-- Insert some sample data for testing (optional)
INSERT INTO processor_rankings (processor_name, processor_key, rank, rating, company) VALUES
('Apple A17 Pro', 'apple a17 pro', 1, 95.5, 'Apple'),
('Snapdragon 8 Gen 3', 'snapdragon 8 gen 3', 2, 94.2, 'Qualcomm'),
('Dimensity 9300', 'dimensity 9300', 3, 92.8, 'MediaTek')
ON CONFLICT (processor_key) DO NOTHING;

COMMENT ON TABLE processor_rankings IS 'Processor performance rankings from NanoReview and other sources';
COMMENT ON COLUMN processor_rankings.processor_key IS 'Normalized processor name for fuzzy matching';
COMMENT ON COLUMN processor_rankings.rank IS 'Performance ranking (lower is better)';
COMMENT ON COLUMN processor_rankings.rating IS 'Overall performance rating out of 100';