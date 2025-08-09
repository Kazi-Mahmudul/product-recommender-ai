"""
Contextual Response Formatter for optimal frontend consumption
"""

import logging
from typing import Dict, List, Any, Optional
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)

class ContextualResponseFormatter:
    """Formats contextual responses for optimal frontend consumption"""
    
    def __init__(self):
        """Initialize the response formatter"""
        self.brand_colors = [
            "#4A90E2", "#7ED321", "#F5A623", "#D0021B", "#9013FE",
            "#50E3C2", "#B8E986", "#F8E71C", "#BD10E0", "#B4A7D6"
        ]
        
        self.feature_display_names = {
            "price_original": "Price",
            "ram_gb": "RAM",
            "storage_gb": "Storage", 
            "primary_camera_mp": "Main Camera",
            "selfie_camera_mp": "Front Camera",
            "battery_capacity_numeric": "Battery",
            "screen_size_numeric": "Screen Size",
            "refresh_rate_numeric": "Refresh Rate",
            "display_score": "Display Score",
            "camera_score": "Camera Score",
            "battery_score": "Battery Score",
            "performance_score": "Performance Score",
            "overall_device_score": "Overall Score"
        }
    
    def format_comparison_response(
        self, 
        phones: List[Dict], 
        features: List[Dict] = None, 
        focus_area: str = None
    ) -> Dict[str, Any]:
        """
        Format comparison response with chart data and metadata
        
        Args:
            phones: List of phone objects to compare
            features: Optional list of feature data
            focus_area: Optional focus area for comparison
            
        Returns:
            Formatted comparison response
        """
        try:
            if not phones or len(phones) < 2:
                return self.format_error_response(
                    "insufficient_data",
                    "At least 2 phones are required for comparison",
                    ["Try adding more phones to your comparison"]
                )
            
            # Prepare phone info with colors
            phone_infos = []
            for idx, phone in enumerate(phones):
                phone_infos.append({
                    "id": phone.get("id"),
                    "name": phone.get("name"),
                    "brand": phone.get("brand"),
                    "img_url": phone.get("img_url"),
                    "price": phone.get("price_original"),
                    "color": self.brand_colors[idx % len(self.brand_colors)]
                })
            
            # Generate comparison features if not provided
            if not features:
                features = self._generate_comparison_features(phones, focus_area)
            
            # Generate contextual summary
            summary = self._generate_comparison_summary(phone_infos, features, focus_area)
            
            return {
                "type": "comparison",
                "phones": phone_infos,
                "features": features,
                "summary": summary,
                "focus_area": focus_area,
                "metadata": {
                    "phone_count": len(phones),
                    "feature_count": len(features),
                    "has_focus": focus_area is not None,
                    "generated_at": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error formatting comparison response: {e}")
            return self.format_error_response(
                "formatting_error",
                "Error formatting comparison data",
                ["Please try again with different phones"]
            )
    
    def format_alternative_response(
        self, 
        phones: List[Dict], 
        reference_phone: Dict, 
        criteria: Dict = None
    ) -> Dict[str, Any]:
        """
        Format alternative phone suggestions response
        
        Args:
            phones: List of alternative phones
            reference_phone: The reference phone
            criteria: Criteria used for finding alternatives
            
        Returns:
            Formatted alternative response
        """
        try:
            if not phones:
                return self.format_error_response(
                    "no_alternatives",
                    f"No alternatives found for {reference_phone.get('name', 'the selected phone')}",
                    [
                        "Try adjusting your criteria",
                        "Consider phones in a different price range",
                        "Look for phones from different brands"
                    ]
                )
            
            # Format alternative phones
            formatted_alternatives = []
            for phone in phones[:10]:  # Limit to top 10
                formatted_alternatives.append({
                    "id": phone.get("id"),
                    "name": phone.get("name"),
                    "brand": phone.get("brand"),
                    "img_url": phone.get("img_url"),
                    "price": phone.get("price_original"),
                    "overall_score": phone.get("overall_device_score"),
                    "match_reason": self._generate_match_reason(phone, reference_phone, criteria)
                })
            
            # Generate summary
            summary = self._generate_alternative_summary(
                formatted_alternatives, 
                reference_phone, 
                criteria
            )
            
            return {
                "type": "alternative",
                "reference_phone": {
                    "id": reference_phone.get("id"),
                    "name": reference_phone.get("name"),
                    "brand": reference_phone.get("brand"),
                    "price": reference_phone.get("price_original")
                },
                "alternatives": formatted_alternatives,
                "summary": summary,
                "criteria": criteria or {},
                "metadata": {
                    "alternative_count": len(formatted_alternatives),
                    "reference_phone_name": reference_phone.get("name"),
                    "generated_at": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error formatting alternative response: {e}")
            return self.format_error_response(
                "formatting_error",
                "Error formatting alternative suggestions",
                ["Please try again with different criteria"]
            )
    
    def format_specification_response(
        self, 
        phone: Dict, 
        requested_features: List[str] = None
    ) -> Dict[str, Any]:
        """
        Format detailed specification response
        
        Args:
            phone: Phone object with specifications
            requested_features: Optional list of specific features requested
            
        Returns:
            Formatted specification response
        """
        try:
            if not phone:
                return self.format_error_response(
                    "no_phone_data",
                    "No phone data available for specifications",
                    ["Please try with a different phone"]
                )
            
            # Organize specifications by category
            specifications = self._organize_specifications(phone, requested_features)
            
            # Generate specification summary
            summary = self._generate_specification_summary(phone, specifications)
            
            return {
                "type": "specification",
                "phone": {
                    "id": phone.get("id"),
                    "name": phone.get("name"),
                    "brand": phone.get("brand"),
                    "img_url": phone.get("img_url"),
                    "price": phone.get("price_original")
                },
                "specifications": specifications,
                "summary": summary,
                "requested_features": requested_features or [],
                "metadata": {
                    "phone_name": phone.get("name"),
                    "spec_categories": len(specifications),
                    "generated_at": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error formatting specification response: {e}")
            return self.format_error_response(
                "formatting_error",
                "Error formatting phone specifications",
                ["Please try again with a different phone"]
            )
    
    def format_error_response(
        self, 
        error_type: str, 
        message: str, 
        suggestions: List[str] = None
    ) -> Dict[str, Any]:
        """
        Format standardized error response
        
        Args:
            error_type: Type of error
            message: Error message
            suggestions: Optional list of suggestions
            
        Returns:
            Formatted error response
        """
        return {
            "type": "error",
            "error_type": error_type,
            "message": message,
            "suggestions": suggestions or [],
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "recoverable": len(suggestions or []) > 0
            }
        }
    
    def _generate_comparison_features(
        self, 
        phones: List[Dict], 
        focus_area: str = None
    ) -> List[Dict]:
        """Generate comparison features based on focus area"""
        if focus_area == "camera":
            feature_keys = [
                "primary_camera_mp", "selfie_camera_mp", "camera_score", 
                "price_original", "overall_device_score"
            ]
        elif focus_area == "battery":
            feature_keys = [
                "battery_capacity_numeric", "battery_score", 
                "price_original", "overall_device_score"
            ]
        elif focus_area == "performance":
            feature_keys = [
                "performance_score", "ram_gb", "storage_gb",
                "price_original", "overall_device_score"
            ]
        elif focus_area == "display":
            feature_keys = [
                "display_score", "screen_size_numeric", "refresh_rate_numeric",
                "price_original", "overall_device_score"
            ]
        else:
            # Default comprehensive comparison
            feature_keys = [
                "price_original", "ram_gb", "storage_gb", "primary_camera_mp",
                "battery_capacity_numeric", "display_score", "overall_device_score"
            ]
        
        # Generate feature data
        features = []
        for key in feature_keys:
            values = [phone.get(key) for phone in phones]
            
            # Skip if all values are None
            if all(v is None for v in values):
                continue
            
            # Handle different data types
            if all(isinstance(v, (bool, type(None))) for v in values):
                # Boolean values
                norm_values = [int(bool(v)) if v is not None else 0 for v in values]
                raw_values = [bool(v) if v is not None else False for v in values]
            else:
                # Numeric values
                numeric_values = [float(v) if v is not None else 0 for v in values]
                total = sum(numeric_values)
                norm_values = [(v / total * 100) if total > 0 else 0 for v in numeric_values]
                raw_values = values
            
            features.append({
                "key": key,
                "label": self.feature_display_names.get(key, key.replace("_", " ").title()),
                "raw": raw_values,
                "normalized": norm_values,
                "unit": self._get_feature_unit(key)
            })
        
        return features
    
    def _generate_comparison_summary(
        self, 
        phones: List[Dict], 
        features: List[Dict], 
        focus_area: str = None
    ) -> str:
        """Generate intelligent comparison summary"""
        if not phones or not features:
            return "Comparison data unavailable."
        
        summary_parts = []
        
        if focus_area:
            # Focus-specific summary
            if focus_area == "camera":
                camera_feature = next((f for f in features if "camera" in f["key"]), None)
                if camera_feature and camera_feature["raw"]:
                    best_idx = camera_feature["raw"].index(max(camera_feature["raw"]))
                    summary_parts.append(f"For camera quality, {phones[best_idx]['name']} leads the comparison.")
            
            elif focus_area == "battery":
                battery_feature = next((f for f in features if "battery" in f["key"]), None)
                if battery_feature and battery_feature["raw"]:
                    best_idx = battery_feature["raw"].index(max(battery_feature["raw"]))
                    summary_parts.append(f"For battery life, {phones[best_idx]['name']} offers the best capacity.")
            
            elif focus_area == "performance":
                perf_feature = next((f for f in features if "performance" in f["key"]), None)
                if perf_feature and perf_feature["raw"]:
                    best_idx = perf_feature["raw"].index(max(perf_feature["raw"]))
                    summary_parts.append(f"For performance, {phones[best_idx]['name']} delivers the best results.")
        
        # Price comparison
        price_feature = next((f for f in features if f["key"] == "price_original"), None)
        if price_feature and price_feature["raw"]:
            min_idx = price_feature["raw"].index(min(price_feature["raw"]))
            max_idx = price_feature["raw"].index(max(price_feature["raw"]))
            summary_parts.append(f"{phones[min_idx]['name']} is the most affordable, while {phones[max_idx]['name']} is the premium option.")
        
        return " ".join(summary_parts) if summary_parts else f"Comparison of {len(phones)} phones completed."
    
    def _generate_match_reason(
        self, 
        phone: Dict, 
        reference_phone: Dict, 
        criteria: Dict = None
    ) -> str:
        """Generate reason why this phone is a good alternative"""
        reasons = []
        
        # Price comparison
        phone_price = phone.get("price_original", 0)
        ref_price = reference_phone.get("price_original", 0)
        
        if phone_price < ref_price:
            savings = ref_price - phone_price
            reasons.append(f"৳{savings:,.0f} cheaper")
        elif phone_price > ref_price:
            premium = phone_price - ref_price
            reasons.append(f"Premium option (+৳{premium:,.0f})")
        
        # Score comparison
        phone_score = phone.get("overall_device_score", 0)
        ref_score = reference_phone.get("overall_device_score", 0)
        
        if phone_score > ref_score:
            reasons.append("Higher overall rating")
        
        # Brand diversity
        if phone.get("brand") != reference_phone.get("brand"):
            reasons.append(f"Different brand ({phone.get('brand')})")
        
        return ", ".join(reasons) if reasons else "Similar specifications"
    
    def _generate_alternative_summary(
        self, 
        alternatives: List[Dict], 
        reference_phone: Dict, 
        criteria: Dict = None
    ) -> str:
        """Generate summary for alternative suggestions"""
        if not alternatives:
            return "No alternatives found."
        
        ref_name = reference_phone.get("name", "the selected phone")
        alt_count = len(alternatives)
        
        # Analyze price range
        ref_price = reference_phone.get("price_original", 0)
        cheaper_count = sum(1 for alt in alternatives if alt.get("price", 0) < ref_price)
        expensive_count = sum(1 for alt in alternatives if alt.get("price", 0) > ref_price)
        
        summary_parts = [f"Found {alt_count} alternatives to {ref_name}."]
        
        if cheaper_count > 0:
            summary_parts.append(f"{cheaper_count} are more affordable options.")
        
        if expensive_count > 0:
            summary_parts.append(f"{expensive_count} are premium alternatives.")
        
        return " ".join(summary_parts)
    
    def _organize_specifications(
        self, 
        phone: Dict, 
        requested_features: List[str] = None
    ) -> Dict[str, Dict]:
        """Organize phone specifications by category"""
        categories = {
            "Basic Info": {
                "name": phone.get("name"),
                "brand": phone.get("brand"),
                "price": phone.get("price_original"),
                "price_category": phone.get("price_category")
            },
            "Display": {
                "screen_size": phone.get("screen_size_numeric"),
                "display_type": phone.get("display_type"),
                "resolution": phone.get("display_resolution"),
                "refresh_rate": phone.get("refresh_rate_numeric"),
                "ppi": phone.get("ppi_numeric"),
                "display_score": phone.get("display_score")
            },
            "Performance": {
                "chipset": phone.get("chipset"),
                "cpu": phone.get("cpu"),
                "gpu": phone.get("gpu"),
                "ram": phone.get("ram_gb"),
                "storage": phone.get("storage_gb"),
                "performance_score": phone.get("performance_score")
            },
            "Camera": {
                "primary_camera": phone.get("primary_camera_mp"),
                "selfie_camera": phone.get("selfie_camera_mp"),
                "camera_setup": phone.get("camera_setup"),
                "camera_features": phone.get("camera_features"),
                "camera_score": phone.get("camera_score")
            },
            "Battery": {
                "capacity": phone.get("battery_capacity_numeric"),
                "battery_type": phone.get("battery_type"),
                "fast_charging": phone.get("has_fast_charging"),
                "wireless_charging": phone.get("has_wireless_charging"),
                "battery_score": phone.get("battery_score")
            },
            "Connectivity": {
                "network": phone.get("network"),
                "bluetooth": phone.get("bluetooth"),
                "wifi": phone.get("wlan"),
                "nfc": phone.get("nfc"),
                "usb": phone.get("usb"),
                "connectivity_score": phone.get("connectivity_score")
            }
        }
        
        # Filter out None values and apply requested features filter
        filtered_categories = {}
        for category, specs in categories.items():
            filtered_specs = {k: v for k, v in specs.items() if v is not None}
            
            if requested_features:
                # Only include requested features
                filtered_specs = {
                    k: v for k, v in filtered_specs.items() 
                    if any(feature.lower() in k.lower() for feature in requested_features)
                }
            
            if filtered_specs:
                filtered_categories[category] = filtered_specs
        
        return filtered_categories
    
    def _generate_specification_summary(
        self, 
        phone: Dict, 
        specifications: Dict[str, Dict]
    ) -> str:
        """Generate summary for phone specifications"""
        phone_name = phone.get("name", "This phone")
        
        highlights = []
        
        # Price highlight
        price = phone.get("price_original")
        if price:
            highlights.append(f"priced at ৳{price:,.0f}")
        
        # Score highlights
        overall_score = phone.get("overall_device_score")
        if overall_score and overall_score >= 8.0:
            highlights.append(f"excellent overall rating ({overall_score:.1f}/10)")
        
        # Feature highlights
        camera_score = phone.get("camera_score")
        if camera_score and camera_score >= 8.5:
            highlights.append("outstanding camera quality")
        
        battery_capacity = phone.get("battery_capacity_numeric")
        if battery_capacity and battery_capacity >= 4500:
            highlights.append("large battery capacity")
        
        if highlights:
            return f"{phone_name} features {', '.join(highlights)}."
        else:
            return f"Complete specifications for {phone_name}."
    
    def _get_feature_unit(self, feature_key: str) -> str:
        """Get appropriate unit for feature"""
        unit_mapping = {
            "price_original": "৳",
            "ram_gb": "GB",
            "storage_gb": "GB",
            "primary_camera_mp": "MP",
            "selfie_camera_mp": "MP",
            "battery_capacity_numeric": "mAh",
            "screen_size_numeric": "inch",
            "refresh_rate_numeric": "Hz",
            "ppi_numeric": "PPI"
        }
        
        if "score" in feature_key:
            return "/10"
        
        return unit_mapping.get(feature_key, "")