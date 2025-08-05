# Service for handling drill-down commands from power users

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.crud import phone as phone_crud


class DrillDownHandler:
    """Handler for processing drill-down commands from power users"""
    
    @staticmethod
    def process_drill_down_command(
        db: Session,
        command: str,
        target: Optional[str] = None,
        phone_names: Optional[List[str]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a drill-down command and return appropriate response
        
        Args:
            db: Database session
            command: The drill-down command (full_specs, chart_view, detail_focus)
            target: Optional target for detail_focus (display, camera, battery, etc.)
            phone_names: Optional list of phone names to focus on
            context: Optional context from previous conversation
            
        Returns:
            Dictionary containing the drill-down response
        """
        
        if command == "full_specs":
            return DrillDownHandler._handle_full_specs(db, phone_names, context)
        elif command == "chart_view":
            return DrillDownHandler._handle_chart_view(db, phone_names, context)
        elif command == "detail_focus":
            return DrillDownHandler._handle_detail_focus(db, target, phone_names, context)
        else:
            return {
                "type": "error",
                "message": f"Unknown drill-down command: {command}",
                "suggestions": ["full_specs", "chart_view", "detail_focus"]
            }
    
    @staticmethod
    def _handle_full_specs(
        db: Session,
        phone_names: Optional[List[str]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Handle full specifications request"""
        
        # If no phone names provided, try to get from context
        if not phone_names and context and context.get("current_phones"):
            phone_names = [phone.get("name") for phone in context["current_phones"]]
        
        if not phone_names:
            return {
                "type": "error",
                "message": "No phones specified for full specifications view. Please specify phone names or ask for recommendations first."
            }
        
        # Get detailed phone information
        phones = []
        for name in phone_names[:3]:  # Limit to 3 phones
            phone = phone_crud.get_phone_by_name_or_model(db, name)
            if phone:
                phones.append(phone_crud.phone_to_dict(phone))
        
        if not phones:
            return {
                "type": "error",
                "message": f"Could not find detailed specifications for the requested phones: {', '.join(phone_names)}"
            }
        
        return {
            "type": "detailed_specs",
            "phones": phones,
            "message": f"Here are the complete specifications for {len(phones)} phone(s):",
            "back_to_simple": True
        }
    
    @staticmethod
    def _handle_chart_view(
        db: Session,
        phone_names: Optional[List[str]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Handle chart view request"""
        
        # If no phone names provided, try to get from context
        if not phone_names and context and context.get("current_phones"):
            phone_names = [phone.get("name") for phone in context["current_phones"]]
        
        if not phone_names or len(phone_names) < 2:
            return {
                "type": "error",
                "message": "Chart view requires at least 2 phones for comparison. Please specify phone names or ask for recommendations first."
            }
        
        # Get phones for comparison
        phones = []
        for name in phone_names[:5]:  # Limit to 5 phones for chart readability
            phone = phone_crud.get_phone_by_name_or_model(db, name)
            if phone:
                phones.append(phone_crud.phone_to_dict(phone))
        
        if len(phones) < 2:
            return {
                "type": "error",
                "message": f"Could not find enough phones for chart comparison. Found: {len(phones)}, need at least 2."
            }
        
        # Generate comparison data for chart
        comparison_data = DrillDownHandler._generate_comparison_data(phones)
        
        return {
            "type": "chart_visualization",
            "phones": phones,
            "comparison_data": comparison_data,
            "message": f"Interactive chart comparison of {len(phones)} phones:",
            "back_to_simple": True
        }
    
    @staticmethod
    def _handle_detail_focus(
        db: Session,
        target: Optional[str] = None,
        phone_names: Optional[List[str]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Handle detail focus request for specific features"""
        
        if not target:
            target = "general"
        
        # If no phone names provided, try to get from context
        if not phone_names and context and context.get("current_phones"):
            phone_names = [phone.get("name") for phone in context["current_phones"]]
        
        if not phone_names:
            return {
                "type": "error",
                "message": f"No phones specified for {target} details. Please specify phone names or ask for recommendations first."
            }
        
        # Get phones
        phones = []
        for name in phone_names[:3]:  # Limit to 3 phones
            phone = phone_crud.get_phone_by_name_or_model(db, name)
            if phone:
                phones.append(phone_crud.phone_to_dict(phone))
        
        if not phones:
            return {
                "type": "error",
                "message": f"Could not find phones for {target} analysis: {', '.join(phone_names)}"
            }
        
        # Generate feature-specific analysis
        feature_analysis = DrillDownHandler._generate_feature_analysis(phones, target)
        
        return {
            "type": "feature_analysis",
            "target": target,
            "phones": phones,
            "analysis": feature_analysis,
            "message": f"Detailed {target} analysis for {len(phones)} phone(s):",
            "back_to_simple": True
        }
    
    @staticmethod
    def _generate_comparison_data(phones: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate comparison data for chart visualization"""
        
        # Key metrics for comparison
        metrics = [
            ("price_original", "Price (BDT)"),
            ("ram_gb", "RAM (GB)"),
            ("storage_gb", "Storage (GB)"),
            ("primary_camera_mp", "Main Camera (MP)"),
            ("selfie_camera_mp", "Front Camera (MP)"),
            ("battery_capacity_numeric", "Battery (mAh)"),
            ("display_score", "Display Score"),
            ("camera_score", "Camera Score"),
            ("battery_score", "Battery Score"),
            ("performance_score", "Performance Score"),
            ("overall_device_score", "Overall Score")
        ]
        
        chart_data = []
        for metric_key, metric_label in metrics:
            values = []
            for phone in phones:
                value = phone.get(metric_key)
                if value is not None:
                    values.append({
                        "phone": phone.get("name", "Unknown"),
                        "value": float(value) if isinstance(value, (int, float)) else 0
                    })
            
            if values and any(v["value"] > 0 for v in values):
                chart_data.append({
                    "metric": metric_label,
                    "key": metric_key,
                    "values": values
                })
        
        return {
            "metrics": chart_data,
            "phone_names": [phone.get("name", "Unknown") for phone in phones],
            "chart_type": "multi_metric"
        }
    
    @staticmethod
    def _generate_feature_analysis(phones: List[Dict[str, Any]], target: str) -> Dict[str, Any]:
        """Generate detailed analysis for specific features"""
        
        feature_mappings = {
            "display": {
                "fields": [
                    "display_type", "screen_size_numeric", "display_resolution",
                    "ppi_numeric", "refresh_rate_numeric", "screen_protection",
                    "display_brightness", "aspect_ratio", "hdr_support", "display_score"
                ],
                "title": "Display Analysis"
            },
            "camera": {
                "fields": [
                    "camera_setup", "primary_camera_mp", "selfie_camera_mp",
                    "primary_camera_video_recording", "primary_camera_ois",
                    "primary_camera_aperture", "camera_features", "camera_count", "camera_score"
                ],
                "title": "Camera Analysis"
            },
            "battery": {
                "fields": [
                    "battery_type", "battery_capacity_numeric", "quick_charging",
                    "wireless_charging", "reverse_charging", "has_fast_charging",
                    "has_wireless_charging", "charging_wattage", "battery_score"
                ],
                "title": "Battery Analysis"
            },
            "performance": {
                "fields": [
                    "chipset", "cpu", "gpu", "ram_gb", "ram_type",
                    "internal_storage", "storage_gb", "storage_type", "performance_score"
                ],
                "title": "Performance Analysis"
            },
            "connectivity": {
                "fields": [
                    "network", "speed", "sim_slot", "volte", "bluetooth",
                    "wlan", "gps", "nfc", "usb", "usb_otg", "connectivity_score"
                ],
                "title": "Connectivity Analysis"
            }
        }
        
        feature_config = feature_mappings.get(target, {
            "fields": ["name", "brand", "price_original", "overall_device_score"],
            "title": "General Analysis"
        })
        
        analysis = {
            "title": feature_config["title"],
            "target": target,
            "phones": []
        }
        
        for phone in phones:
            phone_analysis = {
                "name": phone.get("name", "Unknown"),
                "brand": phone.get("brand", "Unknown"),
                "features": {}
            }
            
            for field in feature_config["fields"]:
                value = phone.get(field)
                if value is not None:
                    phone_analysis["features"][field] = value
            
            analysis["phones"].append(phone_analysis)
        
        # Generate insights
        analysis["insights"] = DrillDownHandler._generate_feature_insights(phones, target, feature_config["fields"])
        
        return analysis
    
    @staticmethod
    def _generate_feature_insights(phones: List[Dict[str, Any]], target: str, fields: List[str]) -> List[str]:
        """Generate insights for feature analysis"""
        
        insights = []
        
        if target == "display":
            # Display-specific insights
            high_refresh_phones = [p for p in phones if p.get("refresh_rate_numeric", 0) >= 90]
            if high_refresh_phones:
                insights.append(f"{len(high_refresh_phones)} phone(s) have high refresh rate displays (90Hz+)")
            
            large_screen_phones = [p for p in phones if p.get("screen_size_numeric", 0) >= 6.5]
            if large_screen_phones:
                insights.append(f"{len(large_screen_phones)} phone(s) have large screens (6.5+ inches)")
        
        elif target == "camera":
            # Camera-specific insights
            high_mp_phones = [p for p in phones if p.get("primary_camera_mp", 0) >= 48]
            if high_mp_phones:
                insights.append(f"{len(high_mp_phones)} phone(s) have high-resolution main cameras (48MP+)")
            
            ois_phones = [p for p in phones if p.get("primary_camera_ois") == "Yes"]
            if ois_phones:
                insights.append(f"{len(ois_phones)} phone(s) have optical image stabilization")
        
        elif target == "battery":
            # Battery-specific insights
            large_battery_phones = [p for p in phones if p.get("battery_capacity_numeric", 0) >= 4500]
            if large_battery_phones:
                insights.append(f"{len(large_battery_phones)} phone(s) have large batteries (4500mAh+)")
            
            fast_charging_phones = [p for p in phones if p.get("has_fast_charging")]
            if fast_charging_phones:
                insights.append(f"{len(fast_charging_phones)} phone(s) support fast charging")
        
        elif target == "performance":
            # Performance-specific insights
            high_ram_phones = [p for p in phones if p.get("ram_gb", 0) >= 8]
            if high_ram_phones:
                insights.append(f"{len(high_ram_phones)} phone(s) have 8GB+ RAM")
            
            large_storage_phones = [p for p in phones if p.get("storage_gb", 0) >= 128]
            if large_storage_phones:
                insights.append(f"{len(large_storage_phones)} phone(s) have 128GB+ storage")
        
        # General insights
        if not insights:
            insights.append(f"Analysis completed for {len(phones)} phone(s)")
        
        return insights