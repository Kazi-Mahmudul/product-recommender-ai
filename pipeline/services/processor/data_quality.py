"""
Advanced data quality validation and monitoring module.
"""

import logging
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
import json
import redis
from prometheus_client import Gauge, Counter, Histogram

from .config import settings

logger = logging.getLogger(__name__)

# Prometheus metrics for data quality
data_quality_completeness = Gauge('data_quality_completeness', 'Data completeness score')
data_quality_accuracy = Gauge('data_quality_accuracy', 'Data accuracy score')
data_quality_consistency = Gauge('data_quality_consistency', 'Data consistency score')
data_quality_anomalies = Counter('data_quality_anomalies_total', 'Total anomalies detected', ['type'])
data_quality_checks = Counter('data_quality_checks_total', 'Total quality checks performed', ['status'])


@dataclass
class QualityRule:
    """Data quality rule definition."""
    name: str
    description: str
    column: str
    rule_type: str  # 'completeness', 'range', 'format', 'uniqueness', 'consistency'
    parameters: Dict[str, Any]
    severity: str  # 'critical', 'warning', 'info'
    threshold: float = 0.95  # Pass threshold


@dataclass
class QualityIssue:
    """Data quality issue."""
    rule_name: str
    severity: str
    column: str
    issue_type: str
    description: str
    affected_records: int
    percentage: float
    sample_values: List[Any]
    timestamp: datetime


@dataclass
class QualityTrend:
    """Data quality trend over time."""
    metric_name: str
    current_value: float
    previous_value: Optional[float]
    trend_direction: str  # 'improving', 'degrading', 'stable'
    change_percentage: Optional[float]


