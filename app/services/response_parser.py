"""
Dynamic Response Parser

This module provides intelligent parsing and formatting of AI service responses.
It can handle any response format and automatically determine the best presentation method.
"""

import re
import json
from typing import Dict, Any, List, Optional, Union
from enum import Enum
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

class ResponseType(str, Enum):
    """Enumeration of response types for dynamic handling"""
    TEXT = "text"
    RECOMMENDATIONS = "recommendations"
    COMPARISON = "comparison"
    MIXED = "mixed"
    STRUCTURED = "structured"
    ERROR = "error"

class TextStyle(str, Enum):
    """Text formatting styles"""
    CONVERSATIONAL = "conversational"
    STRUCTURED = "structured"
    LIST = "list"
    PARAGRAPH = "paragraph"
    ERROR = "error"
    HELPFUL_ERROR = "helpful_error"

class DisplayFormat(str, Enum):
    """Display format options"""
    CARDS = "cards"
    LIST = "list"
    COMPARISON_CHART = "comparison_chart"
    DETAILED_VIEW = "detailed_view"
    TEXT_BLOCK = "text_block"

class ActionableItem(BaseModel):
    """Represents an actionable item in a response"""
    type: str  # "suggestion", "link", "query", "action"
    text: str
    action: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class FormattingHints(BaseModel):
    """Hints for how to format and display the response"""
    text_style: Optional[TextStyle] = None
    display_as: Optional[DisplayFormat] = None
    show_suggestions: bool = False
    show_comparison: bool = False
    highlight_specs: bool = False
    show_summary: bool = False
    emphasis: Optional[List[str]] = None
    actionable_items: Optional[List[ActionableItem]] = None

class ParsedResponse(BaseModel):
    """Structured representation of a parsed response"""
    response_type: ResponseType
    content: Dict[str, Any]
    formatting_hints: FormattingHints
    metadata: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = None

