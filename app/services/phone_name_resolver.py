"""
Enhanced Phone Name Resolver with Advanced Matching
"""

from typing import List, Dict, Any, Optional, Tuple
import re
import logging
from difflib import SequenceMatcher
from dataclasses import dataclass
from sqlalchemy.orm import Session

from app.models.phone import Phone
from app.crud import phone as phone_crud

logger = logging.getLogger(__name__)

@dataclass
class ResolvedPhone:
    """Represents a resolved phone with matching information"""
    original_reference: str
    matched_phone: Dict[str, Any]
    confidence_score: float
    match_type: str  # exact, fuzzy, alias, brand_model
    alternative_matches: List[Dict[str, Any]]

class PhoneNameResolver:
    """Enhanced phone name resolver with advanced matching capabilities"""
    
    def __init__(self):
        """Initialize the phone name resolver"""
        self.min_confidence_threshold = 0.6
        self.fuzzy_threshold = 0.8
        self.brand_aliases = self._build_brand_aliases()
        self.model_patterns = self._build_model_patterns()
        self.common_abbreviations = self._build_abbreviations()
    
    def _build_brand_aliases(self) -> Dict[str, List[str]]:
        """Build brand aliases for better matching"""
        return {
            "apple": ["apple", "iphone"],
            "samsung": ["samsung", "galaxy"],
            "xiaomi": ["xiaomi", "mi", "redmi", "poco"],
            "oneplus": ["oneplus", "one plus", "1+"],
            "google": ["google", "pixel"],
            "oppo": ["oppo"],
            "vivo": ["vivo"],
            "realme": ["realme"],
            "nothing": ["nothing"],
            "huawei": ["huawei", "honor"],
            "nokia": ["nokia"],
            "motorola": ["motorola", "moto"],
            "sony": ["sony", "xperia"]
        }
    
    def _build_model_patterns(self) -> List[Dict[str, str]]:
        """Build comprehensive model patterns for phone name extraction"""
        return [
            # iPhone patterns
            {"pattern": r"iPhone\s*(\d+(?:\s*Pro(?:\s*Max)?)?)", "brand": "Apple", "priority": 1},
            {"pattern": r"iPhone\s*(\w+(?:\s+\w+)*)", "brand": "Apple", "priority": 2},
            
            # Samsung Galaxy patterns
            {"pattern": r"Samsung\s+Galaxy\s+([A-Z]\d+(?:\s+\w+)*)", "brand": "Samsung", "priority": 1},
            {"pattern": r"Galaxy\s+([A-Z]\d+(?:\s+\w+)*)", "brand": "Samsung", "priority": 1},
            {"pattern": r"Samsung\s+([A-Z]\d+(?:\s+\w+)*)", "brand": "Samsung", "priority": 2},
            
            # Xiaomi patterns
            {"pattern": r"Xiaomi\s+(\w+(?:\s+\w+)*)", "brand": "Xiaomi", "priority": 1},
            {"pattern": r"Redmi\s+(\w+(?:\s+\w+)*)", "brand": "Xiaomi", "priority": 1},
            {"pattern": r"POCO\s+(\w+(?:\s+\w+)*)", "brand": "Xiaomi", "priority": 1},
            {"pattern": r"Mi\s+(\w+(?:\s+\w+)*)", "brand": "Xiaomi", "priority": 2},
            
            # OnePlus patterns
            {"pattern": r"OnePlus\s+(\w+(?:\s+\w+)*)", "brand": "OnePlus", "priority": 1},
            {"pattern": r"One\s*Plus\s+(\w+(?:\s+\w+)*)", "brand": "OnePlus", "priority": 1},
            {"pattern": r"1\+\s*(\w+(?:\s+\w+)*)", "brand": "OnePlus", "priority": 2},
            
            # Google Pixel patterns
            {"pattern": r"Google\s+Pixel\s+(\w+(?:\s+\w+)*)", "brand": "Google", "priority": 1},
            {"pattern": r"Pixel\s+(\w+(?:\s+\w+)*)", "brand": "Google", "priority": 1},
            
            # Generic brand patterns
            {"pattern": r"(Oppo|Vivo|Realme|Nothing|Huawei|Honor|Nokia|Motorola|Sony)\s+(\w+(?:\s+\w+)*)", "brand": "\\1", "priority": 1},
        ]
    
    def _build_abbreviations(self) -> Dict[str, str]:
        """Build common abbreviations and their expansions"""
        return {
            "pro": "Pro",
            "max": "Max",
            "plus": "Plus",
            "ultra": "Ultra",
            "fe": "FE",
            "gt": "GT",
            "note": "Note",
            "lite": "Lite",
            "mini": "Mini"
        }
    
    def resolve_phone_names(self, phone_refs: List[str], db: Session) -> List[ResolvedPhone]:
        """
        Resolve multiple phone names to database objects
        
        Args:
            phone_refs: List of phone name references from query
            db: Database session
            
        Returns:
            List of resolved phones with confidence scores
        """
        resolved_phones = []
        
        for phone_ref in phone_refs:
            resolved = self.resolve_single_phone(phone_ref, db)
            if resolved:
                resolved_phones.append(resolved)
        
        return resolved_phones
    
    def resolve_single_phone(self, phone_name: str, db: Session) -> Optional[ResolvedPhone]:
        """
        Resolve a single phone name to database object
        
        Args:
            phone_name: Phone name reference
            db: Database session
            
        Returns:
            ResolvedPhone object or None if no match found
        """
        phone_name = phone_name.strip()
        
        # Try exact match first
        exact_match = self._try_exact_match(phone_name, db)
        if exact_match:
            return exact_match
        
        # Try fuzzy matching
        fuzzy_match = self._try_fuzzy_match(phone_name, db)
        if fuzzy_match:
            return fuzzy_match
        
        # Try brand + model matching
        brand_model_match = self._try_brand_model_match(phone_name, db)
        if brand_model_match:
            return brand_model_match
        
        # Try alias matching
        alias_match = self._try_alias_match(phone_name, db)
        if alias_match:
            return alias_match
        
        logger.warning(f"Could not resolve phone name: {phone_name}")
        return None
    
    def _try_exact_match(self, phone_name: str, db: Session) -> Optional[ResolvedPhone]:
        """Try exact name matching"""
        phone = phone_crud.get_phone_by_name_or_model(db, phone_name)
        if phone:
            phone_dict = phone_crud.phone_to_dict(phone) if hasattr(phone, '__table__') else phone
            return ResolvedPhone(
                original_reference=phone_name,
                matched_phone=phone_dict,
                confidence_score=1.0,
                match_type="exact",
                alternative_matches=[]
            )
        return None
    
    def _try_fuzzy_match(self, phone_name: str, db: Session) -> Optional[ResolvedPhone]:
        """Try fuzzy string matching"""
        all_phones_result = phone_crud.get_phones(db, limit=100)  # Reduced from 1000 for cost optimization
        all_phones = all_phones_result[0] if isinstance(all_phones_result, tuple) else all_phones_result
        best_match = None
        best_score = 0
        alternatives = []
        
        for phone in all_phones:
            phone_dict = phone_crud.phone_to_dict(phone) if hasattr(phone, '__table__') else phone
            
            # Create searchable text
            searchable_texts = [
                phone_dict.get('name', ''),
                phone_dict.get('model', ''),
                f"{phone_dict.get('brand', '')} {phone_dict.get('model', '')}".strip()
            ]
            
            for text in searchable_texts:
                if not text:
                    continue
                    
                # Calculate similarity
                score = self._calculate_similarity(phone_name.lower(), text.lower())
                
                if score > best_score and score >= self.fuzzy_threshold:
                    if best_match and best_score >= self.fuzzy_threshold:
                        alternatives.append(best_match)
                    best_match = phone_dict
                    best_score = score
                elif score >= self.fuzzy_threshold:
                    alternatives.append(phone_dict)
        
        if best_match and best_score >= self.min_confidence_threshold:
            return ResolvedPhone(
                original_reference=phone_name,
                matched_phone=best_match,
                confidence_score=best_score,
                match_type="fuzzy",
                alternative_matches=alternatives[:3]  # Limit to top 3 alternatives
            )
        
        return None
    
    def _try_brand_model_match(self, phone_name: str, db: Session) -> Optional[ResolvedPhone]:
        """Try brand + model pattern matching"""
        for pattern_info in self.model_patterns:
            pattern = pattern_info["pattern"]
            brand_template = pattern_info["brand"]
            
            match = re.search(pattern, phone_name, re.IGNORECASE)
            if match:
                if brand_template.startswith("\\"):
                    # Use captured group for brand
                    brand = match.group(1)
                    model = match.group(2) if match.lastindex >= 2 else ""
                else:
                    # Use template brand
                    brand = brand_template
                    model = match.group(1)
                
                # Search for phone with this brand and model
                search_terms = [
                    f"{brand} {model}".strip(),
                    model.strip(),
                    phone_name
                ]
                
                for term in search_terms:
                    phone = phone_crud.get_phone_by_name_or_model(db, term)
                    if phone:
                        phone_dict = phone_crud.phone_to_dict(phone) if hasattr(phone, '__table__') else phone
                        return ResolvedPhone(
                            original_reference=phone_name,
                            matched_phone=phone_dict,
                            confidence_score=0.9,
                            match_type="brand_model",
                            alternative_matches=[]
                        )
        
        return None
    
    def _try_alias_match(self, phone_name: str, db: Session) -> Optional[ResolvedPhone]:
        """Try matching using brand aliases"""
        phone_name_lower = phone_name.lower()
        
        for brand, aliases in self.brand_aliases.items():
            for alias in aliases:
                if alias in phone_name_lower:
                    # Extract model part
                    model_part = phone_name_lower.replace(alias, "").strip()
                    if model_part:
                        # Try to find phone with this brand and model
                        search_terms = [
                            f"{brand} {model_part}",
                            f"{alias} {model_part}",
                            model_part
                        ]
                        
                        for term in search_terms:
                            phone = phone_crud.get_phone_by_name_or_model(db, term)
                            if phone:
                                phone_dict = phone_crud.phone_to_dict(phone) if hasattr(phone, '__table__') else phone
                                return ResolvedPhone(
                                    original_reference=phone_name,
                                    matched_phone=phone_dict,
                                    confidence_score=0.8,
                                    match_type="alias",
                                    alternative_matches=[]
                                )
        
        return None
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two text strings"""
        # Use SequenceMatcher for basic similarity
        basic_score = SequenceMatcher(None, text1, text2).ratio()
        
        # Boost score if one string contains the other
        if text1 in text2 or text2 in text1:
            basic_score = max(basic_score, 0.85)
        
        # Boost score for word-level matches
        words1 = set(text1.split())
        words2 = set(text2.split())
        word_overlap = len(words1.intersection(words2)) / max(len(words1.union(words2)), 1)
        
        # Combine scores
        final_score = (basic_score * 0.7) + (word_overlap * 0.3)
        
        return min(final_score, 1.0)
    
    def calculate_match_confidence(self, query_name: str, db_name: str) -> float:
        """Calculate confidence score for a phone name match"""
        return self._calculate_similarity(query_name.lower(), db_name.lower())
    
    def suggest_similar_phones(self, failed_name: str, db: Session, limit: int = 5) -> List[str]:
        """
        Suggest similar phone names when resolution fails
        
        Args:
            failed_name: The phone name that couldn't be resolved
            db: Database session
            limit: Maximum number of suggestions
            
        Returns:
            List of suggested phone names
        """
        all_phones_result = phone_crud.get_phones(db, limit=100)  # Reduced from 1000 for cost optimization
        all_phones = all_phones_result[0] if isinstance(all_phones_result, tuple) else all_phones_result
        suggestions = []
        
        for phone in all_phones:
            phone_dict = phone_crud.phone_to_dict(phone) if hasattr(phone, '__table__') else phone
            phone_name = phone_dict.get('name', '')
            
            if phone_name:
                score = self._calculate_similarity(failed_name.lower(), phone_name.lower())
                if score >= 0.3:  # Lower threshold for suggestions
                    suggestions.append((phone_name, score))
        
        # Sort by score and return top suggestions
        suggestions.sort(key=lambda x: x[1], reverse=True)
        return [name for name, score in suggestions[:limit]]
    
    def get_phone_variations(self, phone_name: str) -> List[str]:
        """Get possible variations of a phone name"""
        variations = [phone_name]
        
        # Add variations with different spacing
        variations.append(phone_name.replace(" ", ""))
        variations.append(phone_name.replace(" ", "-"))
        
        # Add variations with abbreviations expanded
        for abbrev, expansion in self.common_abbreviations.items():
            if abbrev.lower() in phone_name.lower():
                variations.append(phone_name.lower().replace(abbrev.lower(), expansion))
        
        return list(set(variations))