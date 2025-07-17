import pytest
from unittest.mock import patch, MagicMock
import time

from app.core.monitoring import (
    track_execution_time, 
    track_cache_metrics, 
    get_performance_summary,
    performance_metrics
)

def test_track_execution_time_decorator():
    """Test that the track_execution_time decorator records metrics correctly"""
    # Clear existing metrics
    performance_metrics["api_response_times"] = {}
    
    # Define a test function with the decorator
    @track_execution_time("test_function", "api_response_times")
    def test_function(sleep_time):
        time.sleep(sleep_time)
        return "test"
    
    # Call the function
    result = test_function(0.01)
    
    # Check that the function returned the correct result
    assert result == "test"
    
    # Check that metrics were recorded
    assert "test_function" in performance_metrics["api_response_times"]
    assert len(performance_metrics["api_response_times"]["test_function"]) == 1
    
    # Check that the execution time is reasonable (at least 10ms)
    assert performance_metrics["api_response_times"]["test_function"][0] >= 10

def test_track_cache_metrics():
    """Test that cache metrics are recorded correctly"""
    # Clear existing metrics
    performance_metrics["cache_hit_rates"] = {}
    
    # Record some cache hits and misses
    track_cache_metrics(hit=True, prefix="test_prefix")
    track_cache_metrics(hit=True, prefix="test_prefix")
    track_cache_metrics(hit=False, prefix="test_prefix")
    
    # Check that metrics were recorded
    assert "test_prefix" in performance_metrics["cache_hit_rates"]
    assert performance_metrics["cache_hit_rates"]["test_prefix"]["hits"] == 2
    assert performance_metrics["cache_hit_rates"]["test_prefix"]["misses"] == 1

def test_get_performance_summary():
    """Test that performance summary is generated correctly"""
    # Set up some test metrics
    performance_metrics["api_response_times"] = {
        "test_endpoint": [100, 200, 300]
    }
    performance_metrics["cache_hit_rates"] = {
        "test_prefix": {"hits": 7, "misses": 3}
    }
    performance_metrics["slow_queries"] = [
        {"query": "SELECT * FROM test", "execution_time_ms": 150, "timestamp": time.time()}
    ]
    
    # Get the summary
    summary = get_performance_summary()
    
    # Check that the summary contains the expected data
    assert "api_response_times" in summary
    assert "test_endpoint" in summary["api_response_times"]
    assert summary["api_response_times"]["test_endpoint"]["avg_ms"] == 200
    assert summary["api_response_times"]["test_endpoint"]["min_ms"] == 100
    assert summary["api_response_times"]["test_endpoint"]["max_ms"] == 300
    
    assert "cache_hit_rates" in summary
    assert "test_prefix" in summary["cache_hit_rates"]
    assert summary["cache_hit_rates"]["test_prefix"]["hit_rate"] == 0.7
    
    assert "slow_queries_count" in summary
    assert summary["slow_queries_count"] == 1

# API endpoint tests are removed since we're not using TestClient
# These would test the monitoring API endpoints in a real environment