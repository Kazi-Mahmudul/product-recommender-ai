"""
Response Validator Service - Validates and sanitizes API responses.

This service ensures all API responses are properly formatted and contain
valid data before being sent to the frontend.
"""

import logging
from typing import Dict, Any, List, Optional, Union
import re

logger = logging.getLogger(__name__)


class ResponseValidator:
    """
    Service for validating and sanitizing API responses.
    """
    
    @staticmethod
    def validate_chat_response(response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and sanitize chat response.
        
        Args:
            response: Raw chat response
            
        Returns:
            Validated chat response
        """
        if not isinstance(response, dict):
            logger.error("Chat response is not a dictionary")
            return ResponseValidator._create_fallback_response("Invalid response format")
        
        validated_response = {}
        
        # Validate response_type
        response_type = response.get("response_type", "text")
        valid_types = ["text", "recommendations", "comparison", "specs"]
        if response_type not in valid_types:
            logger.warning(f"Invalid response type: {response_type}, defaulting to 'text'")
            response_type = "text"
        validated_response["response_type"] = response_type
        
        # Validate content
        content = response.get("content", {})
        if not isinstance(content, dict):
            logger.warning("Content is not a dictionary, creating default")
            content = {"text": "Response content unavailable", "error": True}
        
        validated_response["content"] = ResponseValidator._validate_content(content, response_type)
        
        # Validate suggestions
        suggestions = response.get("suggestions", [])
        if not isinstance(suggestions, list):
            suggestions = []
        validated_response["suggestions"] = ResponseValidator._validate_suggestions(suggestions)
        
        # Validate metadata
        metadata = response.get("metadata", {})
        if not isinstance(metadata, dict):
            metadata = {}
        validated_response["metadata"] = ResponseValidator._validate_metadata(metadata)
        
        # Add optional fields
        if "session_id" in response:
            validated_response["session_id"] = str(response["session_id"])
        
        if "processing_time" in response:
            processing_time = response["processing_time"]
            if isinstance(processing_time, (int, float)) and processing_time >= 0:
                validated_response["processing_time"] = float(processing_time)
        
        return validated_response
    
    @staticmethod
    def _validate_content(content: Dict[str, Any], response_type: str) -> Dict[str, Any]:
        """Validate content based on response type."""
        validated_content = {}
        
        # All response types should have text
        text = content.get("text", "")
        if not isinstance(text, str):
            text = str(text) if text is not None else ""
        validated_content["text"] = ResponseValidator._sanitize_text(text)
        
        # Validate error flag
        if "error" in content:
            validated_content["error"] = bool(content["error"])
        
        # Type-specific validation
        if response_type == "recommendations":
            phones = content.get("phones", [])
            if isinstance(phones, list):
                validated_content["phones"] = ResponseValidator._validate_phone_list(phones)
            
            filters = content.get("filters_applied", {})
            if isinstance(filters, dict):
                validated_content["filters_applied"] = filters
            
            if "total_found" in content:
                total_found = content["total_found"]
                if isinstance(total_found, int) and total_found >= 0:
                    validated_content["total_found"] = total_found
        
        elif response_type == "comparison":
            phones = content.get("phones", [])
            if isinstance(phones, list):
                validated_content["phones"] = ResponseValidator._validate_comparison_phones(phones)
            
            features = content.get("features", [])
            if isinstance(features, list):
                validated_content["features"] = ResponseValidator._validate_comparison_features(features)
            
            summary = content.get("summary", "")
            if isinstance(summary, str):
                validated_content["summary"] = ResponseValidator._sanitize_text(summary)
        
        elif response_type == "specs":
            phone = content.get("phone", {})
            if isinstance(phone, dict):
                validated_content["phone"] = ResponseValidator._validate_phone_basic_info(phone)
            
            specifications = content.get("specifications", {})
            if isinstance(specifications, dict):
                validated_content["specifications"] = specifications
            
            if "phone_url" in content:
                phone_url = content["phone_url"]
                if isinstance(phone_url, str):
                    validated_content["phone_url"] = ResponseValidator._sanitize_url(phone_url)
        
        # Handle related phones for text responses
        if "related_phones" in content:
            related_phones = content["related_phones"]
            if isinstance(related_phones, list):
                validated_content["related_phones"] = ResponseValidator._validate_phone_list(related_phones)
        
        return validated_content
    
    @staticmethod
    def _validate_phone_list(phones: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate list of phone objects."""
        validated_phones = []
        
        for i, phone in enumerate(phones):
            if not isinstance(phone, dict):
                logger.warning(f"Skipping invalid phone at index {i}")
                continue
            
            validated_phone = {}
            
            # Required fields
            validated_phone["name"] = ResponseValidator._sanitize_text(phone.get("name", "Unknown Phone"))
            validated_phone["brand"] = ResponseValidator._sanitize_text(phone.get("brand", "Unknown"))
            
            # Optional fields
            if "id" in phone:
                phone_id = phone["id"]
                if isinstance(phone_id, (int, str)):
                    validated_phone["id"] = str(phone_id)
            
            if "slug" in phone:
                slug = phone["slug"]
                if isinstance(slug, str):
                    validated_phone["slug"] = ResponseValidator._sanitize_slug(slug)
            
            if "price" in phone:
                price = phone["price"]
                if isinstance(price, (int, float)) and price >= 0:
                    validated_phone["price"] = float(price)
            
            if "image" in phone:
                image = phone["image"]
                if isinstance(image, str):
                    validated_phone["image"] = ResponseValidator._sanitize_url(image)
            
            if "key_specs" in phone:
                key_specs = phone["key_specs"]
                if isinstance(key_specs, dict):
                    validated_phone["key_specs"] = ResponseValidator._validate_key_specs(key_specs)
            
            if "scores" in phone:
                scores = phone["scores"]
                if isinstance(scores, dict):
                    validated_phone["scores"] = ResponseValidator._validate_scores(scores)
            
            if "relevance_score" in phone:
                relevance = phone["relevance_score"]
                if isinstance(relevance, (int, float)) and 0 <= relevance <= 1:
                    validated_phone["relevance_score"] = float(relevance)
            
            if "match_reasons" in phone:
                reasons = phone["match_reasons"]
                if isinstance(reasons, list):
                    validated_phone["match_reasons"] = [
                        ResponseValidator._sanitize_text(str(reason)) 
                        for reason in reasons[:5]  # Limit to 5 reasons
                        if reason
                    ]
            
            if "url" in phone:
                url = phone["url"]
                if isinstance(url, str):
                    validated_phone["url"] = ResponseValidator._sanitize_url(url)
            
            validated_phones.append(validated_phone)
        
        return validated_phones
    
    @staticmethod
    def _validate_comparison_phones(phones: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate phones for comparison response."""
        validated_phones = []
        
        for phone in phones:
            if not isinstance(phone, dict):
                continue
            
            validated_phone = {
                "name": ResponseValidator._sanitize_text(phone.get("name", "Unknown")),
                "brand": ResponseValidator._sanitize_text(phone.get("brand", "Unknown"))
            }
            
            if "id" in phone:
                validated_phone["id"] = str(phone["id"])
            
            if "image" in phone:
                image = phone["image"]
                if isinstance(image, str):
                    validated_phone["image"] = ResponseValidator._sanitize_url(image)
            
            if "price" in phone:
                price = phone["price"]
                if isinstance(price, (int, float)) and price >= 0:
                    validated_phone["price"] = float(price)
            
            validated_phones.append(validated_phone)
        
        return validated_phones
    
    @staticmethod
    def _validate_comparison_features(features: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate features for comparison response."""
        validated_features = []
        
        for feature in features:
            if not isinstance(feature, dict):
                continue
            
            validated_feature = {}
            
            # Required fields
            if "key" in feature:
                validated_feature["key"] = ResponseValidator._sanitize_text(feature["key"])
            
            if "label" in feature:
                validated_feature["label"] = ResponseValidator._sanitize_text(feature["label"])
            
            # Optional fields
            if "values" in feature:
                values = feature["values"]
                if isinstance(values, list):
                    validated_feature["values"] = values
            
            if "unit" in feature:
                unit = feature["unit"]
                if isinstance(unit, str):
                    validated_feature["unit"] = ResponseValidator._sanitize_text(unit)
            
            validated_features.append(validated_feature)
        
        return validated_features
    
    @staticmethod
    def _validate_phone_basic_info(phone: Dict[str, Any]) -> Dict[str, Any]:
        """Validate basic phone information."""
        validated_phone = {}
        
        # Basic fields
        validated_phone["name"] = ResponseValidator._sanitize_text(phone.get("name", "Unknown Phone"))
        validated_phone["brand"] = ResponseValidator._sanitize_text(phone.get("brand", "Unknown"))
        
        if "id" in phone:
            validated_phone["id"] = str(phone["id"])
        
        if "price" in phone:
            price = phone["price"]
            if isinstance(price, (int, float)) and price >= 0:
                validated_phone["price"] = float(price)
        
        if "image" in phone:
            image = phone["image"]
            if isinstance(image, str):
                validated_phone["image"] = ResponseValidator._sanitize_url(image)
        
        return validated_phone
    
    @staticmethod
    def _validate_key_specs(specs: Dict[str, Any]) -> Dict[str, Any]:
        """Validate key specifications."""
        validated_specs = {}
        
        spec_fields = ["ram", "storage", "camera", "battery", "display", "chipset"]
        
        for field in spec_fields:
            if field in specs:
                value = specs[field]
                if isinstance(value, str):
                    validated_specs[field] = ResponseValidator._sanitize_text(value)
        
        return validated_specs
    
    @staticmethod
    def _validate_scores(scores: Dict[str, Any]) -> Dict[str, Any]:
        """Validate phone scores."""
        validated_scores = {}
        
        score_fields = ["overall", "camera", "battery", "performance", "display"]
        
        for field in score_fields:
            if field in scores:
                score = scores[field]
                if isinstance(score, (int, float)) and 0 <= score <= 10:
                    validated_scores[field] = float(score)
        
        return validated_scores
    
    @staticmethod
    def _validate_suggestions(suggestions: List[str]) -> List[str]:
        """Validate and sanitize suggestions."""
        validated_suggestions = []
        
        for suggestion in suggestions[:10]:  # Limit to 10 suggestions
            if isinstance(suggestion, str) and suggestion.strip():
                sanitized = ResponseValidator._sanitize_text(suggestion)
                if sanitized:
                    validated_suggestions.append(sanitized)
        
        return validated_suggestions
    
    @staticmethod
    def _validate_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Validate metadata."""
        validated_metadata = {}
        
        # Copy safe metadata fields
        safe_fields = [
            "request_id", "gemini_response_type", "data_sources", 
            "confidence_score", "phone_count", "error_type"
        ]
        
        for field in safe_fields:
            if field in metadata:
                value = metadata[field]
                if field == "confidence_score":
                    if isinstance(value, (int, float)) and 0 <= value <= 1:
                        validated_metadata[field] = float(value)
                elif field == "phone_count":
                    if isinstance(value, int) and value >= 0:
                        validated_metadata[field] = value
                elif field == "data_sources":
                    if isinstance(value, list):
                        validated_metadata[field] = [str(source) for source in value]
                else:
                    validated_metadata[field] = str(value)
        
        return validated_metadata
    
    @staticmethod
    def _sanitize_text(text: str) -> str:
        """Sanitize text content."""
        if not isinstance(text, str):
            text = str(text) if text is not None else ""
        
        # Remove control characters and excessive whitespace
        text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        # Limit length
        if len(text) > 5000:
            text = text[:4997] + "..."
        
        return text
    
    @staticmethod
    def _sanitize_url(url: str) -> str:
        """Sanitize URL."""
        if not isinstance(url, str):
            return ""
        
        # Basic URL validation
        url = url.strip()
        if not url:
            return ""
        
        # Allow relative URLs and common protocols
        if url.startswith(('http://', 'https://', '/', 'data:')):
            return url[:500]  # Limit URL length
        
        # If it doesn't start with a protocol, assume it's relative
        if not url.startswith(('javascript:', 'data:', 'mailto:')):
            return url[:500]
        
        return ""
    
    @staticmethod
    def _sanitize_slug(slug: str) -> str:
        """Sanitize URL slug."""
        if not isinstance(slug, str):
            return ""
        
        # Keep only alphanumeric characters, hyphens, and underscores
        slug = re.sub(r'[^a-zA-Z0-9\-_]', '', slug)
        return slug[:100]  # Limit length
    
    @staticmethod
    def _create_fallback_response(error_message: str) -> Dict[str, Any]:
        """Create a fallback response for invalid responses."""
        return {
            "response_type": "text",
            "content": {
                "text": f"I encountered an issue while formatting the response. {error_message}",
                "error": True
            },
            "suggestions": [
                "Try rephrasing your question",
                "Ask for phone recommendations",
                "Try a different type of query"
            ],
            "metadata": {
                "error_type": "response_validation_error"
            }
        }