"""
Response Formatter Service - Formats combined GEMINI + database results for frontend.

This service formats the enhanced responses into structured formats optimized
for frontend consumption and display.
"""

from typing import List, Dict, Any, Optional
import logging
from app.services.data_validator import DataValidator
from app.services.response_validator import ResponseValidator

logger = logging.getLogger(__name__)


class ResponseFormatterService:
    """
    Service for formatting RAG responses for frontend consumption.
    """
    
    def __init__(self):
        self.max_suggestions = 5
    
    def _safe_numeric_value(self, value: Any, min_val: float = None, max_val: float = None) -> float:
        """
        Safely convert and validate numeric values.
        
        Args:
            value: Value to convert
            min_val: Minimum allowed value
            max_val: Maximum allowed value
            
        Returns:
            Safe numeric value or 0 if invalid
        """
        try:
            if value is None:
                return 0.0
            
            numeric_val = float(value)
            
            # Check for NaN or infinity
            if not isinstance(numeric_val, (int, float)) or numeric_val != numeric_val:  # NaN check
                return 0.0
            
            # Apply bounds if specified
            if min_val is not None:
                numeric_val = max(numeric_val, min_val)
            if max_val is not None:
                numeric_val = min(numeric_val, max_val)
            
            return numeric_val
            
        except (ValueError, TypeError, OverflowError):
            return 0.0
        
    async def format_recommendations(
        self,
        phones: List[Dict[str, Any]],
        reasoning: str,
        filters: Dict[str, Any],
        original_query: str
    ) -> Dict[str, Any]:
        """
        Format phone recommendation responses with enhanced error handling.
        
        Args:
            phones: List of recommended phones
            reasoning: GEMINI's reasoning for recommendations
            filters: Applied filters
            original_query: Original user query
            
        Returns:
            Formatted recommendation response
        """
        try:
            # Validate inputs
            if not isinstance(phones, list):
                logger.warning("Invalid phones data type, expected list")
                phones = []
            
            if not phones:
                return {
                    "response_type": "text",
                    "content": {
                        "text": "I couldn't find any phones matching your specific requirements. Let me suggest some popular options instead.",
                        "error": False
                    },
                    "suggestions": [
                        "Try adjusting your budget range",
                        "Ask for phones with specific features",
                        "Browse popular phones in different categories"
                    ]
                }
            
            # Format phones for display with validation
            formatted_phones = []
            for i, phone in enumerate(phones):
                try:
                    if not isinstance(phone, dict):
                        logger.warning(f"Skipping invalid phone data at index {i}")
                        continue
                    
                    # Validate and sanitize phone data
                    validated_phone = DataValidator.validate_phone_data(phone)
                    
                    # Check if phone has required data after validation
                    if not validated_phone.get("id") or not validated_phone.get("name"):
                        logger.warning(f"Skipping phone with missing required fields after validation: {validated_phone}")
                        continue
                    
                    formatted_phone = {
                        "slug": validated_phone.get("slug", f"{validated_phone.get('brand', 'unknown')}-{validated_phone.get('name', 'phone')}".lower().replace(' ', '-')),
                        "name": validated_phone.get("name", "Unknown Phone"),
                        "brand": validated_phone.get("brand", "Unknown"),
                        "price": validated_phone.get("price_original", 0),
                        "image": validated_phone.get("img_url", ""),
                        "key_specs": validated_phone.get("key_features", {}),
                        "scores": {
                            "overall": validated_phone.get("overall_device_score", 0),
                            "camera": validated_phone.get("camera_score", 0),
                            "battery": validated_phone.get("battery_score", 0),
                            "performance": validated_phone.get("performance_score", 0),
                            "display": validated_phone.get("display_score", 0)
                        },
                        "relevance_score": self._safe_numeric_value(validated_phone.get("relevance_score"), 0, 1),
                        "match_reasons": validated_phone.get("match_reasons", [])[:3],  # Limit to 3 reasons
                        "url": f"/phones/{validated_phone.get('slug', validated_phone.get('id'))}"  # Link to detailed view using slug
                    }
                    formatted_phones.append(formatted_phone)
                    
                except Exception as phone_error:
                    logger.warning(f"Error formatting phone at index {i}: {str(phone_error)}")
                    continue
            
            if not formatted_phones:
                return self._create_error_response("No valid phone data could be processed")
            
            # Generate contextual text response
            try:
                response_text = self._generate_recommendation_text(
                    phones=formatted_phones,
                    reasoning=reasoning or "",
                    filters=filters or {},
                    original_query=original_query or ""
                )
            except Exception as text_error:
                logger.warning(f"Error generating recommendation text: {str(text_error)}")
                response_text = f"I found {len(formatted_phones)} phone recommendations for you."
            
            # Generate follow-up suggestions
            try:
                suggestions = self._generate_recommendation_suggestions(filters or {}, original_query or "")
            except Exception as suggestion_error:
                logger.warning(f"Error generating suggestions: {str(suggestion_error)}")
                suggestions = ["Show me more phones", "Compare these phones", "Find phones in different price range"]
            
            response = {
                "response_type": "recommendations",
                "content": {
                    "text": response_text,
                    "phones": formatted_phones,
                    "filters_applied": filters or {},
                    "total_found": len(formatted_phones)
                },
                "suggestions": suggestions,
                "metadata": {
                    "data_sources": ["phone_database"],
                    "confidence_score": 0.9 if len(formatted_phones) >= 3 else 0.7
                }
            }
            
            # Validate response before returning
            return ResponseValidator.validate_chat_response(response)
            
        except Exception as e:
            logger.error(f"Critical error formatting recommendations: {str(e)}", exc_info=True)
            return self._create_error_response("Failed to format phone recommendations")
    
    async def format_comparison(
        self,
        comparison_data: Dict[str, Any],
        reasoning: str,
        original_query: str
    ) -> Dict[str, Any]:
        """
        Format phone comparison responses.
        
        Args:
            comparison_data: Comparison data from knowledge retrieval
            reasoning: GEMINI's reasoning
            original_query: Original user query
            
        Returns:
            Formatted comparison response
        """
        try:
            if comparison_data.get("error"):
                return {
                    "response_type": "text",
                    "content": {
                        "text": comparison_data["error"],
                        "error": True
                    },
                    "suggestions": [
                        "Try comparing specific phone models",
                        "Ask for phone recommendations instead",
                        "Check phone specifications individually"
                    ]
                }
            
            phones = comparison_data.get("phones", [])
            features = comparison_data.get("features", [])
            
            if not phones or len(phones) < 2:
                return {
                    "response_type": "text",
                    "content": {
                        "text": "I need at least 2 phones to make a comparison. Please specify the phone models you'd like to compare.",
                        "error": False
                    },
                    "suggestions": [
                        "Compare iPhone 15 vs Samsung Galaxy S24",
                        "Ask for phone recommendations",
                        "Check individual phone specifications"
                    ]
                }
            
            # Generate comparison text
            comparison_text = self._generate_comparison_text(
                phones=phones,
                features=features,
                summary=comparison_data.get("summary", ""),
                reasoning=reasoning
            )
            
            # Generate suggestions
            suggestions = self._generate_comparison_suggestions(phones)
            
            response = {
                "response_type": "comparison",
                "content": {
                    "text": comparison_text,
                    "phones": phones,
                    "features": features,
                    "summary": comparison_data.get("summary", ""),
                    "comparison_url": "/compare"  # Link to detailed comparison page
                },
                "suggestions": suggestions,
                "metadata": {
                    "data_sources": ["phone_database"],
                    "confidence_score": 0.95,
                    "phone_count": len(phones)
                }
            }
            
            # Validate response before returning
            return ResponseValidator.validate_chat_response(response)
            
        except Exception as e:
            logger.error(f"Error formatting comparison: {str(e)}")
            return self._create_error_response("Failed to format phone comparison")
    
    async def format_specifications(
        self,
        phone_specs: Dict[str, Any],
        reasoning: str,
        original_query: str
    ) -> Dict[str, Any]:
        """
        Format detailed phone specification responses.
        
        Args:
            phone_specs: Phone specifications data
            reasoning: GEMINI's reasoning
            original_query: Original user query
            
        Returns:
            Formatted specifications response
        """
        try:
            if not phone_specs:
                return {
                    "response_type": "text",
                    "content": {
                        "text": "I couldn't find specifications for that phone. Please check the phone name and try again.",
                        "error": True
                    },
                    "suggestions": [
                        "Try searching for a different phone model",
                        "Ask for phone recommendations",
                        "Browse popular phones"
                    ]
                }
            
            # Generate specifications text
            specs_text = self._generate_specifications_text(phone_specs, reasoning)
            
            # Format specifications for structured display
            formatted_specs = self._format_specs_structure(phone_specs)
            
            # Generate suggestions
            suggestions = self._generate_specs_suggestions(phone_specs)
            
            response = {
                "response_type": "specs",
                "content": {
                    "text": specs_text,
                    "phone": phone_specs.get("basic_info", {}),
                    "specifications": formatted_specs,
                    "phone_url": f"/phones/{phone_specs.get('basic_info', {}).get('id')}"
                },
                "suggestions": suggestions,
                "metadata": {
                    "data_sources": ["phone_database"],
                    "confidence_score": phone_specs.get("relevance_score", 0.9)
                }
            }
            
            # Validate response before returning
            return ResponseValidator.validate_chat_response(response)
            
        except Exception as e:
            logger.error(f"Error formatting specifications: {str(e)}")
            return self._create_error_response("Failed to format phone specifications")
    
    async def format_conversational(
        self,
        text: str,
        related_phones: Optional[List[Dict[str, Any]]],
        reasoning: str,
        original_query: str
    ) -> Dict[str, Any]:
        """
        Format general conversational responses.
        
        Args:
            text: Response text
            related_phones: Optional related phones
            reasoning: GEMINI's reasoning
            original_query: Original user query
            
        Returns:
            Formatted conversational response
        """
        try:
            # Enhance text with related phones if available
            enhanced_text = text
            if related_phones:
                phone_names = [p.get("name", "") for p in related_phones[:3]]
                if phone_names:
                    enhanced_text += f"\n\nYou might also be interested in: {', '.join(phone_names)}"
            
            # Generate contextual suggestions
            suggestions = self._generate_conversational_suggestions(original_query, related_phones)
            
            content = {
                "text": enhanced_text,
                "related_phones": related_phones[:3] if related_phones else None
            }
            
            response = {
                "response_type": "text",
                "content": content,
                "suggestions": suggestions,
                "metadata": {
                    "data_sources": ["gemini_ai", "phone_database"] if related_phones else ["gemini_ai"],
                    "confidence_score": 0.8
                }
            }
            
            # Validate response before returning
            return ResponseValidator.validate_chat_response(response)
            
        except Exception as e:
            logger.error(f"Error formatting conversational response: {str(e)}")
            return self._create_error_response("Failed to format response")
    
    def _generate_recommendation_text(
        self,
        phones: List[Dict[str, Any]],
        reasoning: str,
        filters: Dict[str, Any],
        original_query: str
    ) -> str:
        """Generate contextual text for recommendations."""
        if not phones:
            return "I couldn't find any phones matching your requirements."
        
        phone_count = len(phones)
        top_phone = phones[0]
        
        text_parts = []
        
        # Add reasoning if provided
        if reasoning and reasoning.strip():
            text_parts.append(reasoning.strip())
        
        # Add recommendation summary
        if phone_count == 1:
            text_parts.append(f"I found the perfect phone for you: the {top_phone['name']}.")
        else:
            text_parts.append(f"I found {phone_count} great phones that match your needs. The {top_phone['name']} is my top recommendation.")
        
        # Add key highlights
        if top_phone.get("match_reasons"):
            reasons = top_phone["match_reasons"][:2]  # Top 2 reasons
            text_parts.append(f"Here's why: {', '.join(reasons).lower()}.")
        
        return " ".join(text_parts)
    
    def _generate_comparison_text(
        self,
        phones: List[Dict[str, Any]],
        features: List[Dict[str, Any]],
        summary: str,
        reasoning: str
    ) -> str:
        """Generate contextual text for comparisons."""
        phone_names = [p.get("name", "") for p in phones]
        
        text_parts = []
        
        if reasoning and reasoning.strip():
            text_parts.append(reasoning.strip())
        
        text_parts.append(f"Here's a comparison of {' vs '.join(phone_names)}:")
        
        if summary:
            text_parts.append(summary)
        
        text_parts.append("For a more detailed comparison with additional features, visit our dedicated comparison page.")
        
        return " ".join(text_parts)
    
    def _generate_specifications_text(self, phone_specs: Dict[str, Any], reasoning: str) -> str:
        """Generate contextual text for specifications."""
        basic_info = phone_specs.get("basic_info", {})
        phone_name = basic_info.get("name", "this phone")
        
        text_parts = []
        
        if reasoning and reasoning.strip():
            text_parts.append(reasoning.strip())
        
        text_parts.append(f"Here are the detailed specifications for the {phone_name}:")
        
        # Add key highlights
        highlights = []
        if basic_info.get("price"):
            highlights.append(f"priced at ৳{basic_info['price']:,.0f}")
        
        performance = phone_specs.get("performance", {})
        if performance.get("ram"):
            highlights.append(f"{performance['ram']}GB RAM")
        
        camera = phone_specs.get("camera", {})
        if camera.get("primary_mp"):
            highlights.append(f"{camera['primary_mp']}MP main camera")
        
        if highlights:
            text_parts.append(f"Key features include: {', '.join(highlights)}.")
        
        return " ".join(text_parts)
    
    def _format_specs_structure(self, phone_specs: Dict[str, Any]) -> Dict[str, Any]:
        """Format specifications into structured categories."""
        return {
            "display": phone_specs.get("display", {}),
            "performance": phone_specs.get("performance", {}),
            "camera": phone_specs.get("camera", {}),
            "battery": phone_specs.get("battery", {}),
            "connectivity": phone_specs.get("connectivity", {}),
            "design": phone_specs.get("design", {}),
            "scores": phone_specs.get("scores", {})
        }
    
    def _generate_recommendation_suggestions(self, filters: Dict[str, Any], original_query: str) -> List[str]:
        """Generate follow-up suggestions for recommendations."""
        suggestions = []
        
        # Add filter-based suggestions
        if filters.get("price_original"):
            suggestions.append("Show me phones in a different price range")
        
        if not filters.get("camera_score"):
            suggestions.append("Find phones with excellent cameras")
        
        if not filters.get("battery_capacity_numeric"):
            suggestions.append("Show phones with long battery life")
        
        # Add general suggestions
        suggestions.extend([
            "Compare these phones side by side",
            "Show me the detailed specs of the top phone",
            "Find similar phones from different brands"
        ])
        
        return suggestions[:self.max_suggestions]
    
    def _generate_comparison_suggestions(self, phones: List[Dict[str, Any]]) -> List[str]:
        """Generate follow-up suggestions for comparisons."""
        suggestions = [
            "Show me detailed specs for each phone",
            "Find alternatives to these phones",
            "Which phone is better for photography?",
            "Compare battery life between these phones"
        ]
        
        if len(phones) < 3:
            suggestions.append("Add another phone to this comparison")
        
        return suggestions[:self.max_suggestions]
    
    def _generate_specs_suggestions(self, phone_specs: Dict[str, Any]) -> List[str]:
        """Generate follow-up suggestions for specifications."""
        phone_name = phone_specs.get("basic_info", {}).get("name", "this phone")
        brand = phone_specs.get("basic_info", {}).get("brand", "")
        
        suggestions = [
            f"Compare {phone_name} with similar phones",
            f"Find alternatives to {phone_name}",
            "Show me phones with better cameras",
            "Find phones in the same price range"
        ]
        
        if brand:
            suggestions.append(f"Show me other {brand} phones")
        
        return suggestions[:self.max_suggestions]
    
    def _generate_conversational_suggestions(
        self,
        original_query: str,
        related_phones: Optional[List[Dict[str, Any]]]
    ) -> List[str]:
        """Generate follow-up suggestions for conversational responses."""
        suggestions = [
            "Recommend phones for my budget",
            "Compare popular phones",
            "Show me the latest phone releases",
            "Find phones with specific features"
        ]
        
        if related_phones:
            phone_name = related_phones[0].get("name", "")
            if phone_name:
                suggestions.insert(0, f"Tell me more about {phone_name}")
        
        return suggestions[:self.max_suggestions]
    
    def _create_error_response(self, error_message: str) -> Dict[str, Any]:
        """Create a standardized error response."""
        return {
            "response_type": "text",
            "content": {
                "text": error_message,
                "error": True
            },
            "suggestions": [
                "Try rephrasing your question",
                "Ask for phone recommendations",
                "Browse popular phones"
            ],
            "metadata": {
                "error": True
            }
        }