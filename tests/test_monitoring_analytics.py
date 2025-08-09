"""
Unit tests for Monitoring and Analytics System
"""

import pytest
from datetime import datetime, timedelta
from app.services.monitoring_analytics import (
    MonitoringAnalytics, QueryMetrics, QueryStatus, MetricType,
    PerformanceMetrics, SystemHealthMetrics
)

class TestMonitoringAnalytics:
    """Test cases for MonitoringAnalytics"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.analytics = MonitoringAnalytics(max_metrics_history=100)
    
    def test_initialization(self):
        """Test analytics system initialization"""
        assert self.analytics.max_metrics_history == 100
        assert len(self.analytics.query_metrics) == 0
        assert self.analytics.performance_metrics.total_queries == 0
        assert isinstance(self.analytics.start_time, datetime)
    
    def test_record_query_metrics(self):
        """Test recording query metrics"""
        query_id = "test_query_1"
        session_id = "test_session_1"
        
        self.analytics.record_query_metrics(
            query_id=query_id,
            session_id=session_id,
            query_text="Compare iPhone 14 and Samsung Galaxy S23",
            query_type="comparison",
            processing_time=1.5,
            confidence=0.85,
            phone_count=2,
            status=QueryStatus.SUCCESS,
            metadata={"test": "data"}
        )
        
        assert len(self.analytics.query_metrics) == 1
        assert query_id in self.analytics.query_metrics_by_id
        assert self.analytics.counters['total_queries'] == 1
        assert self.analytics.counters['queries_success'] == 1
        assert self.analytics.counters['queries_comparison'] == 1
        
        # Check stored metrics
        stored_metrics = self.analytics.query_metrics_by_id[query_id]
        assert stored_metrics.query_id == query_id
        assert stored_metrics.session_id == session_id
        assert stored_metrics.processing_time == 1.5
        assert stored_metrics.confidence == 0.85
        assert stored_metrics.phone_count == 2
        assert stored_metrics.status == QueryStatus.SUCCESS
    
    def test_record_error_query_metrics(self):
        """Test recording error query metrics"""
        self.analytics.record_query_metrics(
            query_id="error_query_1",
            session_id="test_session_1",
            query_text="Find nonexistent phone",
            query_type="specification",
            processing_time=0.5,
            confidence=0.0,
            phone_count=0,
            status=QueryStatus.ERROR,
            error_type="phone_not_found",
            error_category="resolution_error"
        )
        
        assert self.analytics.counters['queries_error'] == 1
        assert len(self.analytics.query_metrics) == 1
        
        stored_metrics = self.analytics.query_metrics[0]
        assert stored_metrics.status == QueryStatus.ERROR
        assert stored_metrics.error_type == "phone_not_found"
        assert stored_metrics.error_category == "resolution_error"
    
    def test_record_custom_metrics(self):
        """Test recording custom metrics"""
        # Test counter
        self.analytics.record_metric("custom_counter", 5, MetricType.COUNTER)
        self.analytics.record_metric("custom_counter", 3, MetricType.COUNTER)
        assert self.analytics.counters["custom_counter"] == 8
        
        # Test gauge
        self.analytics.record_metric("custom_gauge", 42.5, MetricType.GAUGE)
        assert self.analytics.gauges["custom_gauge"] == 42.5
        
        # Test histogram
        self.analytics.record_metric("custom_histogram", 1.0, MetricType.HISTOGRAM)
        self.analytics.record_metric("custom_histogram", 2.0, MetricType.HISTOGRAM)
        assert len(self.analytics.histograms["custom_histogram"]) == 2
        assert 1.0 in self.analytics.histograms["custom_histogram"]
        assert 2.0 in self.analytics.histograms["custom_histogram"]
        
        # Test timer
        self.analytics.record_metric("custom_timer", 0.5, MetricType.TIMER)
        self.analytics.record_metric("custom_timer", 1.5, MetricType.TIMER)
        assert len(self.analytics.timers["custom_timer"]) == 2
    
    def test_get_performance_metrics(self):
        """Test getting performance metrics"""
        # Record some test queries
        for i in range(10):
            status = QueryStatus.SUCCESS if i < 8 else QueryStatus.ERROR
            self.analytics.record_query_metrics(
                query_id=f"query_{i}",
                session_id="test_session",
                query_text=f"Test query {i}",
                query_type="comparison",
                processing_time=1.0 + i * 0.1,
                confidence=0.8,
                phone_count=2,
                status=status
            )
        
        metrics = self.analytics.get_performance_metrics()
        
        assert metrics["total_queries"] == 10
        assert metrics["successful_queries"] == 8
        assert metrics["failed_queries"] == 2
        assert metrics["success_rate"] == 80.0
        assert metrics["error_rate"] == 20.0
        assert metrics["average_response_time"] > 0
        assert "uptime_seconds" in metrics
        assert "last_updated" in metrics
    
    def test_get_system_health(self):
        """Test getting system health metrics"""
        # Set some gauge values
        self.analytics.record_metric("cache_hit_rate", 85.5, MetricType.GAUGE)
        
        health = self.analytics.get_system_health()
        
        assert "status" in health
        assert health["cache_hit_rate"] == 85.5
        assert health["active_sessions"] >= 0
        assert "external_services" in health
        assert "uptime_seconds" in health
        assert "last_updated" in health
    
    def test_get_query_analytics(self):
        """Test getting query analytics"""
        # Record queries with different types and statuses
        query_types = ["comparison", "specification", "recommendation"]
        statuses = [QueryStatus.SUCCESS, QueryStatus.ERROR, QueryStatus.SUCCESS]
        
        for i, (qtype, status) in enumerate(zip(query_types, statuses)):
            self.analytics.record_query_metrics(
                query_id=f"analytics_query_{i}",
                session_id="analytics_session",
                query_text=f"Analytics test query {i}",
                query_type=qtype,
                processing_time=1.0,
                confidence=0.7 + i * 0.1,
                phone_count=i + 1,
                status=status,
                error_type="test_error" if status == QueryStatus.ERROR else None
            )
        
        analytics = self.analytics.get_query_analytics(time_range_hours=24)
        
        assert analytics["total_queries"] == 3
        assert "comparison" in analytics["query_types"]
        assert "specification" in analytics["query_types"]
        assert "recommendation" in analytics["query_types"]
        assert "success" in analytics["status_distribution"]
        assert "error" in analytics["status_distribution"]
        assert analytics["average_confidence"] > 0
        assert analytics["average_phone_count"] > 0
        assert len(analytics["top_error_types"]) > 0
    
    def test_get_user_interaction_patterns(self):
        """Test getting user interaction patterns"""
        # Create queries for multiple sessions
        sessions = ["session_1", "session_2", "session_3"]
        query_types = ["comparison", "specification", "recommendation"]
        
        for session in sessions:
            for i, qtype in enumerate(query_types):
                self.analytics.record_query_metrics(
                    query_id=f"{session}_query_{i}",
                    session_id=session,
                    query_text=f"Query {i} for {session}",
                    query_type=qtype,
                    processing_time=1.0,
                    confidence=0.8,
                    phone_count=2,
                    status=QueryStatus.SUCCESS
                )
        
        patterns = self.analytics.get_user_interaction_patterns(limit=10)
        
        assert patterns["total_active_sessions"] == 3
        assert len(patterns["top_active_sessions"]) == 3
        assert patterns["average_queries_per_session"] == 3.0
        assert "common_query_patterns" in patterns
    
    def test_get_error_analysis(self):
        """Test getting error analysis"""
        # Record some error queries
        error_types = ["phone_not_found", "processing_timeout", "invalid_input"]
        error_categories = ["resolution_error", "timeout_error", "validation_error"]
        
        for i, (error_type, error_category) in enumerate(zip(error_types, error_categories)):
            self.analytics.record_query_metrics(
                query_id=f"error_query_{i}",
                session_id="error_session",
                query_text=f"Error query {i}",
                query_type="comparison",
                processing_time=1.0,
                confidence=0.0,
                phone_count=0,
                status=QueryStatus.ERROR,
                error_type=error_type,
                error_category=error_category
            )
        
        # Add one successful query
        self.analytics.record_query_metrics(
            query_id="success_query",
            session_id="error_session",
            query_text="Success query",
            query_type="comparison",
            processing_time=1.0,
            confidence=0.8,
            phone_count=2,
            status=QueryStatus.SUCCESS
        )
        
        error_analysis = self.analytics.get_error_analysis(time_range_hours=24)
        
        assert error_analysis["total_errors"] == 3
        assert error_analysis["error_rate"] == 75.0  # 3 errors out of 4 total queries
        assert len(error_analysis["error_categories"]) == 3
        assert len(error_analysis["error_types"]) == 3
        assert len(error_analysis["recent_errors"]) == 3
    
    def test_get_query_by_id(self):
        """Test getting specific query by ID"""
        query_id = "specific_query_test"
        
        self.analytics.record_query_metrics(
            query_id=query_id,
            session_id="test_session",
            query_text="Specific query test",
            query_type="comparison",
            processing_time=1.5,
            confidence=0.9,
            phone_count=3,
            status=QueryStatus.SUCCESS
        )
        
        query_data = self.analytics.get_query_by_id(query_id)
        
        assert query_data is not None
        assert query_data["query_id"] == query_id
        assert query_data["query_text"] == "Specific query test"
        assert query_data["processing_time"] == 1.5
        assert query_data["confidence"] == 0.9
        assert query_data["phone_count"] == 3
        
        # Test non-existent query
        non_existent = self.analytics.get_query_by_id("non_existent_query")
        assert non_existent is None
    
    def test_export_metrics(self):
        """Test exporting metrics"""
        # Record some test data
        self.analytics.record_query_metrics(
            query_id="export_test_query",
            session_id="export_session",
            query_text="Export test query",
            query_type="comparison",
            processing_time=1.0,
            confidence=0.8,
            phone_count=2,
            status=QueryStatus.SUCCESS
        )
        
        # Test JSON export
        json_export = self.analytics.export_metrics(format="json")
        assert isinstance(json_export, str)
        assert "performance_metrics" in json_export
        assert "system_health" in json_export
        assert "query_analytics" in json_export
        assert "error_analysis" in json_export
        assert "user_patterns" in json_export
        assert "export_timestamp" in json_export
        
        # Test other format
        other_export = self.analytics.export_metrics(format="text")
        assert isinstance(other_export, str)
    
    def test_metrics_history_limit(self):
        """Test that metrics history respects the limit"""
        # Set a small limit for testing
        small_analytics = MonitoringAnalytics(max_metrics_history=5)
        
        # Record more queries than the limit
        for i in range(10):
            small_analytics.record_query_metrics(
                query_id=f"limit_test_query_{i}",
                session_id="limit_test_session",
                query_text=f"Limit test query {i}",
                query_type="comparison",
                processing_time=1.0,
                confidence=0.8,
                phone_count=2,
                status=QueryStatus.SUCCESS
            )
        
        # Should only keep the last 5 queries
        assert len(small_analytics.query_metrics) == 5
        
        # Should have all queries in the by_id dict (this doesn't have a limit)
        assert len(small_analytics.query_metrics_by_id) == 10
    
    def test_histogram_and_timer_size_limits(self):
        """Test that histograms and timers respect size limits"""
        # Record many histogram values
        for i in range(1500):  # More than the 1000 limit
            self.analytics.record_metric("test_histogram", float(i), MetricType.HISTOGRAM)
        
        # Should be limited to 1000
        assert len(self.analytics.histograms["test_histogram"]) == 1000
        
        # Record many timer values
        for i in range(1500):  # More than the 1000 limit
            self.analytics.record_metric("test_timer", float(i), MetricType.TIMER)
        
        # Should be limited to 1000
        assert len(self.analytics.timers["test_timer"]) == 1000
    
    def test_time_range_filtering(self):
        """Test time range filtering in analytics"""
        # Record an old query (more than 24 hours ago)
        old_time = datetime.now() - timedelta(hours=25)
        
        # Manually create and add old metrics
        old_metrics = QueryMetrics(
            query_id="old_query",
            session_id="old_session",
            query_text="Old query",
            query_type="comparison",
            processing_time=1.0,
            confidence=0.8,
            phone_count=2,
            status=QueryStatus.SUCCESS,
            timestamp=old_time
        )
        
        self.analytics.query_metrics.append(old_metrics)
        
        # Record a recent query
        self.analytics.record_query_metrics(
            query_id="recent_query",
            session_id="recent_session",
            query_text="Recent query",
            query_type="comparison",
            processing_time=1.0,
            confidence=0.8,
            phone_count=2,
            status=QueryStatus.SUCCESS
        )
        
        # Get analytics for last 24 hours
        analytics = self.analytics.get_query_analytics(time_range_hours=24)
        
        # Should only include the recent query
        assert analytics["total_queries"] == 1
        
        # Get analytics for last 48 hours
        analytics_48h = self.analytics.get_query_analytics(time_range_hours=48)
        
        # Should include both queries
        assert analytics_48h["total_queries"] == 2

class TestQueryMetrics:
    """Test cases for QueryMetrics dataclass"""
    
    def test_query_metrics_creation(self):
        """Test creating QueryMetrics instance"""
        timestamp = datetime.now()
        
        metrics = QueryMetrics(
            query_id="test_query",
            session_id="test_session",
            query_text="Test query text",
            query_type="comparison",
            processing_time=1.5,
            confidence=0.85,
            phone_count=2,
            status=QueryStatus.SUCCESS,
            timestamp=timestamp,
            metadata={"test": "data"}
        )
        
        assert metrics.query_id == "test_query"
        assert metrics.session_id == "test_session"
        assert metrics.query_text == "Test query text"
        assert metrics.query_type == "comparison"
        assert metrics.processing_time == 1.5
        assert metrics.confidence == 0.85
        assert metrics.phone_count == 2
        assert metrics.status == QueryStatus.SUCCESS
        assert metrics.timestamp == timestamp
        assert metrics.metadata == {"test": "data"}
    
    def test_query_metrics_to_dict(self):
        """Test converting QueryMetrics to dictionary"""
        timestamp = datetime.now()
        
        metrics = QueryMetrics(
            query_id="test_query",
            session_id="test_session",
            query_text="Test query text",
            query_type="comparison",
            processing_time=1.5,
            confidence=0.85,
            phone_count=2,
            status=QueryStatus.SUCCESS,
            timestamp=timestamp
        )
        
        metrics_dict = metrics.to_dict()
        
        assert metrics_dict["query_id"] == "test_query"
        assert metrics_dict["session_id"] == "test_session"
        assert metrics_dict["query_text"] == "Test query text"
        assert metrics_dict["query_type"] == "comparison"
        assert metrics_dict["processing_time"] == 1.5
        assert metrics_dict["confidence"] == 0.85
        assert metrics_dict["phone_count"] == 2
        assert metrics_dict["status"] == "success"
        assert metrics_dict["timestamp"] == timestamp.isoformat()