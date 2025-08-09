"""
Monitoring and Analytics System for Contextual Query Processing
"""

import time
import logging
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from enum import Enum
import json
from collections import defaultdict, deque

logger = logging.getLogger(__name__)

class MetricType(Enum):
    """Types of metrics collected"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"

class QueryStatus(Enum):
    """Status of query processing"""
    SUCCESS = "success"
    ERROR = "error"
    TIMEOUT = "timeout"
    PARTIAL = "partial"

@dataclass
class QueryMetrics:
    """Metrics for a single query"""
    query_id: str
    session_id: Optional[str]
    query_text: str
    query_type: str
    processing_time: float
    confidence: float
    phone_count: int
    status: QueryStatus
    error_type: Optional[str] = None
    error_category: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['status'] = self.status.value
        return data

@dataclass
class PerformanceMetrics:
    """Performance metrics for the system"""
    total_queries: int = 0
    successful_queries: int = 0
    failed_queries: int = 0
    average_response_time: float = 0.0
    p95_response_time: float = 0.0
    p99_response_time: float = 0.0
    queries_per_minute: float = 0.0
    error_rate: float = 0.0
    uptime_seconds: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)

@dataclass
class SystemHealthMetrics:
    """System health metrics"""
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    active_sessions: int = 0
    cache_hit_rate: float = 0.0
    database_connections: int = 0
    external_service_status: Dict[str, str] = field(default_factory=dict)
    last_updated: datetime = field(default_factory=datetime.now)

class MonitoringAnalytics:
    """Comprehensive monitoring and analytics system"""
    
    def __init__(self, max_metrics_history: int = 10000):
        """Initialize monitoring and analytics system"""
        self.max_metrics_history = max_metrics_history
        self.start_time = datetime.now()
        
        # Query metrics storage
        self.query_metrics: deque = deque(maxlen=max_metrics_history)
        self.query_metrics_by_id: Dict[str, QueryMetrics] = {}
        
        # Performance tracking
        self.performance_metrics = PerformanceMetrics()
        self.system_health = SystemHealthMetrics()
        
        # Real-time counters
        self.counters: Dict[str, int] = defaultdict(int)
        self.gauges: Dict[str, float] = defaultdict(float)
        self.histograms: Dict[str, List[float]] = defaultdict(list)
        self.timers: Dict[str, List[float]] = defaultdict(list)
        
        # User interaction patterns
        self.user_patterns: Dict[str, Dict[str, Any]] = defaultdict(dict)
        
        logger.info("Monitoring and Analytics system initialized")
    
    def record_query_metrics(
        self,
        query_id: str,
        session_id: Optional[str],
        query_text: str,
        query_type: str,
        processing_time: float,
        confidence: float,
        phone_count: int,
        status: QueryStatus,
        error_type: Optional[str] = None,
        error_category: Optional[str] = None,
        metadata: Dict[str, Any] = None
    ) -> None:
        """Record metrics for a query"""
        try:
            metrics = QueryMetrics(
                query_id=query_id,
                session_id=session_id,
                query_text=query_text,
                query_type=query_type,
                processing_time=processing_time,
                confidence=confidence,
                phone_count=phone_count,
                status=status,
                error_type=error_type,
                error_category=error_category,
                metadata=metadata or {}
            )
            
            # Store metrics
            self.query_metrics.append(metrics)
            self.query_metrics_by_id[query_id] = metrics
            
            # Update counters
            self.counters['total_queries'] += 1
            self.counters[f'queries_{status.value}'] += 1
            self.counters[f'queries_{query_type}'] += 1
            
            # Update timers
            self.timers['processing_time'].append(processing_time)
            
            # Update user patterns
            if session_id:
                self._update_user_patterns(session_id, metrics)
            
            # Update performance metrics
            self._update_performance_metrics()
            
            logger.debug(f"Recorded metrics for query {query_id}")
            
        except Exception as e:
            logger.error(f"Error recording query metrics: {e}")
    
    def record_metric(self, name: str, value: float, metric_type: MetricType) -> None:
        """Record a custom metric"""
        try:
            if metric_type == MetricType.COUNTER:
                self.counters[name] += int(value)
            elif metric_type == MetricType.GAUGE:
                self.gauges[name] = value
            elif metric_type == MetricType.HISTOGRAM:
                self.histograms[name].append(value)
                # Keep histogram size manageable
                if len(self.histograms[name]) > 1000:
                    self.histograms[name] = self.histograms[name][-1000:]
            elif metric_type == MetricType.TIMER:
                self.timers[name].append(value)
                # Keep timer size manageable
                if len(self.timers[name]) > 1000:
                    self.timers[name] = self.timers[name][-1000:]
            
            logger.debug(f"Recorded {metric_type.value} metric {name}: {value}")
            
        except Exception as e:
            logger.error(f"Error recording metric {name}: {e}")
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics"""
        try:
            self._update_performance_metrics()
            
            return {
                "total_queries": self.performance_metrics.total_queries,
                "successful_queries": self.performance_metrics.successful_queries,
                "failed_queries": self.performance_metrics.failed_queries,
                "success_rate": (
                    self.performance_metrics.successful_queries / max(self.performance_metrics.total_queries, 1)
                ) * 100,
                "error_rate": self.performance_metrics.error_rate,
                "average_response_time": self.performance_metrics.average_response_time,
                "p95_response_time": self.performance_metrics.p95_response_time,
                "p99_response_time": self.performance_metrics.p99_response_time,
                "queries_per_minute": self.performance_metrics.queries_per_minute,
                "uptime_seconds": (datetime.now() - self.start_time).total_seconds(),
                "last_updated": self.performance_metrics.last_updated.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting performance metrics: {e}")
            return {"error": str(e)}
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get current system health metrics"""
        try:
            # Update system health metrics
            self._update_system_health()
            
            return {
                "status": "healthy" if self._is_system_healthy() else "degraded",
                "cpu_usage": self.system_health.cpu_usage,
                "memory_usage": self.system_health.memory_usage,
                "active_sessions": self.system_health.active_sessions,
                "cache_hit_rate": self.system_health.cache_hit_rate,
                "database_connections": self.system_health.database_connections,
                "external_services": self.system_health.external_service_status,
                "uptime_seconds": (datetime.now() - self.start_time).total_seconds(),
                "last_updated": self.system_health.last_updated.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting system health: {e}")
            return {"status": "error", "error": str(e)}
    
    def get_query_analytics(self, time_range_hours: int = 24) -> Dict[str, Any]:
        """Get query analytics for specified time range"""
        try:
            cutoff_time = datetime.now() - timedelta(hours=time_range_hours)
            recent_queries = [
                q for q in self.query_metrics 
                if q.timestamp > cutoff_time
            ]
            
            if not recent_queries:
                return {
                    "time_range_hours": time_range_hours,
                    "total_queries": 0,
                    "query_types": {},
                    "status_distribution": {},
                    "average_confidence": 0.0,
                    "average_phone_count": 0.0,
                    "top_error_types": [],
                    "hourly_distribution": {}
                }
            
            # Query type distribution
            query_types = defaultdict(int)
            for q in recent_queries:
                query_types[q.query_type] += 1
            
            # Status distribution
            status_distribution = defaultdict(int)
            for q in recent_queries:
                status_distribution[q.status.value] += 1
            
            # Error analysis
            error_types = defaultdict(int)
            for q in recent_queries:
                if q.error_type:
                    error_types[q.error_type] += 1
            
            # Top error types
            top_error_types = sorted(
                error_types.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:5]
            
            # Hourly distribution
            hourly_distribution = defaultdict(int)
            for q in recent_queries:
                hour = q.timestamp.hour
                hourly_distribution[hour] += 1
            
            # Calculate averages
            total_confidence = sum(q.confidence for q in recent_queries)
            total_phone_count = sum(q.phone_count for q in recent_queries)
            
            return {
                "time_range_hours": time_range_hours,
                "total_queries": len(recent_queries),
                "query_types": dict(query_types),
                "status_distribution": dict(status_distribution),
                "average_confidence": total_confidence / len(recent_queries),
                "average_phone_count": total_phone_count / len(recent_queries),
                "top_error_types": top_error_types,
                "hourly_distribution": dict(hourly_distribution)
            }
            
        except Exception as e:
            logger.error(f"Error getting query analytics: {e}")
            return {"error": str(e)}
    
    def get_user_interaction_patterns(self, limit: int = 100) -> Dict[str, Any]:
        """Get user interaction patterns"""
        try:
            # Get top active sessions
            session_activity = defaultdict(int)
            session_queries = defaultdict(list)
            
            for query in list(self.query_metrics)[-1000:]:  # Last 1000 queries
                if query.session_id:
                    session_activity[query.session_id] += 1
                    session_queries[query.session_id].append(query.query_type)
            
            # Top active sessions
            top_sessions = sorted(
                session_activity.items(),
                key=lambda x: x[1],
                reverse=True
            )[:limit]
            
            # Query pattern analysis
            query_patterns = defaultdict(int)
            for session_id, queries in session_queries.items():
                if len(queries) > 1:
                    # Look for common patterns
                    for i in range(len(queries) - 1):
                        pattern = f"{queries[i]} -> {queries[i+1]}"
                        query_patterns[pattern] += 1
            
            # Top query patterns
            top_patterns = sorted(
                query_patterns.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]
            
            return {
                "total_active_sessions": len(session_activity),
                "top_active_sessions": [
                    {"session_id": session_id, "query_count": count}
                    for session_id, count in top_sessions
                ],
                "common_query_patterns": [
                    {"pattern": pattern, "frequency": count}
                    for pattern, count in top_patterns
                ],
                "average_queries_per_session": (
                    sum(session_activity.values()) / len(session_activity)
                    if session_activity else 0
                )
            }
            
        except Exception as e:
            logger.error(f"Error getting user interaction patterns: {e}")
            return {"error": str(e)}
    
    def get_error_analysis(self, time_range_hours: int = 24) -> Dict[str, Any]:
        """Get detailed error analysis"""
        try:
            cutoff_time = datetime.now() - timedelta(hours=time_range_hours)
            error_queries = [
                q for q in self.query_metrics 
                if q.timestamp > cutoff_time and q.status == QueryStatus.ERROR
            ]
            
            if not error_queries:
                return {
                    "time_range_hours": time_range_hours,
                    "total_errors": 0,
                    "error_rate": 0.0,
                    "error_categories": {},
                    "error_types": {},
                    "recent_errors": []
                }
            
            # Error categories
            error_categories = defaultdict(int)
            for q in error_queries:
                if q.error_category:
                    error_categories[q.error_category] += 1
            
            # Error types
            error_types = defaultdict(int)
            for q in error_queries:
                if q.error_type:
                    error_types[q.error_type] += 1
            
            # Recent errors
            recent_errors = [
                {
                    "query_id": q.query_id,
                    "error_type": q.error_type,
                    "error_category": q.error_category,
                    "query_text": q.query_text[:100] + "..." if len(q.query_text) > 100 else q.query_text,
                    "timestamp": q.timestamp.isoformat()
                }
                for q in sorted(error_queries, key=lambda x: x.timestamp, reverse=True)[:10]
            ]
            
            # Calculate error rate
            total_queries_in_range = len([
                q for q in self.query_metrics 
                if q.timestamp > cutoff_time
            ])
            error_rate = (len(error_queries) / max(total_queries_in_range, 1)) * 100
            
            return {
                "time_range_hours": time_range_hours,
                "total_errors": len(error_queries),
                "error_rate": error_rate,
                "error_categories": dict(error_categories),
                "error_types": dict(error_types),
                "recent_errors": recent_errors
            }
            
        except Exception as e:
            logger.error(f"Error getting error analysis: {e}")
            return {"error": str(e)}
    
    def get_query_by_id(self, query_id: str) -> Optional[Dict[str, Any]]:
        """Get specific query metrics by ID"""
        try:
            query_metrics = self.query_metrics_by_id.get(query_id)
            if query_metrics:
                return query_metrics.to_dict()
            return None
            
        except Exception as e:
            logger.error(f"Error getting query by ID {query_id}: {e}")
            return None
    
    def export_metrics(self, format: str = "json") -> str:
        """Export metrics in specified format"""
        try:
            data = {
                "performance_metrics": self.get_performance_metrics(),
                "system_health": self.get_system_health(),
                "query_analytics": self.get_query_analytics(),
                "error_analysis": self.get_error_analysis(),
                "user_patterns": self.get_user_interaction_patterns(),
                "export_timestamp": datetime.now().isoformat()
            }
            
            if format.lower() == "json":
                return json.dumps(data, indent=2)
            else:
                return str(data)
                
        except Exception as e:
            logger.error(f"Error exporting metrics: {e}")
            return json.dumps({"error": str(e)})
    
    def _update_performance_metrics(self) -> None:
        """Update performance metrics based on current data"""
        try:
            if not self.query_metrics:
                return
            
            # Calculate metrics from recent queries
            recent_queries = list(self.query_metrics)
            
            self.performance_metrics.total_queries = len(recent_queries)
            self.performance_metrics.successful_queries = len([
                q for q in recent_queries if q.status == QueryStatus.SUCCESS
            ])
            self.performance_metrics.failed_queries = len([
                q for q in recent_queries if q.status == QueryStatus.ERROR
            ])
            
            # Calculate response times
            processing_times = [q.processing_time for q in recent_queries]
            if processing_times:
                self.performance_metrics.average_response_time = sum(processing_times) / len(processing_times)
                sorted_times = sorted(processing_times)
                self.performance_metrics.p95_response_time = sorted_times[int(len(sorted_times) * 0.95)]
                self.performance_metrics.p99_response_time = sorted_times[int(len(sorted_times) * 0.99)]
            
            # Calculate queries per minute (last hour)
            one_hour_ago = datetime.now() - timedelta(hours=1)
            recent_hour_queries = [q for q in recent_queries if q.timestamp > one_hour_ago]
            self.performance_metrics.queries_per_minute = len(recent_hour_queries) / 60
            
            # Calculate error rate
            if self.performance_metrics.total_queries > 0:
                self.performance_metrics.error_rate = (
                    self.performance_metrics.failed_queries / self.performance_metrics.total_queries
                ) * 100
            
            self.performance_metrics.last_updated = datetime.now()
            
        except Exception as e:
            logger.error(f"Error updating performance metrics: {e}")
    
    def _update_system_health(self) -> None:
        """Update system health metrics"""
        try:
            # Update active sessions count
            active_sessions = set()
            one_hour_ago = datetime.now() - timedelta(hours=1)
            
            for query in self.query_metrics:
                if query.timestamp > one_hour_ago and query.session_id:
                    active_sessions.add(query.session_id)
            
            self.system_health.active_sessions = len(active_sessions)
            
            # Update cache hit rate (placeholder - would integrate with actual cache)
            self.system_health.cache_hit_rate = self.gauges.get('cache_hit_rate', 0.0)
            
            # Update external service status
            self.system_health.external_service_status = {
                "gemini_ai": "healthy",  # Would check actual service
                "database": "healthy",   # Would check actual database
                "redis": "healthy"       # Would check actual Redis
            }
            
            self.system_health.last_updated = datetime.now()
            
        except Exception as e:
            logger.error(f"Error updating system health: {e}")
    
    def _is_system_healthy(self) -> bool:
        """Check if system is healthy based on metrics"""
        try:
            # Check error rate
            if self.performance_metrics.error_rate > 10:  # More than 10% error rate
                return False
            
            # Check response time
            if self.performance_metrics.average_response_time > 5.0:  # More than 5 seconds
                return False
            
            # Check external services
            for service, status in self.system_health.external_service_status.items():
                if status != "healthy":
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking system health: {e}")
            return False
    
    def _update_user_patterns(self, session_id: str, metrics: QueryMetrics) -> None:
        """Update user interaction patterns"""
        try:
            if session_id not in self.user_patterns:
                self.user_patterns[session_id] = {
                    "first_query": metrics.timestamp,
                    "last_query": metrics.timestamp,
                    "query_count": 0,
                    "query_types": defaultdict(int),
                    "average_confidence": 0.0,
                    "total_phones_discussed": 0
                }
            
            pattern = self.user_patterns[session_id]
            pattern["last_query"] = metrics.timestamp
            pattern["query_count"] += 1
            pattern["query_types"][metrics.query_type] += 1
            pattern["total_phones_discussed"] += metrics.phone_count
            
            # Update average confidence
            old_avg = pattern["average_confidence"]
            pattern["average_confidence"] = (
                (old_avg * (pattern["query_count"] - 1) + metrics.confidence) / pattern["query_count"]
            )
            
        except Exception as e:
            logger.error(f"Error updating user patterns for session {session_id}: {e}")

# Global monitoring instance
monitoring_analytics = MonitoringAnalytics()