class DynamicResponseParser:
    """
    Intelligent parser that can handle any AI service response format
    and determine the optimal presentation method.
    """
    
    def __init__(self):
        self.phone_keywords = [
            "phone", "smartphone", "mobile", "device", "handset",
            "iphone", "android", "samsung", "xiaomi", "oneplus", "oppo", "vivo"
        ]
        self.comparison_keywords = [
            "vs", "versus", "compare", "comparison", "difference", "better", "worse"
        ]
        self.recommendation_keywords = [
            "recommend", "suggest", "best", "good", "top", "choose", "pick"
        ]
    
    def parse_response(self, raw_response: Any) -> ParsedResponse:
        """
        Main parsing method that intelligently handles any response format.
        
        Args:
            raw_response: Raw response from AI service or any other source
            
        Returns:
            ParsedResponse: Structured, formatted response ready for display
        """
        try:
            # Detect the response type
            response_type = self.detect_response_type(raw_response)
            
            # Parse based on detected type
            if response_type == ResponseType.RECOMMENDATIONS:
                return self._parse_recommendations(raw_response)
            elif response_type == ResponseType.COMPARISON:
                return self._parse_comparison(raw_response)
            elif response_type == ResponseType.TEXT:
                return self._parse_text(raw_response)
            elif response_type == ResponseType.MIXED:
                return self._parse_mixed(raw_response)
            elif response_type == ResponseType.STRUCTURED:
                return self._parse_structured(raw_response)
            else:
                return self._parse_unknown(raw_response)
                
        except Exception as e:
            logger.error(f"Error parsing response: {str(e)}")
            return self._create_error_response(str(e), raw_response)
    
    def detect_response_type(self, response: Any) -> ResponseType:
        """
        Automatically detect the type of response for optimal formatting.
        
        Args:
            response: Raw response to analyze
            
        Returns:
            ResponseType: Detected response type
        """
        if isinstance(response, dict):
            # Check for explicit type field
            if "type" in response:
                response_type = response["type"].lower()
                if response_type == "recommendation":
                    return ResponseType.RECOMMENDATIONS
                elif response_type == "comparison":
                    return ResponseType.COMPARISON
                elif response_type in ["qa", "chat"]:
                    return ResponseType.TEXT
            
            # Check for phone data (recommendations)
            if "phones" in response or "recommendations" in response:
                return ResponseType.RECOMMENDATIONS
            
            # Check for comparison data
            if "features" in response and "summary" in response:
                return ResponseType.COMPARISON
            
            # Check for mixed content
            content_types = 0
            if any(key in response for key in ["text", "data", "content"]):
                content_types += 1
            if any(key in response for key in ["phones", "recommendations"]):
                content_types += 1
            if any(key in response for key in ["features", "comparison"]):
                content_types += 1
            
            if content_types > 1:
                return ResponseType.MIXED
            
            # Check for structured data
            if len(response) > 3 and not any(key in response for key in ["text", "data", "content"]):
                return ResponseType.STRUCTURED
        
        elif isinstance(response, list):
            # List of items could be recommendations
            if response and isinstance(response[0], dict):
                first_item = response[0]
                if any(key in first_item for key in ["name", "brand", "price", "phone"]):
                    return ResponseType.RECOMMENDATIONS
        
        elif isinstance(response, str):
            # Analyze text content
            text_lower = response.lower()
            
            # Check for comparison indicators
            if any(keyword in text_lower for keyword in self.comparison_keywords):
                return ResponseType.COMPARISON
            
            # Check for recommendation indicators
            if any(keyword in text_lower for keyword in self.recommendation_keywords):
                return ResponseType.RECOMMENDATIONS
        
        # Default to text
        return ResponseType.TEXT
    
    def _parse_recommendations(self, response: Any) -> ParsedResponse:
        """Parse recommendation responses"""
        content = {}
        phones = []
        text = ""
        
        if isinstance(response, dict):
            phones = response.get("phones", response.get("recommendations", []))
            text = response.get("text", response.get("reasoning", "Here are some great phone recommendations:"))
            
            # Extract additional data
            content = {
                "text": text,
                "phones": self._format_phone_list(phones),
                "filters_applied": response.get("filters", {}),
                "count": len(phones)
            }
        elif isinstance(response, list):
            phones = response
            content = {
                "text": "Here are some phone recommendations based on your query:",
                "phones": self._format_phone_list(phones),
                "count": len(phones)
            }
        
        # Create formatting hints
        formatting_hints = FormattingHints(
            display_as=DisplayFormat.CARDS,
            show_comparison=len(phones) > 1,
            highlight_specs=True,
            actionable_items=self._extract_phone_actions(phones)
        )
        
        return ParsedResponse(
            response_type=ResponseType.RECOMMENDATIONS,
            content=content,
            formatting_hints=formatting_hints,
            metadata={"phone_count": len(phones)}
        )
    
    def _parse_comparison(self, response: Any) -> ParsedResponse:
        """Parse comparison responses"""
        if isinstance(response, dict):
            content = {
                "phones": response.get("phones", []),
                "features": response.get("features", []),
                "summary": response.get("summary", "Comparison completed."),
                "focus_area": response.get("focus_area")
            }
        else:
            content = {"text": str(response)}
        
        formatting_hints = FormattingHints(
            display_as=DisplayFormat.COMPARISON_CHART,
            show_summary=True,
            actionable_items=self._extract_comparison_actions(content)
        )
        
        return ParsedResponse(
            response_type=ResponseType.COMPARISON,
            content=content,
            formatting_hints=formatting_hints
        )
    
    def _parse_text(self, response: Any) -> ParsedResponse:
        """Parse text responses with intelligent formatting"""
        if isinstance(response, dict):
            text = response.get("data", response.get("content", response.get("text", str(response))))
            suggestions = response.get("suggestions", [])
        else:
            text = str(response)
            suggestions = []
        
        # Analyze text for formatting hints
        text_style = self._determine_text_style(text)
        actionable_items = self._extract_text_actions(text, suggestions)
        emphasis = self._extract_emphasis(text)
        
        content = {
            "text": self._format_text_content(text),
            "suggestions": suggestions
        }
        
        formatting_hints = FormattingHints(
            text_style=text_style,
            display_as=DisplayFormat.TEXT_BLOCK,
            show_suggestions=len(suggestions) > 0,
            emphasis=emphasis,
            actionable_items=actionable_items
        )
        
        return ParsedResponse(
            response_type=ResponseType.TEXT,
            content=content,
            formatting_hints=formatting_hints
        )
    
    def _parse_mixed(self, response: Any) -> ParsedResponse:
        """Parse responses with mixed content types"""
        content = {}
        
        if isinstance(response, dict):
            # Extract different content types
            if "text" in response or "data" in response:
                content["text"] = response.get("text", response.get("data", ""))
            
            if "phones" in response:
                content["phones"] = self._format_phone_list(response["phones"])
            
            if "features" in response:
                content["comparison"] = {
                    "phones": response.get("phones", []),
                    "features": response.get("features", []),
                    "summary": response.get("summary", "")
                }
            
            content["suggestions"] = response.get("suggestions", [])
        
        formatting_hints = FormattingHints(
            display_as=DisplayFormat.DETAILED_VIEW,
            show_suggestions=len(content.get("suggestions", [])) > 0,
            show_comparison="comparison" in content,
            highlight_specs="phones" in content
        )
        
        return ParsedResponse(
            response_type=ResponseType.MIXED,
            content=content,
            formatting_hints=formatting_hints
        )
    
    def _parse_structured(self, response: Any) -> ParsedResponse:
        """Parse structured data responses"""
        content = {"data": response}
        
        formatting_hints = FormattingHints(
            display_as=DisplayFormat.DETAILED_VIEW,
            text_style=TextStyle.STRUCTURED
        )
        
        return ParsedResponse(
            response_type=ResponseType.STRUCTURED,
            content=content,
            formatting_hints=formatting_hints
        )
    
    def _parse_unknown(self, response: Any) -> ParsedResponse:
        """Handle unknown response formats"""
        content = {
            "text": f"I received a response but I'm not sure how to display it properly. Here's what I got: {str(response)[:500]}",
            "raw_data": response
        }
        
        formatting_hints = FormattingHints(
            text_style=TextStyle.ERROR,
            display_as=DisplayFormat.TEXT_BLOCK
        )
        
        return ParsedResponse(
            response_type=ResponseType.ERROR,
            content=content,
            formatting_hints=formatting_hints
        )
    
    def _create_error_response(self, error_message: str, original_response: Any) -> ParsedResponse:
        """Create an error response"""
        content = {
            "text": f"I encountered an error while processing the response: {error_message}",
            "suggestions": [
                "Try rephrasing your question",
                "Ask for phone recommendations",
                "Compare specific phone models"
            ]
        }
        
        formatting_hints = FormattingHints(
            text_style=TextStyle.HELPFUL_ERROR,
            display_as=DisplayFormat.TEXT_BLOCK,
            show_suggestions=True
        )
        
        return ParsedResponse(
            response_type=ResponseType.ERROR,
            content=content,
            formatting_hints=formatting_hints,
            metadata={"original_response": str(original_response)[:200]}
        )
    
    def _format_phone_list(self, phones: List[Any]) -> List[Dict[str, Any]]:
        """Format a list of phones for consistent display"""
        formatted_phones = []
        
        for phone in phones:
            if isinstance(phone, dict):
                # Create the formatted phone with all database fields directly accessible
                formatted_phone = {
                    "id": phone.get("id"),
                    "name": phone.get("name", "Unknown Phone"),
                    "brand": phone.get("brand", "Unknown"),
                    "model": phone.get("model"),
                    "slug": phone.get("slug"),
                    "price": phone.get("price"),  # Keep original price field
                    "price_original": phone.get("price_original", phone.get("price")),  # Use for filtering
                    "url": phone.get("url"),
                    "img_url": phone.get("img_url", phone.get("image")),
                    
                    # Display fields
                    "display_type": phone.get("display_type"),
                    "screen_size_inches": phone.get("screen_size_inches"),
                    "display_resolution": phone.get("display_resolution"),
                    "pixel_density_ppi": phone.get("pixel_density_ppi"),
                    "refresh_rate_hz": phone.get("refresh_rate_hz"),
                    "screen_protection": phone.get("screen_protection"),
                    "display_brightness": phone.get("display_brightness"),
                    "aspect_ratio": phone.get("aspect_ratio"),
                    "hdr_support": phone.get("hdr_support"),
                    
                    # Performance fields
                    "chipset": phone.get("chipset"),
                    "cpu": phone.get("cpu"),
                    "gpu": phone.get("gpu"),
                    "ram": phone.get("ram"),
                    "ram_type": phone.get("ram_type"),
                    "internal_storage": phone.get("internal_storage"),
                    "storage_type": phone.get("storage_type"),
                    
                    # Camera fields
                    "camera_setup": phone.get("camera_setup"),
                    "primary_camera_resolution": phone.get("primary_camera_resolution"),
                    "selfie_camera_resolution": phone.get("selfie_camera_resolution"),
                    "main_camera": phone.get("main_camera"),
                    "front_camera": phone.get("front_camera"),
                    "camera_features": phone.get("camera_features"),
                    
                    # Battery fields
                    "battery_type": phone.get("battery_type"),
                    "capacity": phone.get("capacity"),
                    "quick_charging": phone.get("quick_charging"),
                    "wireless_charging": phone.get("wireless_charging"),
                    "reverse_charging": phone.get("reverse_charging"),
                    
                    # Design fields
                    "build": phone.get("build"),
                    "weight": phone.get("weight"),
                    "thickness": phone.get("thickness"),
                    "colors": phone.get("colors"),
                    "waterproof": phone.get("waterproof"),
                    "ip_rating": phone.get("ip_rating"),
                    
                    # Connectivity fields
                    "network": phone.get("network"),
                    "bluetooth": phone.get("bluetooth"),
                    "wlan": phone.get("wlan"),
                    "gps": phone.get("gps"),
                    "nfc": phone.get("nfc"),
                    "usb": phone.get("usb"),
                    "fingerprint_sensor": phone.get("fingerprint_sensor"),
                    "face_unlock": phone.get("face_unlock"),
                    
                    # Operating system
                    "operating_system": phone.get("operating_system"),
                    "os_version": phone.get("os_version"),
                    "release_date": phone.get("release_date"),
                    
                    # Derived/numeric fields
                    "storage_gb": phone.get("storage_gb"),
                    "ram_gb": phone.get("ram_gb"),
                    "screen_size_numeric": phone.get("screen_size_numeric"),
                    "primary_camera_mp": phone.get("primary_camera_mp"),
                    "selfie_camera_mp": phone.get("selfie_camera_mp"),
                    "battery_capacity_numeric": phone.get("battery_capacity_numeric"),
                    "has_fast_charging": phone.get("has_fast_charging"),
                    "has_wireless_charging": phone.get("has_wireless_charging"),
                    "charging_wattage": phone.get("charging_wattage"),
                    
                    # Scores
                    "overall_device_score": phone.get("overall_device_score"),
                    "performance_score": phone.get("performance_score"),
                    "display_score": phone.get("display_score"),
                    "camera_score": phone.get("camera_score"),
                    "battery_score": phone.get("battery_score"),
                    "security_score": phone.get("security_score"),
                    "connectivity_score": phone.get("connectivity_score"),
                    
                    # Scores object for backward compatibility (if needed)
                    "scores": phone.get("scores", {
                        "overall": phone.get("overall_device_score", 0),
                        "camera": phone.get("camera_score", 0),
                        "battery": phone.get("battery_score", 0),
                        "performance": phone.get("performance_score", 0),
                        "display": phone.get("display_score", 0)
                    })
                }
                
                formatted_phones.append(formatted_phone)
        
        return formatted_phones
    
    def _determine_text_style(self, text: str) -> TextStyle:
        """Determine the appropriate text style based on content"""
        text_lower = text.lower()
        
        if "error" in text_lower or "sorry" in text_lower:
            if "try" in text_lower or "can" in text_lower:
                return TextStyle.HELPFUL_ERROR
            return TextStyle.ERROR
        
        # Check for list indicators
        if re.search(r'^\s*[-•*]\s', text, re.MULTILINE) or re.search(r'^\s*\d+\.\s', text, re.MULTILINE):
            return TextStyle.LIST
        
        # Check for structured content
        if len(text.split('\n')) > 3 and ':' in text:
            return TextStyle.STRUCTURED
        
        # Default to conversational
        return TextStyle.CONVERSATIONAL
    
    def _format_text_content(self, text: str) -> str:
        """Format text content for better readability"""
        # Clean up extra whitespace
        text = re.sub(r'\n\s*\n', '\n\n', text)
        text = re.sub(r' +', ' ', text)
        
        # Ensure proper paragraph breaks
        sentences = text.split('. ')
        if len(sentences) > 3:
            # Add paragraph breaks for longer text
            formatted_sentences = []
            for i, sentence in enumerate(sentences):
                formatted_sentences.append(sentence)
                if i > 0 and (i + 1) % 3 == 0 and i < len(sentences) - 1:
                    formatted_sentences.append('\n\n')
            text = '. '.join(formatted_sentences)
        
        return text.strip()
    
    def _extract_emphasis(self, text: str) -> List[str]:
        """Extract words or phrases that should be emphasized"""
        emphasis = []
        
        # Phone names and brands
        phone_pattern = r'\b(?:iPhone|Samsung|Xiaomi|OnePlus|Oppo|Vivo|Huawei|Google Pixel)\s+[A-Za-z0-9\s]+\b'
        emphasis.extend(re.findall(phone_pattern, text, re.IGNORECASE))
        
        # Technical specs
        spec_pattern = r'\b\d+(?:GB|MP|mAh|Hz|inch)\b'
        emphasis.extend(re.findall(spec_pattern, text, re.IGNORECASE))
        
        # Price mentions
        price_pattern = r'৳[\d,]+'
        emphasis.extend(re.findall(price_pattern, text))
        
        return list(set(emphasis))
    
    def _extract_text_actions(self, text: str, suggestions: List[str]) -> List[ActionableItem]:
        """Extract actionable items from text content"""
        actions = []
        
        # Add suggestions as actionable items
        for suggestion in suggestions:
            actions.append(ActionableItem(
                type="suggestion",
                text=suggestion,
                action="query",
                data={"query": suggestion}
            ))
        
        # Extract phone names as actionable items
        phone_pattern = r'\b(?:iPhone|Samsung|Xiaomi|OnePlus|Oppo|Vivo|Huawei|Google Pixel)\s+[A-Za-z0-9\s]+\b'
        phone_matches = re.findall(phone_pattern, text, re.IGNORECASE)
        for phone in phone_matches[:3]:  # Limit to 3 phones
            actions.append(ActionableItem(
                type="phone_info",
                text=f"Learn more about {phone}",
                action="phone_details",
                data={"phone_name": phone}
            ))
        
        return actions
    
    def _extract_phone_actions(self, phones: List[Any]) -> List[ActionableItem]:
        """Extract actionable items from phone recommendations"""
        actions = []
        
        if len(phones) > 1:
            actions.append(ActionableItem(
                type="action",
                text="Compare these phones",
                action="compare",
                data={"phone_names": [p.get("name") for p in phones if p.get("name")]}
            ))
        
        return actions
    
    def _extract_comparison_actions(self, content: Dict[str, Any]) -> List[ActionableItem]:
        """Extract actionable items from comparison content"""
        actions = []
        
        phones = content.get("phones", [])
        if phones:
            actions.append(ActionableItem(
                type="action",
                text="View detailed specifications",
                action="detailed_specs",
                data={"phone_names": [p.get("name") for p in phones]}
            ))
        
        return actions

# Global instance for use throughout the application
response_parser = DynamicResponseParser()