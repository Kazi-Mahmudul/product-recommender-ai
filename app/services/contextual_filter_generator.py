"""
Enhanced Contextual Filter Generator
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from app.services.phone_name_resolver import ResolvedPhone

logger = logging.getLogger(__name__)

@dataclass
class ContextualIntent:
    """Enhanced contextual intent with resolved phones and metadata"""
    query_type: str  # comparison, alternative, specification, relational_recommendation
    confidence: float
    resolved_phones: List[ResolvedPhone]
    relationship: Optional[str]  # better_than, cheaper_than, similar_to, etc.
    focus_area: Optional[str]  # camera, battery, performance, display, price
    filters: Dict[str, Any]
    context_metadata: Dict[str, Any]
    original_query: str
    processed_query: str

class ContextualFilterGenerator:
    """Enhanced filter generator for contextual queries"""
    
    def __init__(self):
        """Initialize the contextual filter generator"""
        self.feature_score_mappings = {
            'camera': 'camera_score',
            'battery': 'battery_score',
            'performance': 'performance_score',
            'display': 'display_score',
            'security': 'security_score',
            'connectivity': 'connectivity_score'
        }
        
        self.feature_numeric_mappings = {
            'camera': ['primary_camera_mp', 'selfie_camera_mp', 'camera_count'],
            'battery': ['battery_capacity_numeric'],
            'performance': ['ram_gb', 'storage_gb'],
            'display': ['screen_size_numeric', 'refresh_rate_numeric', 'ppi_numeric'],
            'price': ['price_original']
        }
        
        # Thresholds for "better than" relationships
        self.improvement_thresholds = {
            'score': 0.5,  # Score improvement threshold
            'price': 1000,  # Price difference threshold (BDT)
            'battery': 500,  # Battery capacity improvement (mAh)
            'ram': 2,  # RAM improvement (GB)
            'storage': 32,  # Storage improvement (GB)
            'camera': 8,  # Camera MP improvement
            'screen_size': 0.2,  # Screen size improvement (inches)
            'refresh_rate': 30  # Refresh rate improvement (Hz)
        }
    
    def generate_filters(
        self, 
        intent: ContextualIntent, 
        resolved_phones: List[ResolvedPhone]
    ) -> Dict[str, Any]:
        """
        Generate intelligent database filters based on contextual intent
        
        Args:
            intent: The contextual intent
            resolved_phones: List of resolved phone references
            
        Returns:
            Dictionary of database filters
        """
        if not resolved_phones:
            logger.warning("No resolved phones provided for filter generation")
            return {}
        
        try:
            query_type = intent.query_type
            relationship = intent.relationship
            focus_area = intent.focus_area
            
            if query_type == "comparison":
                return self.generate_comparison_filters(resolved_phones, focus_area)
            elif query_type == "alternative":
                return self.generate_alternative_filters(
                    resolved_phones[0], 
                    intent.context_metadata.get('criteria', {})
                )
            elif query_type == "contextual_recommendation":
                return self.generate_relational_filters(
                    resolved_phones[0], 
                    relationship, 
                    focus_area
                )
            else:
                # Default to similarity filters
                return self.generate_similar_filters(resolved_phones[0])
                
        except Exception as e:
            logger.error(f"Error generating contextual filters: {e}")
            return {}
    
    def generate_comparison_filters(
        self, 
        phones: List[ResolvedPhone], 
        focus_area: str = None
    ) -> Dict[str, Any]:
        """
        Generate filters for phone comparisons
        
        Args:
            phones: List of phones to compare
            focus_area: Specific area to focus comparison on
            
        Returns:
            Comparison configuration filters
        """
        filters = {
            'comparison_mode': True,
            'phone_ids': [phone.matched_phone.get('id') for phone in phones if phone.matched_phone.get('id')],
            'focus_area': focus_area
        }
        
        if focus_area:
            # Add focus-specific filters
            if focus_area == 'camera':
                filters['include_features'] = [
                    'primary_camera_mp', 'selfie_camera_mp', 'camera_score',
                    'camera_features', 'camera_setup'
                ]
            elif focus_area == 'battery':
                filters['include_features'] = [
                    'battery_capacity_numeric', 'battery_score', 'has_fast_charging',
                    'has_wireless_charging', 'charging_wattage'
                ]
            elif focus_area == 'performance':
                filters['include_features'] = [
                    'performance_score', 'ram_gb', 'storage_gb', 'chipset', 'cpu'
                ]
            elif focus_area == 'display':
                filters['include_features'] = [
                    'display_score', 'screen_size_numeric', 'refresh_rate_numeric',
                    'display_type', 'ppi_numeric'
                ]
            elif focus_area == 'price':
                filters['include_features'] = [
                    'price_original', 'price_category', 'value_for_money'
                ]
        
        return filters
    
    def generate_alternative_filters(
        self, 
        reference_phone: ResolvedPhone, 
        criteria: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Generate filters for finding alternative phones
        
        Args:
            reference_phone: The reference phone to find alternatives for
            criteria: Criteria for alternatives (price_constraint, feature_constraint, etc.)
            
        Returns:
            Alternative search filters
        """
        filters = {}
        phone_data = reference_phone.matched_phone
        
        # Base similarity filters
        self._add_similarity_base_filters(filters, phone_data)
        
        # Apply specific criteria
        price_constraint = criteria.get('price_constraint')
        if price_constraint == 'lower' and phone_data.get('price_original'):
            filters['max_price'] = phone_data['price_original'] - self.improvement_thresholds['price']
        elif price_constraint == 'higher' and phone_data.get('price_original'):
            filters['min_price'] = phone_data['price_original'] + self.improvement_thresholds['price']
        
        # Feature-specific constraints
        for feature, constraint in criteria.items():
            if constraint == 'better' and feature.endswith('_constraint'):
                feature_name = feature.replace('_constraint', '')
                self._add_better_feature_filters(filters, phone_data, feature_name)
        
        # Exclude the reference phone itself
        if phone_data.get('id'):
            filters['exclude_ids'] = [phone_data['id']]
        
        return filters
    
    def generate_relational_filters(
        self, 
        reference_phone: ResolvedPhone, 
        relationship: str, 
        focus_area: str = None
    ) -> Dict[str, Any]:
        """
        Generate filters based on relationship to reference phone
        
        Args:
            reference_phone: The reference phone
            relationship: Type of relationship (better_than, cheaper_than, etc.)
            focus_area: Specific feature area to focus on
            
        Returns:
            Relational filters
        """
        filters = {}
        phone_data = reference_phone.matched_phone
        
        if relationship == "better_than":
            self._add_better_than_filters(filters, phone_data, focus_area)
        elif relationship == "cheaper_than":
            self._add_cheaper_than_filters(filters, phone_data)
        elif relationship == "more_expensive_than":
            self._add_more_expensive_than_filters(filters, phone_data)
        elif relationship == "similar_to":
            self._add_similar_to_filters(filters, phone_data)
        elif relationship == "worse_than":
            self._add_worse_than_filters(filters, phone_data, focus_area)
        
        # Exclude the reference phone
        if phone_data.get('id'):
            filters['exclude_ids'] = [phone_data['id']]
        
        return filters
    
    def generate_similar_filters(self, reference_phone: ResolvedPhone) -> Dict[str, Any]:
        """Generate filters for phones similar to reference phone"""
        filters = {}
        phone_data = reference_phone.matched_phone
        
        self._add_similar_to_filters(filters, phone_data)
        
        # Exclude the reference phone
        if phone_data.get('id'):
            filters['exclude_ids'] = [phone_data['id']]
        
        return filters
    
    def _add_better_than_filters(
        self, 
        filters: Dict[str, Any], 
        reference_phone: Dict[str, Any], 
        focus_area: str = None
    ) -> None:
        """Add filters for phones better than reference phone"""
        if focus_area:
            # Focus on specific area
            if focus_area == "camera":
                self._add_better_camera_filters(filters, reference_phone)
            elif focus_area == "battery":
                self._add_better_battery_filters(filters, reference_phone)
            elif focus_area == "performance":
                self._add_better_performance_filters(filters, reference_phone)
            elif focus_area == "display":
                self._add_better_display_filters(filters, reference_phone)
            elif focus_area == "price":
                # Better price means cheaper
                self._add_cheaper_than_filters(filters, reference_phone)
        else:
            # Overall better - use overall device score
            if reference_phone.get("overall_device_score"):
                filters["min_overall_device_score"] = (
                    reference_phone["overall_device_score"] + self.improvement_thresholds['score']
                )
    
    def _add_better_camera_filters(self, filters: Dict[str, Any], phone: Dict[str, Any]) -> None:
        """Add filters for better camera phones"""
        if phone.get("camera_score"):
            filters["min_camera_score"] = phone["camera_score"] + self.improvement_thresholds['score']
        
        if phone.get("primary_camera_mp"):
            filters["min_primary_camera_mp"] = (
                phone["primary_camera_mp"] + self.improvement_thresholds['camera']
            )
    
    def _add_better_battery_filters(self, filters: Dict[str, Any], phone: Dict[str, Any]) -> None:
        """Add filters for better battery phones"""
        if phone.get("battery_score"):
            filters["min_battery_score"] = phone["battery_score"] + self.improvement_thresholds['score']
        
        if phone.get("battery_capacity_numeric"):
            filters["min_battery_capacity_numeric"] = (
                phone["battery_capacity_numeric"] + self.improvement_thresholds['battery']
            )
    
    def _add_better_performance_filters(self, filters: Dict[str, Any], phone: Dict[str, Any]) -> None:
        """Add filters for better performance phones"""
        if phone.get("performance_score"):
            filters["min_performance_score"] = (
                phone["performance_score"] + self.improvement_thresholds['score']
            )
        
        if phone.get("ram_gb"):
            filters["min_ram_gb"] = phone["ram_gb"] + self.improvement_thresholds['ram']
    
    def _add_better_display_filters(self, filters: Dict[str, Any], phone: Dict[str, Any]) -> None:
        """Add filters for better display phones"""
        if phone.get("display_score"):
            filters["min_display_score"] = phone["display_score"] + self.improvement_thresholds['score']
        
        if phone.get("refresh_rate_numeric"):
            filters["min_refresh_rate_numeric"] = (
                phone["refresh_rate_numeric"] + self.improvement_thresholds['refresh_rate']
            )
    
    def _add_cheaper_than_filters(self, filters: Dict[str, Any], phone: Dict[str, Any]) -> None:
        """Add filters for phones cheaper than reference"""
        if phone.get("price_original"):
            filters["max_price"] = phone["price_original"] - self.improvement_thresholds['price']
    
    def _add_more_expensive_than_filters(self, filters: Dict[str, Any], phone: Dict[str, Any]) -> None:
        """Add filters for phones more expensive than reference"""
        if phone.get("price_original"):
            filters["min_price"] = phone["price_original"] + self.improvement_thresholds['price']
    
    def _add_similar_to_filters(self, filters: Dict[str, Any], phone: Dict[str, Any]) -> None:
        """Add filters for phones similar to reference"""
        # Similar price range (±20%)
        if phone.get("price_original"):
            price = phone["price_original"]
            filters["min_price"] = int(price * 0.8)
            filters["max_price"] = int(price * 1.2)
        
        # Similar RAM (±2GB)
        if phone.get("ram_gb"):
            ram = phone["ram_gb"]
            filters["min_ram_gb"] = max(4, ram - 2)
            filters["max_ram_gb"] = ram + 4
        
        # Similar storage (±32GB)
        if phone.get("storage_gb"):
            storage = phone["storage_gb"]
            filters["min_storage_gb"] = max(64, storage - 32)
            filters["max_storage_gb"] = storage + 64
        
        # Similar brand preference (optional)
        if phone.get("brand"):
            filters["preferred_brand"] = phone["brand"]
    
    def _add_worse_than_filters(
        self, 
        filters: Dict[str, Any], 
        phone: Dict[str, Any], 
        focus_area: str = None
    ) -> None:
        """Add filters for phones worse than reference (opposite of better_than)"""
        if focus_area:
            if focus_area == "camera" and phone.get("camera_score"):
                filters["max_camera_score"] = phone["camera_score"] - self.improvement_thresholds['score']
            elif focus_area == "battery" and phone.get("battery_score"):
                filters["max_battery_score"] = phone["battery_score"] - self.improvement_thresholds['score']
            elif focus_area == "performance" and phone.get("performance_score"):
                filters["max_performance_score"] = (
                    phone["performance_score"] - self.improvement_thresholds['score']
                )
            elif focus_area == "display" and phone.get("display_score"):
                filters["max_display_score"] = phone["display_score"] - self.improvement_thresholds['score']
        else:
            # Overall worse
            if phone.get("overall_device_score"):
                filters["max_overall_device_score"] = (
                    phone["overall_device_score"] - self.improvement_thresholds['score']
                )
    
    def _add_similarity_base_filters(self, filters: Dict[str, Any], phone: Dict[str, Any]) -> None:
        """Add base similarity filters for alternative phone search"""
        # Price range (±30% for alternatives)
        if phone.get("price_original"):
            price = phone["price_original"]
            filters["min_price"] = int(price * 0.7)
            filters["max_price"] = int(price * 1.3)
        
        # Similar category/tier
        if phone.get("price_category"):
            filters["price_category"] = phone["price_category"]
    
    def _add_better_feature_filters(
        self, 
        filters: Dict[str, Any], 
        phone: Dict[str, Any], 
        feature: str
    ) -> None:
        """Add filters for better performance in specific feature"""
        if feature == "camera":
            self._add_better_camera_filters(filters, phone)
        elif feature == "battery":
            self._add_better_battery_filters(filters, phone)
        elif feature == "performance":
            self._add_better_performance_filters(filters, phone)
        elif feature == "display":
            self._add_better_display_filters(filters, phone)
    
    def calculate_filter_confidence(self, filters: Dict[str, Any], reference_phone: Dict[str, Any]) -> float:
        """
        Calculate confidence score for generated filters
        
        Args:
            filters: Generated filters
            reference_phone: Reference phone data
            
        Returns:
            Confidence score between 0 and 1
        """
        confidence = 0.5  # Base confidence
        
        # Increase confidence based on available reference data
        if reference_phone.get("price_original"):
            confidence += 0.1
        if reference_phone.get("overall_device_score"):
            confidence += 0.1
        if reference_phone.get("camera_score"):
            confidence += 0.1
        if reference_phone.get("battery_score"):
            confidence += 0.1
        
        # Increase confidence based on filter specificity
        if len(filters) > 3:
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def optimize_filters(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Optimize filters to prevent overly restrictive queries
        
        Args:
            filters: Original filters
            
        Returns:
            Optimized filters
        """
        optimized = filters.copy()
        
        # Ensure price ranges are reasonable
        if 'min_price' in optimized and 'max_price' in optimized:
            min_price = optimized['min_price']
            max_price = optimized['max_price']
            
            # Ensure minimum range of 10,000 BDT
            if max_price - min_price < 10000:
                mid_price = (min_price + max_price) / 2
                optimized['min_price'] = int(mid_price - 5000)
                optimized['max_price'] = int(mid_price + 5000)
        
        # Ensure score ranges are not too restrictive
        score_fields = ['min_camera_score', 'min_battery_score', 'min_performance_score', 'min_display_score']
        for field in score_fields:
            if field in optimized and optimized[field] > 9.0:
                optimized[field] = 9.0  # Cap at 9.0 to ensure some results
        
        return optimized