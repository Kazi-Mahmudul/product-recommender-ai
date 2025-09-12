"""
Knowledge Retrieval Service - Retrieves relevant phone data from PostgreSQL database.

This service handles database queries to retrieve phone specifications, recommendations,
and comparison data based on GEMINI's parsed intent.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
import logging

from app.crud import phone as phone_crud
from app.models.phone import Phone
from app.services.database_service import db_service, cached_query
from app.services.data_validator import DataValidator

logger = logging.getLogger(__name__)


class KnowledgeRetrievalService:
    """
    Service for retrieving phone knowledge from the database.
    """
    
    def __init__(self):
        self.max_recommendations = 10
        self.max_comparison_phones = 5
        self.valid_filter_keys = {
            'price_original', 'price_category', 'brand', 'ram_gb', 'storage_gb',
            'battery_capacity_numeric', 'camera_score', 'performance_score',
            'display_score', 'overall_device_score', 'is_popular_brand',
            'has_fast_charging', 'has_wireless_charging', 'network'
        }
        
    @cached_query(cache_ttl=1800, use_cache=True)  # Cache for 30 minutes
    async def retrieve_phone_specs(
        self,
        db: Session,
        phone_name: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get detailed specifications for a specific phone with enhanced error handling.
        
        Args:
            db: Database session
            phone_name: Name of the phone to retrieve specs for
            
        Returns:
            Dict containing phone specifications or None if not found
        """
        if not phone_name or not phone_name.strip():
            logger.warning("Empty phone name provided for specs retrieval")
            return None
            
        try:
            # Sanitize phone name
            sanitized_name = phone_name.strip()[:100]  # Limit length
            
            # Try to find phone by name or model
            phone = phone_crud.get_phone_by_name_or_model(db, sanitized_name)
            
            if not phone:
                # Try fuzzy search as fallback
                try:
                    phones = phone_crud.get_phones_by_fuzzy_names(db, [sanitized_name], limit=1)
                    phone = phones[0] if phones else None
                except Exception as fuzzy_error:
                    logger.warning(f"Fuzzy search failed for '{sanitized_name}': {str(fuzzy_error)}")
                    phone = None
            
            if phone:
                try:
                    # Convert to dict and add relevance information
                    phone_dict = phone_crud.phone_to_dict(phone) if hasattr(phone, '__table__') else phone
                    
                    # Add structured specification categories
                    specs = self._structure_phone_specs(phone_dict)
                    specs["relevance_score"] = 1.0  # Perfect match
                    specs["match_reasons"] = [f"Found match for '{phone_name}'"]
                    
                    logger.info(f"Retrieved specs for phone: {phone_dict.get('name', 'Unknown')}")
                    return specs
                except Exception as processing_error:
                    logger.error(f"Error processing phone data for '{sanitized_name}': {str(processing_error)}")
                    return None
            
            logger.info(f"Phone not found in database: {sanitized_name}")
            return None
            
        except Exception as e:
            logger.error(f"Database error retrieving phone specs for '{phone_name}': {str(e)}", exc_info=True)
            return None
    
    @cached_query(cache_ttl=600, use_cache=True)  # Cache for 10 minutes
    async def find_similar_phones(
        self,
        db: Session,
        filters: Dict[str, Any],
        limit: int = None
    ) -> List[Dict[str, Any]]:
        """
        Find phones matching criteria for recommendations with enhanced error handling.
        
        Args:
            db: Database session
            filters: Filter criteria from GEMINI response
            limit: Maximum number of phones to return
            
        Returns:
            List of phone dictionaries with relevance scores
        """
        try:
            limit = min(limit or self.max_recommendations, 50)  # Cap at 50 for performance
            
            # Validate and sanitize filters
            sanitized_filters = DataValidator.validate_filters(filters)
            
            if not sanitized_filters:
                logger.warning("No valid filters provided, using default popular phones")
                sanitized_filters = {"is_popular_brand": True}
            
            # Use existing phone_crud method with filters
            try:
                phones = phone_crud.get_phones_by_filters(db, sanitized_filters, limit=limit)
            except Exception as db_error:
                logger.error(f"Database query failed with filters {sanitized_filters}: {str(db_error)}")
                # Fallback to basic query
                try:
                    phones = phone_crud.get_phones_by_filters(db, {"is_popular_brand": True}, limit=limit)
                except Exception as fallback_error:
                    logger.error(f"Fallback query also failed: {str(fallback_error)}")
                    return []
            
            # Convert to dicts and add RAG-specific metadata
            result_phones = []
            for i, phone in enumerate(phones):
                try:
                    phone_dict = phone_crud.phone_to_dict(phone) if hasattr(phone, '__table__') else phone
                    
                    # Validate and sanitize phone data
                    phone_dict = DataValidator.validate_phone_data(phone_dict)
                    
                    # Check if phone has required data after validation
                    if not phone_dict.get('name') or not phone_dict.get('id'):
                        logger.warning(f"Skipping phone with incomplete data after validation: {phone_dict}")
                        continue
                    
                    # Calculate relevance score based on position and filters
                    relevance_score = max(0.9 - (i * 0.1), 0.1)
                    
                    # Generate match reasons based on filters
                    match_reasons = self._generate_match_reasons(phone_dict, sanitized_filters)
                    
                    phone_dict.update({
                        "relevance_score": relevance_score,
                        "match_reasons": match_reasons,
                        "key_features": self._extract_key_features(phone_dict)
                    })
                    
                    result_phones.append(phone_dict)
                    
                except Exception as phone_error:
                    logger.warning(f"Error processing phone {i}: {str(phone_error)}")
                    continue
            
            logger.info(f"Found {len(result_phones)} phones matching filters: {sanitized_filters}")
            return result_phones
            
        except Exception as e:
            logger.error(f"Critical error finding similar phones: {str(e)}", exc_info=True)
            return []
    
    async def get_comparison_data(
        self,
        db: Session,
        phone_names: List[str]
    ) -> Dict[str, Any]:
        """
        Retrieve data for phone comparisons.
        
        Args:
            db: Database session
            phone_names: List of phone names to compare
            
        Returns:
            Dict containing comparison data structure
        """
        try:
            if not phone_names or len(phone_names) < 2:
                return {"error": "Need at least 2 phones for comparison"}
            
            # Limit to max comparison phones
            phone_names = phone_names[:self.max_comparison_phones]
            
            # Get phones using fuzzy matching
            phones = phone_crud.get_phones_by_fuzzy_names(db, phone_names, limit=len(phone_names))
            
            if len(phones) < 2:
                return {"error": f"Could not find enough phones to compare. Found: {len(phones)}"}
            
            # Convert to dicts
            phone_dicts = []
            for phone in phones:
                phone_dict = phone_crud.phone_to_dict(phone) if hasattr(phone, '__table__') else phone
                phone_dicts.append(phone_dict)
            
            # Generate comparison structure
            comparison_data = self._generate_comparison_structure(phone_dicts)
            
            logger.info(f"Generated comparison data for {len(phone_dicts)} phones")
            return comparison_data
            
        except Exception as e:
            logger.error(f"Error getting comparison data for {phone_names}: {str(e)}")
            return {"error": f"Failed to retrieve comparison data: {str(e)}"}
    
    async def search_by_features(
        self,
        db: Session,
        feature_query: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search phones by specific features or requirements.
        
        Args:
            db: Database session
            feature_query: Feature-based search query
            limit: Maximum number of results
            
        Returns:
            List of relevant phones
        """
        try:
            # Extract feature keywords from query
            feature_filters = self._extract_feature_filters(feature_query)
            
            if not feature_filters:
                # Fallback to popular phones
                phones = phone_crud.get_phones_by_filters(
                    db, 
                    {"is_popular_brand": True}, 
                    limit=limit
                )
            else:
                phones = phone_crud.get_phones_by_filters(db, feature_filters, limit=limit)
            
            # Convert and enhance with feature relevance
            result_phones = []
            for phone in phones:
                phone_dict = phone_crud.phone_to_dict(phone) if hasattr(phone, '__table__') else phone
                
                # Calculate feature relevance
                relevance_score = self._calculate_feature_relevance(phone_dict, feature_query)
                
                phone_dict.update({
                    "relevance_score": relevance_score,
                    "feature_highlights": self._highlight_relevant_features(phone_dict, feature_query)
                })
                
                result_phones.append(phone_dict)
            
            # Sort by relevance score
            result_phones.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
            
            logger.info(f"Found {len(result_phones)} phones for feature query: {feature_query}")
            return result_phones
            
        except Exception as e:
            logger.error(f"Error searching by features '{feature_query}': {str(e)}")
            return []
    
    def _structure_phone_specs(self, phone_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Structure phone specifications into categories."""
        return {
            "basic_info": {
                "id": phone_dict.get("id"),
                "name": phone_dict.get("name"),
                "brand": phone_dict.get("brand"),
                "model": phone_dict.get("model"),
                "price": phone_dict.get("price_original"),
                "price_category": phone_dict.get("price_category"),
                "image": phone_dict.get("img_url")
            },
            "display": {
                "type": phone_dict.get("display_type"),
                "size": phone_dict.get("screen_size_numeric"),
                "resolution": phone_dict.get("display_resolution"),
                "ppi": phone_dict.get("ppi_numeric"),
                "refresh_rate": phone_dict.get("refresh_rate_numeric"),
                "protection": phone_dict.get("screen_protection"),
                "score": phone_dict.get("display_score")
            },
            "performance": {
                "chipset": phone_dict.get("chipset"),
                "cpu": phone_dict.get("cpu"),
                "gpu": phone_dict.get("gpu"),
                "ram": phone_dict.get("ram_gb"),
                "storage": phone_dict.get("storage_gb"),
                "score": phone_dict.get("performance_score")
            },
            "camera": {
                "primary_mp": phone_dict.get("primary_camera_mp"),
                "selfie_mp": phone_dict.get("selfie_camera_mp"),
                "camera_count": phone_dict.get("camera_count"),
                "features": phone_dict.get("camera_features"),
                "score": phone_dict.get("camera_score")
            },
            "battery": {
                "capacity": phone_dict.get("battery_capacity_numeric"),
                "fast_charging": phone_dict.get("has_fast_charging"),
                "wireless_charging": phone_dict.get("has_wireless_charging"),
                "score": phone_dict.get("battery_score")
            },
            "connectivity": {
                "network": phone_dict.get("network"),
                "bluetooth": phone_dict.get("bluetooth"),
                "nfc": phone_dict.get("nfc"),
                "usb": phone_dict.get("usb"),
                "score": phone_dict.get("connectivity_score")
            },
            "design": {
                "build": phone_dict.get("build"),
                "weight": phone_dict.get("weight"),
                "thickness": phone_dict.get("thickness"),
                "colors": phone_dict.get("colors"),
                "waterproof": phone_dict.get("waterproof"),
                "ip_rating": phone_dict.get("ip_rating")
            },
            "scores": {
                "overall": phone_dict.get("overall_device_score"),
                "display": phone_dict.get("display_score"),
                "performance": phone_dict.get("performance_score"),
                "camera": phone_dict.get("camera_score"),
                "battery": phone_dict.get("battery_score"),
                "connectivity": phone_dict.get("connectivity_score"),
                "security": phone_dict.get("security_score")
            }
        }
    
    def _generate_match_reasons(self, phone_dict: Dict[str, Any], filters: Dict[str, Any]) -> List[str]:
        """Generate reasons why a phone matches the search criteria."""
        reasons = []
        
        if filters.get("price_original"):
            price = phone_dict.get("price_original", 0)
            max_price = filters.get("price_original")
            if price <= max_price:
                reasons.append(f"Within budget of ৳{max_price:,.0f}")
        
        if filters.get("ram_gb"):
            ram = phone_dict.get("ram_gb", 0)
            min_ram = filters.get("ram_gb")
            if ram >= min_ram:
                reasons.append(f"Has {ram}GB RAM (≥{min_ram}GB required)")
        
        if filters.get("battery_capacity_numeric"):
            battery = phone_dict.get("battery_capacity_numeric", 0)
            min_battery = filters.get("battery_capacity_numeric")
            if battery >= min_battery:
                reasons.append(f"Large {battery}mAh battery")
        
        if filters.get("camera_score"):
            camera_score = phone_dict.get("camera_score", 0)
            if camera_score >= filters.get("camera_score"):
                reasons.append(f"Excellent camera quality (score: {camera_score:.1f})")
        
        if filters.get("is_popular_brand"):
            if phone_dict.get("is_popular_brand"):
                reasons.append("Popular trusted brand")
        
        return reasons or ["Matches your requirements"]
    
    def _extract_key_features(self, phone_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Extract key features for display."""
        return {
            "ram": f"{phone_dict.get('ram_gb', 'N/A')}GB",
            "storage": f"{phone_dict.get('storage_gb', 'N/A')}GB",
            "camera": f"{phone_dict.get('primary_camera_mp', 'N/A')}MP",
            "battery": f"{phone_dict.get('battery_capacity_numeric', 'N/A')}mAh",
            "display": f"{phone_dict.get('screen_size_numeric', 'N/A')}\"",
            "chipset": phone_dict.get("chipset", "N/A")
        }
    
    def _generate_comparison_structure(self, phone_dicts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate structured comparison data."""
        # Prepare phone info
        phones = []
        for phone in phone_dicts:
            phones.append({
                "id": phone.get("id"),
                "name": phone.get("name"),
                "brand": phone.get("brand"),
                "image": phone.get("img_url"),
                "price": phone.get("price_original")
            })
        
        # Prepare feature comparison
        features = [
            {
                "key": "price_original",
                "label": "Price",
                "values": [p.get("price_original") for p in phone_dicts],
                "unit": "৳"
            },
            {
                "key": "ram_gb",
                "label": "RAM",
                "values": [p.get("ram_gb") for p in phone_dicts],
                "unit": "GB"
            },
            {
                "key": "storage_gb",
                "label": "Storage",
                "values": [p.get("storage_gb") for p in phone_dicts],
                "unit": "GB"
            },
            {
                "key": "primary_camera_mp",
                "label": "Main Camera",
                "values": [p.get("primary_camera_mp") for p in phone_dicts],
                "unit": "MP"
            },
            {
                "key": "battery_capacity_numeric",
                "label": "Battery",
                "values": [p.get("battery_capacity_numeric") for p in phone_dicts],
                "unit": "mAh"
            },
            {
                "key": "overall_device_score",
                "label": "Overall Score",
                "values": [p.get("overall_device_score") for p in phone_dicts],
                "unit": "/10"
            }
        ]
        
        return {
            "phones": phones,
            "features": features,
            "summary": self._generate_comparison_summary(phone_dicts)
        }
    
    def _generate_comparison_summary(self, phone_dicts: List[Dict[str, Any]]) -> str:
        """Generate a summary of the comparison."""
        if not phone_dicts:
            return "No phones to compare."
        
        # Find best in each category
        best_price = min(phone_dicts, key=lambda x: x.get("price_original", float('inf')))
        best_camera = max(phone_dicts, key=lambda x: x.get("camera_score", 0))
        best_battery = max(phone_dicts, key=lambda x: x.get("battery_capacity_numeric", 0))
        
        summary_parts = [
            f"{best_price.get('name')} offers the best value",
            f"{best_camera.get('name')} has the best camera",
            f"{best_battery.get('name')} has the longest battery life"
        ]
        
        return ". ".join(summary_parts) + "."
    
    def _extract_feature_filters(self, feature_query: str) -> Dict[str, Any]:
        """Extract filters from feature-based query."""
        filters = {}
        query_lower = feature_query.lower()
        
        # Battery keywords
        if any(word in query_lower for word in ["battery", "long lasting", "all day"]):
            filters["battery_capacity_numeric"] = 4000
        
        # Camera keywords
        if any(word in query_lower for word in ["camera", "photo", "photography"]):
            filters["camera_score"] = 7.0
        
        # Performance keywords
        if any(word in query_lower for word in ["gaming", "fast", "performance"]):
            filters["performance_score"] = 7.0
        
        # Budget keywords
        if any(word in query_lower for word in ["cheap", "budget", "affordable"]):
            filters["price_original"] = 30000
        
        return filters
    
    def _calculate_feature_relevance(self, phone_dict: Dict[str, Any], feature_query: str) -> float:
        """Calculate how relevant a phone is to the feature query."""
        relevance = 0.5  # Base relevance
        query_lower = feature_query.lower()
        
        # Boost relevance based on matching features
        if "battery" in query_lower:
            battery = phone_dict.get("battery_capacity_numeric", 0)
            if battery >= 5000:
                relevance += 0.3
            elif battery >= 4000:
                relevance += 0.2
        
        if "camera" in query_lower:
            camera_score = phone_dict.get("camera_score", 0)
            if camera_score >= 8:
                relevance += 0.3
            elif camera_score >= 7:
                relevance += 0.2
        
        if "performance" in query_lower or "gaming" in query_lower:
            perf_score = phone_dict.get("performance_score", 0)
            if perf_score >= 8:
                relevance += 0.3
            elif perf_score >= 7:
                relevance += 0.2
        
        return min(relevance, 1.0)
    
    def _sanitize_filters(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize and validate filter parameters.
        
        Args:
            filters: Raw filter dictionary
            
        Returns:
            Sanitized filter dictionary
        """
        if not isinstance(filters, dict):
            return {}
        
        sanitized = {}
        
        for key, value in filters.items():
            # Only allow known filter keys
            if key not in self.valid_filter_keys:
                logger.warning(f"Unknown filter key ignored: {key}")
                continue
            
            # Validate and sanitize values
            try:
                if key in ['price_original', 'ram_gb', 'storage_gb', 'battery_capacity_numeric']:
                    # Numeric filters
                    if isinstance(value, (int, float)) and value > 0:
                        sanitized[key] = min(value, 1000000)  # Cap at reasonable max
                elif key in ['camera_score', 'performance_score', 'display_score', 'overall_device_score']:
                    # Score filters (0-10)
                    if isinstance(value, (int, float)) and 0 <= value <= 10:
                        sanitized[key] = value
                elif key in ['has_fast_charging', 'has_wireless_charging', 'is_popular_brand']:
                    # Boolean filters
                    if isinstance(value, bool):
                        sanitized[key] = value
                elif key in ['brand', 'price_category', 'network']:
                    # String filters
                    if isinstance(value, str) and len(value.strip()) > 0:
                        sanitized[key] = value.strip()[:50]  # Limit length
                else:
                    # Generic validation
                    if value is not None:
                        sanitized[key] = value
            except Exception as e:
                logger.warning(f"Error sanitizing filter {key}={value}: {str(e)}")
                continue
        
        return sanitized

    def _highlight_relevant_features(self, phone_dict: Dict[str, Any], feature_query: str) -> List[str]:
        """Highlight features relevant to the query."""
        highlights = []
        query_lower = feature_query.lower()
        
        if "battery" in query_lower:
            battery = phone_dict.get("battery_capacity_numeric")
            if battery:
                highlights.append(f"{battery}mAh battery")
        
        if "camera" in query_lower:
            camera_mp = phone_dict.get("primary_camera_mp")
            if camera_mp:
                highlights.append(f"{camera_mp}MP main camera")
        
        if "performance" in query_lower:
            chipset = phone_dict.get("chipset")
            if chipset:
                highlights.append(f"{chipset} processor")
        
        return highlights