class DataQualityValidator:
    """
    Advanced data quality validation and monitoring system.
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        """Initialize the data quality validator."""
        self.redis_client = redis_client
        self.quality_rules = self._define_quality_rules()
        self.historical_metrics = {}
        
        logger.info("Data quality validator initialized")
    
    def _define_quality_rules(self) -> List[QualityRule]:
        """Define data quality rules for mobile phone data."""
        rules = [
            # Completeness rules
            QualityRule(
                name="required_fields_completeness",
                description="Required fields must be present and non-null",
                column="*",
                rule_type="completeness",
                parameters={"required_fields": settings.min_required_fields},
                severity="critical",
                threshold=0.95
            ),
            
            # Price validation rules
            QualityRule(
                name="price_range_validation",
                description="Price should be within reasonable range",
                column="price_original",
                rule_type="range",
                parameters={"min_value": 1000, "max_value": 500000},
                severity="warning",
                threshold=0.98
            ),
            
            QualityRule(
                name="price_format_validation",
                description="Price should be numeric and positive",
                column="price_original",
                rule_type="format",
                parameters={"data_type": "numeric", "positive": True},
                severity="critical",
                threshold=0.99
            ),
            
            # URL uniqueness rule
            QualityRule(
                name="url_uniqueness",
                description="Product URLs should be unique",
                column="url",
                rule_type="uniqueness",
                parameters={},
                severity="critical",
                threshold=0.99
            ),
            
            # Brand consistency rule
            QualityRule(
                name="brand_consistency",
                description="Brand names should be consistent",
                column="brand",
                rule_type="consistency",
                parameters={"expected_brands": settings.popular_brands},
                severity="warning",
                threshold=0.90
            ),
            
            # Camera specifications validation
            QualityRule(
                name="camera_mp_range",
                description="Camera MP should be within reasonable range",
                column="primary_camera_mp",
                rule_type="range",
                parameters={"min_value": 0.3, "max_value": 200},
                severity="warning",
                threshold=0.95
            ),
            
            # Storage validation
            QualityRule(
                name="storage_range",
                description="Storage should be within reasonable range",
                column="storage_gb",
                rule_type="range",
                parameters={"min_value": 1, "max_value": 2048},
                severity="warning",
                threshold=0.95
            ),
            
            # RAM validation
            QualityRule(
                name="ram_range",
                description="RAM should be within reasonable range",
                column="ram_gb",
                rule_type="range",
                parameters={"min_value": 0.5, "max_value": 32},
                severity="warning",
                threshold=0.95
            ),
            
            # Screen size validation
            QualityRule(
                name="screen_size_range",
                description="Screen size should be within reasonable range",
                column="screen_size_numeric",
                rule_type="range",
                parameters={"min_value": 3.0, "max_value": 10.0},
                severity="warning",
                threshold=0.95
            ),
        ]
        
        return rules
    
    def _check_completeness_rule(self, df: pd.DataFrame, rule: QualityRule) -> Tuple[bool, QualityIssue]:
        """Check completeness rule."""
        if rule.column == "*":
            # Check required fields
            required_fields = rule.parameters.get("required_fields", [])
            missing_fields = []
            total_missing = 0
            
            for field in required_fields:
                if field not in df.columns:
                    missing_fields.append(field)
                    total_missing += len(df)
                else:
                    missing_count = df[field].isnull().sum()
                    total_missing += missing_count
                    if missing_count > 0:
                        missing_fields.append(f"{field} ({missing_count} missing)")
            
            total_possible = len(df) * len(required_fields)
            completeness_score = 1 - (total_missing / total_possible) if total_possible > 0 else 1
            
            passed = completeness_score >= rule.threshold
            
            issue = QualityIssue(
                rule_name=rule.name,
                severity=rule.severity,
                column=rule.column,
                issue_type="completeness",
                description=f"Missing required fields: {', '.join(missing_fields)}" if missing_fields else "All required fields present",
                affected_records=total_missing,
                percentage=(total_missing / total_possible * 100) if total_possible > 0 else 0,
                sample_values=missing_fields[:5],
                timestamp=datetime.utcnow()
            )
            
            return passed, issue
        else:
            # Check single column completeness
            if rule.column not in df.columns:
                issue = QualityIssue(
                    rule_name=rule.name,
                    severity=rule.severity,
                    column=rule.column,
                    issue_type="completeness",
                    description=f"Column {rule.column} not found",
                    affected_records=len(df),
                    percentage=100.0,
                    sample_values=[],
                    timestamp=datetime.utcnow()
                )
                return False, issue
            
            missing_count = df[rule.column].isnull().sum()
            completeness_score = 1 - (missing_count / len(df)) if len(df) > 0 else 1
            
            passed = completeness_score >= rule.threshold
            
            issue = QualityIssue(
                rule_name=rule.name,
                severity=rule.severity,
                column=rule.column,
                issue_type="completeness",
                description=f"{missing_count} missing values in {rule.column}",
                affected_records=missing_count,
                percentage=(missing_count / len(df) * 100) if len(df) > 0 else 0,
                sample_values=[],
                timestamp=datetime.utcnow()
            )
            
            return passed, issue
    
    def _check_range_rule(self, df: pd.DataFrame, rule: QualityRule) -> Tuple[bool, QualityIssue]:
        """Check range validation rule."""
        if rule.column not in df.columns:
            issue = QualityIssue(
                rule_name=rule.name,
                severity=rule.severity,
                column=rule.column,
                issue_type="range",
                description=f"Column {rule.column} not found",
                affected_records=len(df),
                percentage=100.0,
                sample_values=[],
                timestamp=datetime.utcnow()
            )
            return False, issue
        
        min_val = rule.parameters.get("min_value")
        max_val = rule.parameters.get("max_value")
        
        # Convert to numeric if needed
        numeric_series = pd.to_numeric(df[rule.column], errors='coerce')
        
        # Check range violations
        violations = pd.Series([False] * len(df))
        
        if min_val is not None:
            violations |= (numeric_series < min_val)
        
        if max_val is not None:
            violations |= (numeric_series > max_val)
        
        # Exclude null values from violations
        violations &= numeric_series.notna()
        
        violation_count = violations.sum()
        valid_count = len(df) - violation_count
        accuracy_score = valid_count / len(df) if len(df) > 0 else 1
        
        passed = accuracy_score >= rule.threshold
        
        # Get sample violation values
        sample_violations = df[violations][rule.column].head(5).tolist()
        
        issue = QualityIssue(
            rule_name=rule.name,
            severity=rule.severity,
            column=rule.column,
            issue_type="range",
            description=f"{violation_count} values outside range [{min_val}, {max_val}]",
            affected_records=violation_count,
            percentage=(violation_count / len(df) * 100) if len(df) > 0 else 0,
            sample_values=sample_violations,
            timestamp=datetime.utcnow()
        )
        
        return passed, issue
    
    def _check_format_rule(self, df: pd.DataFrame, rule: QualityRule) -> Tuple[bool, QualityIssue]:
        """Check format validation rule."""
        if rule.column not in df.columns:
            issue = QualityIssue(
                rule_name=rule.name,
                severity=rule.severity,
                column=rule.column,
                issue_type="format",
                description=f"Column {rule.column} not found",
                affected_records=len(df),
                percentage=100.0,
                sample_values=[],
                timestamp=datetime.utcnow()
            )
            return False, issue
        
        data_type = rule.parameters.get("data_type", "string")
        positive = rule.parameters.get("positive", False)
        
        violations = pd.Series([False] * len(df))
        
        if data_type == "numeric":
            numeric_series = pd.to_numeric(df[rule.column], errors='coerce')
            violations |= numeric_series.isna() & df[rule.column].notna()
            
            if positive:
                violations |= (numeric_series <= 0) & numeric_series.notna()
        
        violation_count = violations.sum()
        accuracy_score = 1 - (violation_count / len(df)) if len(df) > 0 else 1
        
        passed = accuracy_score >= rule.threshold
        
        # Get sample violation values
        sample_violations = df[violations][rule.column].head(5).tolist()
        
        issue = QualityIssue(
            rule_name=rule.name,
            severity=rule.severity,
            column=rule.column,
            issue_type="format",
            description=f"{violation_count} values with invalid format",
            affected_records=violation_count,
            percentage=(violation_count / len(df) * 100) if len(df) > 0 else 0,
            sample_values=sample_violations,
            timestamp=datetime.utcnow()
        )
        
        return passed, issue
    
    def _check_uniqueness_rule(self, df: pd.DataFrame, rule: QualityRule) -> Tuple[bool, QualityIssue]:
        """Check uniqueness rule."""
        if rule.column not in df.columns:
            issue = QualityIssue(
                rule_name=rule.name,
                severity=rule.severity,
                column=rule.column,
                issue_type="uniqueness",
                description=f"Column {rule.column} not found",
                affected_records=len(df),
                percentage=100.0,
                sample_values=[],
                timestamp=datetime.utcnow()
            )
            return False, issue
        
        # Count duplicates
        duplicates = df[rule.column].duplicated()
        duplicate_count = duplicates.sum()
        uniqueness_score = 1 - (duplicate_count / len(df)) if len(df) > 0 else 1
        
        passed = uniqueness_score >= rule.threshold
        
        # Get sample duplicate values
        duplicate_values = df[duplicates][rule.column].head(5).tolist()
        
        issue = QualityIssue(
            rule_name=rule.name,
            severity=rule.severity,
            column=rule.column,
            issue_type="uniqueness",
            description=f"{duplicate_count} duplicate values found",
            affected_records=duplicate_count,
            percentage=(duplicate_count / len(df) * 100) if len(df) > 0 else 0,
            sample_values=duplicate_values,
            timestamp=datetime.utcnow()
        )
        
        return passed, issue
    
    def _check_consistency_rule(self, df: pd.DataFrame, rule: QualityRule) -> Tuple[bool, QualityIssue]:
        """Check consistency rule."""
        if rule.column not in df.columns:
            issue = QualityIssue(
                rule_name=rule.name,
                severity=rule.severity,
                column=rule.column,
                issue_type="consistency",
                description=f"Column {rule.column} not found",
                affected_records=len(df),
                percentage=100.0,
                sample_values=[],
                timestamp=datetime.utcnow()
            )
            return False, issue
        
        expected_values = rule.parameters.get("expected_brands", [])
        
        if expected_values:
            # Check if values are in expected list (case-insensitive)
            expected_lower = [str(v).lower() for v in expected_values]
            actual_values = df[rule.column].dropna().astype(str).str.lower()
            
            inconsistent = ~actual_values.isin(expected_lower)
            inconsistent_count = inconsistent.sum()
            consistency_score = 1 - (inconsistent_count / len(actual_values)) if len(actual_values) > 0 else 1
            
            passed = consistency_score >= rule.threshold
            
            # Get sample inconsistent values
            inconsistent_values = df[rule.column][inconsistent].head(5).tolist()
            
            issue = QualityIssue(
                rule_name=rule.name,
                severity=rule.severity,
                column=rule.column,
                issue_type="consistency",
                description=f"{inconsistent_count} values not in expected list",
                affected_records=inconsistent_count,
                percentage=(inconsistent_count / len(actual_values) * 100) if len(actual_values) > 0 else 0,
                sample_values=inconsistent_values,
                timestamp=datetime.utcnow()
            )
            
            return passed, issue
        
        # Default consistency check (no specific rules)
        issue = QualityIssue(
            rule_name=rule.name,
            severity=rule.severity,
            column=rule.column,
            issue_type="consistency",
            description="No consistency issues detected",
            affected_records=0,
            percentage=0.0,
            sample_values=[],
            timestamp=datetime.utcnow()
        )
        
        return True, issue
    
    def validate_data_quality(self, df: pd.DataFrame) -> Tuple[Dict[str, Any], List[QualityIssue]]:
        """
        Perform comprehensive data quality validation.
        
        Args:
            df: DataFrame to validate
            
        Returns:
            Tuple of (quality metrics, list of issues)
        """
        logger.info(f"Starting data quality validation for {len(df)} records")
        
        issues = []
        rule_results = {}
        
        # Run all quality rules
        for rule in self.quality_rules:
            try:
                if rule.rule_type == "completeness":
                    passed, issue = self._check_completeness_rule(df, rule)
                elif rule.rule_type == "range":
                    passed, issue = self._check_range_rule(df, rule)
                elif rule.rule_type == "format":
                    passed, issue = self._check_format_rule(df, rule)
                elif rule.rule_type == "uniqueness":
                    passed, issue = self._check_uniqueness_rule(df, rule)
                elif rule.rule_type == "consistency":
                    passed, issue = self._check_consistency_rule(df, rule)
                else:
                    continue
                
                rule_results[rule.name] = {
                    "passed": passed,
                    "severity": rule.severity,
                    "threshold": rule.threshold
                }
                
                if not passed or issue.affected_records > 0:
                    issues.append(issue)
                
                # Update metrics
                data_quality_checks.labels(status='passed' if passed else 'failed').inc()
                
                if not passed:
                    data_quality_anomalies.labels(type=rule.rule_type).inc()
                
            except Exception as e:
                logger.error(f"Error checking rule {rule.name}: {e}")
                data_quality_checks.labels(status='error').inc()
        
        # Calculate overall quality metrics
        quality_metrics = self._calculate_quality_metrics(df, rule_results, issues)
        
        # Update Prometheus metrics
        data_quality_completeness.set(quality_metrics['completeness_score'])
        data_quality_accuracy.set(quality_metrics['accuracy_score'])
        data_quality_consistency.set(quality_metrics['consistency_score'])
        
        # Store historical metrics
        self._store_historical_metrics(quality_metrics)
        
        logger.info(f"Data quality validation completed. Overall score: {quality_metrics['overall_score']:.2f}")
        
        return quality_metrics, issues
    
    def _calculate_quality_metrics(self, df: pd.DataFrame, rule_results: Dict, issues: List[QualityIssue]) -> Dict[str, Any]:
        """Calculate overall quality metrics."""
        
        # Calculate scores by category
        completeness_rules = [r for r in self.quality_rules if r.rule_type == "completeness"]
        accuracy_rules = [r for r in self.quality_rules if r.rule_type in ["range", "format"]]
        consistency_rules = [r for r in self.quality_rules if r.rule_type in ["uniqueness", "consistency"]]
        
        def calculate_category_score(rules):
            if not rules:
                return 1.0
            
            passed_count = sum(1 for rule in rules if rule_results.get(rule.name, {}).get("passed", False))
            return passed_count / len(rules)
        
        completeness_score = calculate_category_score(completeness_rules)
        accuracy_score = calculate_category_score(accuracy_rules)
        consistency_score = calculate_category_score(consistency_rules)
        
        # Overall score (weighted average)
        overall_score = (completeness_score * 0.4 + accuracy_score * 0.3 + consistency_score * 0.3)
        
        # Count issues by severity
        critical_issues = len([i for i in issues if i.severity == "critical"])
        warning_issues = len([i for i in issues if i.severity == "warning"])
        info_issues = len([i for i in issues if i.severity == "info"])
        
        return {
            "overall_score": overall_score,
            "completeness_score": completeness_score,
            "accuracy_score": accuracy_score,
            "consistency_score": consistency_score,
            "total_records": len(df),
            "total_columns": len(df.columns),
            "total_issues": len(issues),
            "critical_issues": critical_issues,
            "warning_issues": warning_issues,
            "info_issues": info_issues,
            "rules_passed": sum(1 for r in rule_results.values() if r.get("passed", False)),
            "rules_failed": sum(1 for r in rule_results.values() if not r.get("passed", True)),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _store_historical_metrics(self, metrics: Dict[str, Any]) -> None:
        """Store historical quality metrics in Redis."""
        if not self.redis_client:
            return
        
        try:
            key = f"{settings.redis_key_prefix}quality_metrics"
            
            # Store current metrics
            self.redis_client.lpush(key, json.dumps(metrics, default=str))
            
            # Keep only last 100 entries
            self.redis_client.ltrim(key, 0, 99)
            
            # Set expiration
            self.redis_client.expire(key, settings.cache_ttl * 24)  # 24 hours
            
        except Exception as e:
            logger.error(f"Error storing historical metrics: {e}")
    
    def get_quality_trends(self, days: int = 7) -> List[QualityTrend]:
        """Get quality trends over time."""
        if not self.redis_client:
            return []
        
        try:
            key = f"{settings.redis_key_prefix}quality_metrics"
            
            # Get historical metrics
            historical_data = self.redis_client.lrange(key, 0, -1)
            
            if len(historical_data) < 2:
                return []
            
            # Parse metrics
            metrics_list = []
            for data in historical_data:
                try:
                    metrics = json.loads(data)
                    metrics_list.append(metrics)
                except:
                    continue
            
            if len(metrics_list) < 2:
                return []
            
            # Calculate trends
            current = metrics_list[0]  # Most recent
            previous = metrics_list[1]  # Previous
            
            trends = []
            
            for metric_name in ['overall_score', 'completeness_score', 'accuracy_score', 'consistency_score']:
                current_val = current.get(metric_name, 0)
                previous_val = previous.get(metric_name, 0)
                
                if previous_val > 0:
                    change_pct = ((current_val - previous_val) / previous_val) * 100
                    
                    if abs(change_pct) < 1:  # Less than 1% change
                        direction = "stable"
                    elif change_pct > 0:
                        direction = "improving"
                    else:
                        direction = "degrading"
                else:
                    change_pct = None
                    direction = "stable"
                
                trends.append(QualityTrend(
                    metric_name=metric_name,
                    current_value=current_val,
                    previous_value=previous_val,
                    trend_direction=direction,
                    change_percentage=change_pct
                ))
            
            return trends
            
        except Exception as e:
            logger.error(f"Error getting quality trends: {e}")
            return []
    
    def detect_anomalies(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect data anomalies using statistical methods."""
        logger.info("Detecting data anomalies")
        
        anomalies = []
        
        # Price anomalies
        if 'price_original' in df.columns:
            price_series = pd.to_numeric(df['price_original'], errors='coerce').dropna()
            
            if len(price_series) > 10:
                # Use IQR method for outlier detection
                Q1 = price_series.quantile(0.25)
                Q3 = price_series.quantile(0.75)
                IQR = Q3 - Q1
                
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                outliers = price_series[(price_series < lower_bound) | (price_series > upper_bound)]
                
                if len(outliers) > 0:
                    anomalies.append({
                        "type": "price_outliers",
                        "description": f"Found {len(outliers)} price outliers",
                        "affected_records": len(outliers),
                        "sample_values": outliers.head(5).tolist(),
                        "bounds": {"lower": lower_bound, "upper": upper_bound}
                    })
        
        # Brand distribution anomalies
        if 'brand' in df.columns:
            brand_counts = df['brand'].value_counts()
            
            # Check for brands with very few products (potential data entry errors)
            rare_brands = brand_counts[brand_counts == 1]
            
            if len(rare_brands) > len(brand_counts) * 0.1:  # More than 10% are single-product brands
                anomalies.append({
                    "type": "rare_brands",
                    "description": f"Found {len(rare_brands)} brands with only 1 product",
                    "affected_records": len(rare_brands),
                    "sample_values": rare_brands.index.tolist()[:5]
                })
        
        # Missing data patterns
        missing_data = df.isnull().sum()
        high_missing = missing_data[missing_data > len(df) * 0.5]  # More than 50% missing
        
        if len(high_missing) > 0:
            anomalies.append({
                "type": "high_missing_data",
                "description": f"Found {len(high_missing)} columns with >50% missing data",
                "affected_records": len(high_missing),
                "sample_values": high_missing.to_dict()
            })
        
        logger.info(f"Detected {len(anomalies)} anomalies")
        return anomalies
    
    def generate_quality_report(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate comprehensive data quality report."""
        logger.info("Generating comprehensive data quality report")
        
        # Run validation
        quality_metrics, issues = self.validate_data_quality(df)
        
        # Detect anomalies
        anomalies = self.detect_anomalies(df)
        
        # Get trends
        trends = self.get_quality_trends()
        
        # Generate recommendations
        recommendations = self._generate_recommendations(quality_metrics, issues, anomalies)
        
        report = {
            "summary": {
                "overall_score": quality_metrics["overall_score"],
                "total_records": quality_metrics["total_records"],
                "total_issues": quality_metrics["total_issues"],
                "critical_issues": quality_metrics["critical_issues"],
                "data_quality_grade": self._get_quality_grade(quality_metrics["overall_score"])
            },
            "metrics": quality_metrics,
            "issues": [
                {
                    "rule_name": issue.rule_name,
                    "severity": issue.severity,
                    "column": issue.column,
                    "description": issue.description,
                    "affected_records": issue.affected_records,
                    "percentage": issue.percentage,
                    "sample_values": issue.sample_values[:3]  # Limit samples
                }
                for issue in issues
            ],
            "anomalies": anomalies,
            "trends": [
                {
                    "metric": trend.metric_name,
                    "current": trend.current_value,
                    "direction": trend.trend_direction,
                    "change_percentage": trend.change_percentage
                }
                for trend in trends
            ],
            "recommendations": recommendations,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return report
    
    def _generate_recommendations(self, metrics: Dict, issues: List[QualityIssue], anomalies: List[Dict]) -> List[str]:
        """Generate actionable recommendations based on quality assessment."""
        recommendations = []
        
        # Overall score recommendations
        if metrics["overall_score"] < 0.7:
            recommendations.append("Data quality is below acceptable threshold. Immediate action required.")
        elif metrics["overall_score"] < 0.9:
            recommendations.append("Data quality needs improvement. Review and fix identified issues.")
        
        # Critical issues
        if metrics["critical_issues"] > 0:
            recommendations.append(f"Address {metrics['critical_issues']} critical data quality issues immediately.")
        
        # Completeness recommendations
        if metrics["completeness_score"] < 0.8:
            recommendations.append("Improve data completeness by implementing better data collection processes.")
        
        # Accuracy recommendations
        if metrics["accuracy_score"] < 0.9:
            recommendations.append("Review data validation rules and implement stricter input controls.")
        
        # Consistency recommendations
        if metrics["consistency_score"] < 0.9:
            recommendations.append("Standardize data entry processes to improve consistency.")
        
        # Anomaly-based recommendations
        for anomaly in anomalies:
            if anomaly["type"] == "price_outliers":
                recommendations.append("Review price outliers for potential data entry errors.")
            elif anomaly["type"] == "rare_brands":
                recommendations.append("Verify brand names for potential typos or inconsistencies.")
            elif anomaly["type"] == "high_missing_data":
                recommendations.append("Investigate columns with high missing data rates.")
        
        return recommendations
    
    def _get_quality_grade(self, score: float) -> str:
        """Convert quality score to letter grade."""
        if score >= 0.95:
            return "A+"
        elif score >= 0.90:
            return "A"
        elif score >= 0.85:
            return "B+"
        elif score >= 0.80:
            return "B"
        elif score >= 0.75:
            return "C+"
        elif score >= 0.70:
            return "C"
        elif score >= 0.65:
            return "D+"
        elif score >= 0.60:
            return "D"
        else:
            return "F"