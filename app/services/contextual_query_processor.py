"""
Enhanced Contextual Query Processor for handling context-aware phone queries
"""

from typing import List, Dict, Any, Optional, Tuple
import re
import logging
from sqlalchemy.orm import Session

from app.models.phone import Phone
from app.crud import phone as phone_crud
from app.services.phone_name_resolver import PhoneNameResolver, ResolvedPhone
from app.services.context_manager import ContextManager
from app.services.contextual_filter_generator import ContextualFilterGenerator, ContextualIntent
from app.services.error_handler import (
    ContextualErrorHandler, PhoneResolutionError, ContextProcessingError,
    FilterGenerationError, handle_contextual_error
)

logger = logging.getLogger(__name__)

class ContextualQueryProcessor:
    """Enhanced service for processing contextual queries that reference specific phones"""
    
    def __init__(self, session_id: str = None):
        """Initialize the enhanced contextual query processor"""
        self.phone_name_resolver = PhoneNameResolver()
        self.context_manager = ContextManager()
        self.filter_generator = ContextualFilterGenerator()
        self.error_handler = ContextualErrorHandler()
        self.session_id = session_id
        
        # Legacy patterns for backward compatibility
        self.phone_name_patterns = self._build_phone_name_patterns()
        self.comparison_keywords = [
            "vs", "versus", "compare", "comparison", "against", "better than",
            "worse than", "superior to", "inferior to", "compared to"
        ]
        self.contextual_keywords = [
            "than", "from", "like", "similar to", "alternative to", "instead of",
            "replacement for", "upgrade from", "downgrade from"
        ]
        
        # Enhanced keyword patterns
        self.relationship_patterns = {
            "better_than": [
                "better than", "superior to", "outperforms", "beats", "exceeds"
            ],
            "cheaper_than": [
                "cheaper than", "less expensive than", "more affordable than", 
                "under the price of", "costs less than"
            ],
            "similar_to": [
                "similar to", "like", "comparable to", "equivalent to", "same as"
            ],
            "alternative_to": [
                "alternative to", "instead of", "replacement for", "substitute for"
            ],
            "more_expensive_than": [
                "more expensive than", "costlier than", "pricier than"
            ]
        }
        
        self.focus_area_patterns = {
            "camera": ["camera", "photo", "photography", "selfie", "video recording"],
            "battery": ["battery", "power", "charging", "mah", "battery life"],
            "performance": ["performance", "speed", "gaming", "processor", "ram"],
            "display": ["display", "screen", "resolution", "refresh rate", "brightness"],
            "price": ["price", "cost", "budget", "expensive", "cheap", "affordable"]
        }
    
    def _build_phone_name_patterns(self) -> List[Dict[str, str]]:
        """Build patterns for common phone naming conventions"""
        return [
            # iPhone patterns
            {"pattern": r"iPhone\s+(\d+(?:\s+Pro(?:\s+Max)?)?)", "brand": "Apple"},
            {"pattern": r"iPhone\s+(\w+(?:\s+\w+)*)", "brand": "Apple"},
            
            # Samsung patterns
            {"pattern": r"Samsung\s+Galaxy\s+([A-Z]\d+(?:\s+\w+)*)", "brand": "Samsung"},
            {"pattern": r"Galaxy\s+([A-Z]\d+(?:\s+\w+)*)", "brand": "Samsung"},
            
            # Xiaomi patterns
            {"pattern": r"Xiaomi\s+(\w+(?:\s+\w+)*)", "brand": "Xiaomi"},
            {"pattern": r"Redmi\s+(\w+(?:\s+\w+)*)", "brand": "Xiaomi"},
            {"pattern": r"POCO\s+(\w+(?:\s+\w+)*)", "brand": "Xiaomi"},
            
            # OnePlus patterns
            {"pattern": r"OnePlus\s+(\w+(?:\s+\w+)*)", "brand": "OnePlus"},
            
            # Generic brand patterns
            {"pattern": r"(Oppo|Vivo|Realme|Nothing|Google)\s+(\w+(?:\s+\w+)*)", "brand": "\\1"},
        ]
    
    def extract_phone_references_enhanced(self, query: str, db: Session) -> List[ResolvedPhone]:
        """
        Enhanced phone reference extraction using the new phone name resolver
        
        Args:
            query: The contextual query string
            db: Database session
            
        Returns:
            List of resolved phone references
        """
        try:
            # Extract phone names using legacy method for compatibility
            legacy_refs = self.extract_phone_references(query)
            phone_names = [ref["full_name"] for ref in legacy_refs]
            
            # Use enhanced resolver
            resolved_phones = self.phone_name_resolver.resolve_phone_names(phone_names, db)
            
            logger.debug(f"Resolved {len(resolved_phones)} phones from query: {query}")
            return resolved_phones
            
        except Exception as e:
            logger.error(f"Error in enhanced phone reference extraction: {e}")
            return []
    
    def classify_query_intent_enhanced(
        self, 
        query: str, 
        resolved_phones: List[ResolvedPhone],
        context: Optional[Dict] = None
    ) -> ContextualIntent:
        """
        Enhanced query intent classification with confidence scoring
        
        Args:
            query: The query string
            resolved_phones: List of resolved phone references
            context: Optional conversation context
            
        Returns:
            ContextualIntent with detailed classification
        """
        try:
            query_lower = query.lower()
            
            # Determine query type
            query_type = self._classify_query_type(query_lower, resolved_phones)
            
            # Determine relationship
            relationship = self._extract_relationship(query_lower)
            
            # Determine focus area
            focus_area = self._extract_focus_area(query_lower)
            
            # Calculate confidence
            confidence = self._calculate_intent_confidence(query_type, resolved_phones, relationship, focus_area)
            
            # Extract context metadata
            context_metadata = self._extract_context_metadata(query, resolved_phones, context)
            
            return ContextualIntent(
                query_type=query_type,
                confidence=confidence,
                resolved_phones=resolved_phones,
                relationship=relationship,
                focus_area=focus_area,
                filters={},
                context_metadata=context_metadata,
                original_query=query,
                processed_query=query  # Will be enhanced later if needed
            )
            
        except Exception as e:
            logger.error(f"Error in enhanced intent classification: {e}")
            # Return default intent
            return ContextualIntent(
                query_type="recommendation",
                confidence=0.5,
                resolved_phones=resolved_phones,
                relationship=None,
                focus_area=None,
                filters={},
                context_metadata={},
                original_query=query,
                processed_query=query
            )
    
    def process_contextual_query_enhanced(
        self, 
        db: Session, 
        query: str, 
        session_id: str = None
    ) -> Dict[str, Any]:
        """
        Enhanced contextual query processing with full integration
        
        Args:
            db: Database session
            query: The contextual query string
            session_id: Optional session ID for context management
            
        Returns:
            Enhanced contextual response
        """
        try:
            # Use provided session_id or instance session_id
            current_session_id = session_id or self.session_id
            
            # Get conversation context if available
            context = None
            if current_session_id:
                context = self.context_manager.get_context(current_session_id)
            
            # Enhance query with context if available
            enhanced_query = query
            if context:
                enhanced_query = self.context_manager.resolve_contextual_references(query, context)
            
            # Extract and resolve phone references
            resolved_phones = self.extract_phone_references_enhanced(enhanced_query, db)
            
            # If no phones resolved, try legacy method
            if not resolved_phones:
                legacy_result = self.process_contextual_query(db, query)
                legacy_result["enhanced_processing"] = False
                return legacy_result
            
            # Classify intent
            intent = self.classify_query_intent_enhanced(enhanced_query, resolved_phones, context)
            
            # Generate contextual filters
            contextual_filters = self.filter_generator.generate_filters(intent, resolved_phones)
            intent.filters = contextual_filters
            
            # Update conversation context
            if current_session_id:
                phone_data = [phone.matched_phone for phone in resolved_phones]
                self.context_manager.update_context(
                    current_session_id,
                    phones=phone_data,
                    query=query,
                    query_type=intent.query_type
                )
            
            # Generate response
            response = self._generate_enhanced_response(intent, db)
            response["enhanced_processing"] = True
            response["session_id"] = current_session_id
            
            return response
            
        except Exception as e:
            logger.error(f"Error in enhanced contextual query processing: {e}")
            # Fallback to legacy processing
            legacy_result = self.process_contextual_query(db, query)
            legacy_result["enhanced_processing"] = False
            legacy_result["error"] = str(e)
            return legacy_result
    
    def extract_phone_references(self, query: str) -> List[Dict[str, str]]:
        """
        Extract phone references from a contextual query
        
        Args:
            query: The contextual query string
            
        Returns:
            List of phone references with brand and model information
        """
        phone_refs = []
        query_normalized = query.strip()
        
        # Try each pattern
        for pattern_info in self.phone_name_patterns:
            pattern = pattern_info["pattern"]
            brand_template = pattern_info["brand"]
            
            matches = re.finditer(pattern, query_normalized, re.IGNORECASE)
            for match in matches:
                if brand_template.startswith("\\"):
                    # Use captured group for brand
                    brand = match.group(1)
                    model = match.group(2) if match.lastindex >= 2 else ""
                else:
                    # Use template brand
                    brand = brand_template
                    model = match.group(1)
                
                phone_refs.append({
                    "brand": brand,
                    "model": model.strip(),
                    "full_name": match.group(0),
                    "position": match.start()
                })
        
        # Remove duplicates and sort by position
        unique_refs = []
        seen = set()
        for ref in sorted(phone_refs, key=lambda x: x["position"]):
            key = f"{ref['brand']}_{ref['model']}".lower()
            if key not in seen:
                seen.add(key)
                unique_refs.append(ref)
        
        return unique_refs
    
    def identify_query_type(self, query: str, phone_refs: List[Dict[str, str]]) -> str:
        """
        Identify the type of contextual query
        
        Args:
            query: The query string
            phone_refs: List of phone references found in the query
            
        Returns:
            Query type: 'comparison', 'alternative', 'specification', 'recommendation'
        """
        query_lower = query.lower()
        
        # Check for comparison keywords
        if any(keyword in query_lower for keyword in self.comparison_keywords):
            return "comparison"
        
        # Check for alternative/similar requests
        if any(keyword in query_lower for keyword in ["similar", "alternative", "like", "instead"]):
            return "alternative"
        
        # Check for specification requests
        if any(keyword in query_lower for keyword in ["spec", "detail", "feature", "about"]):
            return "specification"
        
        # Check for contextual recommendations (better than, cheaper than, etc.)
        if any(keyword in query_lower for keyword in self.contextual_keywords):
            return "contextual_recommendation"
        
        # Default to recommendation if phones are referenced
        if phone_refs:
            return "contextual_recommendation"
        
        return "recommendation"
    
    def extract_comparison_intent(self, query: str, phone_refs: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Extract comparison intent from query
        
        Args:
            query: The query string
            phone_refs: List of phone references
            
        Returns:
            Comparison intent with phones and focus area
        """
        query_lower = query.lower()
        
        # Determine focus area
        focus_area = None
        if "camera" in query_lower:
            focus_area = "camera"
        elif "battery" in query_lower:
            focus_area = "battery"
        elif "performance" in query_lower or "speed" in query_lower:
            focus_area = "performance"
        elif "display" in query_lower or "screen" in query_lower:
            focus_area = "display"
        elif "price" in query_lower or "cost" in query_lower:
            focus_area = "price"
        
        return {
            "type": "comparison",
            "phones": phone_refs,
            "focus_area": focus_area,
            "query": query
        }
    
    def extract_alternative_intent(self, query: str, phone_refs: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Extract alternative/similar phone intent
        
        Args:
            query: The query string
            phone_refs: List of phone references
            
        Returns:
            Alternative intent with reference phones and criteria
        """
        query_lower = query.lower()
        
        # Determine criteria for alternatives
        criteria = {}
        
        if "cheaper" in query_lower or "budget" in query_lower:
            criteria["price_constraint"] = "lower"
        elif "expensive" in query_lower or "premium" in query_lower:
            criteria["price_constraint"] = "higher"
        
        if "better camera" in query_lower:
            criteria["camera_constraint"] = "better"
        elif "better battery" in query_lower:
            criteria["battery_constraint"] = "better"
        elif "better performance" in query_lower:
            criteria["performance_constraint"] = "better"
        
        return {
            "type": "alternative",
            "reference_phones": phone_refs,
            "criteria": criteria,
            "query": query
        }
    
    def extract_contextual_recommendation_intent(self, query: str, phone_refs: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Extract contextual recommendation intent (better than X, cheaper than Y, etc.)
        
        Args:
            query: The query string
            phone_refs: List of phone references
            
        Returns:
            Contextual recommendation intent
        """
        query_lower = query.lower()
        
        # Determine the relationship to reference phones
        relationship = "similar"  # default
        
        if any(word in query_lower for word in ["better", "superior", "upgrade"]):
            relationship = "better"
        elif any(word in query_lower for word in ["cheaper", "affordable", "budget"]):
            relationship = "cheaper"
        elif any(word in query_lower for word in ["worse", "inferior", "downgrade"]):
            relationship = "worse"
        elif any(word in query_lower for word in ["expensive", "premium"]):
            relationship = "more_expensive"
        
        # Determine focus area
        focus_area = None
        if "camera" in query_lower:
            focus_area = "camera"
        elif "battery" in query_lower:
            focus_area = "battery"
        elif "performance" in query_lower:
            focus_area = "performance"
        elif "display" in query_lower:
            focus_area = "display"
        elif "price" in query_lower:
            focus_area = "price"
        
        return {
            "type": "contextual_recommendation",
            "reference_phones": phone_refs,
            "relationship": relationship,
            "focus_area": focus_area,
            "query": query
        }
    
    def process_contextual_query(self, db: Session, query: str) -> Dict[str, Any]:
        """
        Process a contextual query and return structured intent
        
        Args:
            db: Database session
            query: The contextual query string
            
        Returns:
            Structured intent for the contextual query
        """
        try:
            # Extract phone references
            phone_refs = self.extract_phone_references(query)
            
            # If no phone references found, treat as regular query
            if not phone_refs:
                return {
                    "type": "recommendation",
                    "is_contextual": False,
                    "query": query
                }
            
            # Identify query type
            query_type = self.identify_query_type(query, phone_refs)
            
            # Process based on query type
            if query_type == "comparison":
                intent = self.extract_comparison_intent(query, phone_refs)
            elif query_type == "alternative":
                intent = self.extract_alternative_intent(query, phone_refs)
            elif query_type == "contextual_recommendation":
                intent = self.extract_contextual_recommendation_intent(query, phone_refs)
            else:
                intent = {
                    "type": "recommendation",
                    "reference_phones": phone_refs,
                    "query": query
                }
            
            # Enhance with actual phone data
            intent["is_contextual"] = True
            intent["resolved_phones"] = self._resolve_phone_references(db, phone_refs)
            
            return intent
            
        except Exception as e:
            logger.error(f"Error processing contextual query: {e}")
            return {
                "type": "recommendation",
                "is_contextual": False,
                "query": query,
                "error": str(e)
            }
    
    def _resolve_phone_references(self, db: Session, phone_refs: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """
        Resolve phone references to actual phone data
        
        Args:
            db: Database session
            phone_refs: List of phone references
            
        Returns:
            List of resolved phone data
        """
        resolved_phones = []
        
        for ref in phone_refs:
            # Try to find the phone in the database
            search_terms = [
                f"{ref['brand']} {ref['model']}",
                ref['model'],
                ref['full_name']
            ]
            
            phone = None
            for term in search_terms:
                phone = phone_crud.get_phone_by_name_or_model(db, term)
                if phone:
                    break
            
            if phone:
                # Convert to dict if it's a SQLAlchemy object
                if hasattr(phone, '__table__'):
                    phone_data = phone_crud.phone_to_dict(phone)
                else:
                    phone_data = phone
                
                resolved_phones.append({
                    "reference": ref,
                    "phone": phone_data,
                    "found": True
                })
            else:
                resolved_phones.append({
                    "reference": ref,
                    "phone": None,
                    "found": False
                })
        
        return resolved_phones
    
    def generate_contextual_filters(self, intent: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate database filters based on contextual intent
        
        Args:
            intent: The processed contextual intent
            
        Returns:
            Dictionary of filters for database query
        """
        filters = {}
        
        if not intent.get("is_contextual") or not intent.get("resolved_phones"):
            return filters
        
        resolved_phones = intent["resolved_phones"]
        reference_phones = [rp["phone"] for rp in resolved_phones if rp["found"]]
        
        if not reference_phones:
            return filters
        
        query_type = intent.get("type")
        relationship = intent.get("relationship", "similar")
        focus_area = intent.get("focus_area")
        
        if query_type == "contextual_recommendation":
            # Generate filters based on relationship to reference phones
            if relationship == "better":
                self._add_better_than_filters(filters, reference_phones, focus_area)
            elif relationship == "cheaper":
                self._add_cheaper_than_filters(filters, reference_phones)
            elif relationship == "more_expensive":
                self._add_more_expensive_than_filters(filters, reference_phones)
            elif relationship == "similar":
                self._add_similar_to_filters(filters, reference_phones)
        
        elif query_type == "alternative":
            criteria = intent.get("criteria", {})
            self._add_alternative_filters(filters, reference_phones, criteria)
        
        return filters
    
    def _add_better_than_filters(self, filters: Dict[str, Any], reference_phones: List[Dict], focus_area: str = None):
        """Add filters for phones better than reference phones"""
        if not reference_phones:
            return
        
        ref_phone = reference_phones[0]  # Use first reference phone
        
        if focus_area == "camera":
            if ref_phone.get("camera_score"):
                filters["min_camera_score"] = ref_phone["camera_score"] + 0.5
        elif focus_area == "battery":
            if ref_phone.get("battery_capacity_numeric"):
                filters["min_battery_capacity_numeric"] = ref_phone["battery_capacity_numeric"] + 500
            if ref_phone.get("battery_score"):
                filters["min_battery_score"] = ref_phone["battery_score"] + 0.5
        elif focus_area == "performance":
            if ref_phone.get("performance_score"):
                filters["min_performance_score"] = ref_phone["performance_score"] + 0.5
        elif focus_area == "display":
            if ref_phone.get("display_score"):
                filters["min_display_score"] = ref_phone["display_score"] + 0.5
        else:
            # Overall better
            if ref_phone.get("overall_device_score"):
                filters["min_overall_device_score"] = ref_phone["overall_device_score"] + 0.5
    
    def _add_cheaper_than_filters(self, filters: Dict[str, Any], reference_phones: List[Dict]):
        """Add filters for phones cheaper than reference phones"""
        if not reference_phones:
            return
        
        ref_phone = reference_phones[0]
        if ref_phone.get("price_original"):
            filters["max_price"] = ref_phone["price_original"] - 1000  # At least 1000 BDT cheaper
    
    def _add_more_expensive_than_filters(self, filters: Dict[str, Any], reference_phones: List[Dict]):
        """Add filters for phones more expensive than reference phones"""
        if not reference_phones:
            return
        
        ref_phone = reference_phones[0]
        if ref_phone.get("price_original"):
            filters["min_price"] = ref_phone["price_original"] + 1000  # At least 1000 BDT more expensive
    
    def _add_similar_to_filters(self, filters: Dict[str, Any], reference_phones: List[Dict]):
        """Add filters for phones similar to reference phones"""
        if not reference_phones:
            return
        
        ref_phone = reference_phones[0]
        
        # Similar price range (±20%)
        if ref_phone.get("price_original"):
            price = ref_phone["price_original"]
            filters["min_price"] = int(price * 0.8)
            filters["max_price"] = int(price * 1.2)
        
        # Similar RAM
        if ref_phone.get("ram_gb"):
            ram = ref_phone["ram_gb"]
            filters["min_ram_gb"] = max(4, ram - 2)
            filters["max_ram_gb"] = ram + 4
    
    def _add_alternative_filters(self, filters: Dict[str, Any], reference_phones: List[Dict], criteria: Dict[str, str]):
        """Add filters for alternative phones based on criteria"""
        if not reference_phones:
            return
        
        ref_phone = reference_phones[0]
        
        # Apply price constraints
        price_constraint = criteria.get("price_constraint")
        if price_constraint == "lower" and ref_phone.get("price_original"):
            filters["max_price"] = ref_phone["price_original"] - 1000
        elif price_constraint == "higher" and ref_phone.get("price_original"):
            filters["min_price"] = ref_phone["price_original"] + 1000
        
        # Apply feature constraints
        if criteria.get("camera_constraint") == "better" and ref_phone.get("camera_score"):
            filters["min_camera_score"] = ref_phone["camera_score"] + 0.5
        
        if criteria.get("battery_constraint") == "better" and ref_phone.get("battery_score"):
            filters["min_battery_score"] = ref_phone["battery_score"] + 0.5
        
        if criteria.get("performance_constraint") == "better" and ref_phone.get("performance_score"):
            filters["min_performance_score"] = ref_phone["performance_score"] + 0.5
    
    def _classify_query_type(self, query_lower: str, resolved_phones: List[ResolvedPhone]) -> str:
        """Classify the type of contextual query"""
        # Check for comparison keywords
        if any(keyword in query_lower for keyword in self.comparison_keywords):
            return "comparison"
        
        # Check for alternative/similar requests
        if any(keyword in query_lower for keyword in ["similar", "alternative", "like", "instead"]):
            return "alternative"
        
        # Check for specification requests
        if any(keyword in query_lower for keyword in ["spec", "detail", "feature", "about"]):
            return "specification"
        
        # Check for contextual recommendations (better than, cheaper than, etc.)
        if any(keyword in query_lower for keyword in self.contextual_keywords):
            return "contextual_recommendation"
        
        # Default to recommendation if phones are referenced
        if resolved_phones:
            return "contextual_recommendation"
        
        return "recommendation"
    
    def _extract_relationship(self, query_lower: str) -> Optional[str]:
        """Extract relationship type from query"""
        for relationship, patterns in self.relationship_patterns.items():
            if any(pattern in query_lower for pattern in patterns):
                return relationship
        return None
    
    def _extract_focus_area(self, query_lower: str) -> Optional[str]:
        """Extract focus area from query"""
        for area, patterns in self.focus_area_patterns.items():
            if any(pattern in query_lower for pattern in patterns):
                return area
        return None
    
    def _calculate_intent_confidence(
        self, 
        query_type: str, 
        resolved_phones: List[ResolvedPhone], 
        relationship: Optional[str], 
        focus_area: Optional[str]
    ) -> float:
        """Calculate confidence score for intent classification"""
        confidence = 0.5  # Base confidence
        
        # Increase confidence based on resolved phones
        if resolved_phones:
            avg_phone_confidence = sum(phone.confidence_score for phone in resolved_phones) / len(resolved_phones)
            confidence += avg_phone_confidence * 0.3
        
        # Increase confidence based on clear relationship
        if relationship:
            confidence += 0.1
        
        # Increase confidence based on focus area
        if focus_area:
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def _extract_context_metadata(
        self, 
        query: str, 
        resolved_phones: List[ResolvedPhone], 
        context: Optional[Dict]
    ) -> Dict[str, Any]:
        """Extract context metadata for the intent"""
        metadata = {
            "phone_count": len(resolved_phones),
            "has_context": context is not None,
            "query_length": len(query.split())
        }
        
        if resolved_phones:
            metadata["phone_names"] = [phone.matched_phone.get('name', '') for phone in resolved_phones]
            metadata["phone_brands"] = list(set(phone.matched_phone.get('brand', '') for phone in resolved_phones))
        
        if context:
            metadata["context_phone_count"] = len(context.get("recent_phones", []))
            metadata["context_query_count"] = context.get("query_count", 0)
        
        return metadata
    
    def _generate_enhanced_response(self, intent: ContextualIntent, db: Session) -> Dict[str, Any]:
        """Generate enhanced response based on contextual intent"""
        try:
            if intent.query_type == "comparison":
                return self._generate_comparison_response(intent, db)
            elif intent.query_type == "alternative":
                return self._generate_alternative_response(intent, db)
            elif intent.query_type == "specification":
                return self._generate_specification_response(intent, db)
            elif intent.query_type == "contextual_recommendation":
                return self._generate_contextual_recommendation_response(intent, db)
            else:
                return self._generate_default_response(intent, db)
                
        except Exception as e:
            logger.error(f"Error generating enhanced response: {e}")
            return {
                "type": "error",
                "message": "Sorry, I couldn't process your contextual query. Please try rephrasing.",
                "error": str(e)
            }
    
    def _generate_comparison_response(self, intent: ContextualIntent, db: Session) -> Dict[str, Any]:
        """Generate comparison response"""
        phones = [phone.matched_phone for phone in intent.resolved_phones]
        
        return {
            "type": "comparison",
            "phones": phones,
            "focus_area": intent.focus_area,
            "filters": intent.filters,
            "confidence": intent.confidence,
            "message": f"Comparing {len(phones)} phones" + (f" focusing on {intent.focus_area}" if intent.focus_area else "")
        }
    
    def _generate_alternative_response(self, intent: ContextualIntent, db: Session) -> Dict[str, Any]:
        """Generate alternative phone response"""
        reference_phone = intent.resolved_phones[0].matched_phone if intent.resolved_phones else None
        
        # Use filters to find alternatives
        alternatives = phone_crud.get_smart_recommendations(db=db, **intent.filters)
        
        return {
            "type": "alternative",
            "reference_phone": reference_phone,
            "alternatives": alternatives[:10],  # Limit to top 10
            "filters": intent.filters,
            "confidence": intent.confidence,
            "message": f"Here are alternatives to {reference_phone.get('name', 'the selected phone') if reference_phone else 'your phone'}"
        }
    
    def _generate_specification_response(self, intent: ContextualIntent, db: Session) -> Dict[str, Any]:
        """Generate specification response"""
        phones = [phone.matched_phone for phone in intent.resolved_phones]
        
        return {
            "type": "specification",
            "phones": phones,
            "focus_area": intent.focus_area,
            "confidence": intent.confidence,
            "message": f"Here are the specifications for {len(phones)} phone(s)"
        }
    
    def _generate_contextual_recommendation_response(self, intent: ContextualIntent, db: Session) -> Dict[str, Any]:
        """Generate contextual recommendation response"""
        reference_phone = intent.resolved_phones[0].matched_phone if intent.resolved_phones else None
        
        # Use filters to find recommendations
        recommendations = phone_crud.get_smart_recommendations(db=db, **intent.filters)
        
        relationship_messages = {
            "better_than": "better than",
            "cheaper_than": "cheaper than",
            "similar_to": "similar to",
            "alternative_to": "alternatives to",
            "more_expensive_than": "more expensive than"
        }
        
        relationship_text = relationship_messages.get(intent.relationship, "related to")
        focus_text = f" with better {intent.focus_area}" if intent.focus_area else ""
        
        return {
            "type": "recommendation",
            "reference_phone": reference_phone,
            "recommendations": recommendations[:10],  # Limit to top 10
            "relationship": intent.relationship,
            "focus_area": intent.focus_area,
            "filters": intent.filters,
            "confidence": intent.confidence,
            "message": f"Here are phones {relationship_text} {reference_phone.get('name', 'your phone') if reference_phone else 'the selected phone'}{focus_text}"
        }
    
    def _generate_default_response(self, intent: ContextualIntent, db: Session) -> Dict[str, Any]:
        """Generate default response"""
        return {
            "type": "recommendation",
            "phones": [phone.matched_phone for phone in intent.resolved_phones],
            "confidence": intent.confidence,
            "message": "Here's information about the phones you mentioned"
        }