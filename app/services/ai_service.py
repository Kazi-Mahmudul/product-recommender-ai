"""
Enhanced AI Service for generating badges, highlights, and contextual query processing
"""

from typing import List, Dict, Any, Optional, Tuple, Union
import httpx
import asyncio
import logging
import hashlib
import time
import json
import re
from sqlalchemy.orm import Session

from app.models.phone import Phone
from app.core.config import settings
from app.services.error_handler import (
    ExternalServiceError, handle_contextual_error, 
    contextual_error_handler
)
# Monitoring removed as requested
# from app.services.monitoring_analytics import monitoring_analytics, QueryStatus

logger = logging.getLogger(__name__)

# Simple in-memory cache
class AICache:
    """Simple in-memory cache for AI responses"""
    
    def __init__(self, ttl: int = 3600):
        """
        Initialize the cache
        
        Args:
            ttl: Time-to-live for cache entries in seconds (default: 1 hour)
        """
        self.cache = {}
        self.ttl = ttl
    
    def get(self, key: str) -> Optional[str]:
        """
        Get a value from the cache
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found or expired
        """
        if key not in self.cache:
            return None
        
        entry = self.cache[key]
        if time.time() > entry["expires"]:
            # Entry has expired
            del self.cache[key]
            return None
        
        return entry["value"]
    
    def set(self, key: str, value: str) -> None:
        """
        Set a value in the cache
        
        Args:
            key: Cache key
            value: Value to cache
        """
        self.cache[key] = {
            "value": value,
            "expires": time.time() + self.ttl
        }
    
    def clear(self) -> None:
        """Clear the cache"""
        self.cache = {}

class AIService:
    """Enhanced service for AI-based analysis of phone specifications and contextual query processing"""
    
    # Shared cache instance for all AIService instances
    _cache = AICache(ttl=3600)  # 1 hour TTL
    
    def __init__(self, api_url: str = None, timeout: int = 10):
        """Initialize the AI service with optional custom API URL and timeout"""
        self.api_url = api_url or settings.GEMINI_SERVICE_URL
        self.timeout = timeout
        self.fallback_enabled = True
    
    async def generate_badge(self, phone: Phone) -> Optional[str]:
        """
        Generate a badge for a phone based on AI analysis
        
        Args:
            phone: Phone object to analyze
            
        Returns:
            Badge string or None if generation fails
        """
        # Generate cache key based on phone ID and basic specs
        cache_key = self._generate_badge_cache_key(phone)
        
        # Check cache first
        cached_badge = self._cache.get(cache_key)
        if cached_badge:
            logger.debug(f"Badge cache hit for phone {phone.id}: {cached_badge}")
            return cached_badge
        
        # Create prompt for badge generation
        prompt = self._create_badge_prompt(phone)
        
        # Call Gemini API
        response = await self._call_gemini_api(prompt)
        if not response:
            return None
        
        # Process response to extract badge
        badge = self._process_badge_response(response)
        
        # Cache the result if valid
        if badge:
            self._cache.set(cache_key, badge)
            logger.debug(f"Cached badge for phone {phone.id}: {badge}")
        
        return badge
        
    def _generate_badge_cache_key(self, phone: Phone) -> str:
        """
        Generate a cache key for a phone's badge
        
        Args:
            phone: Phone object
            
        Returns:
            Cache key string
        """
        # Use phone ID and key specs to generate a unique key
        key_parts = [
            f"id:{getattr(phone, 'id', 0)}",
            f"brand:{getattr(phone, 'brand', '')}",
            f"model:{getattr(phone, 'model', '')}",
            f"price:{getattr(phone, 'price_original', 0)}",
            f"score:{getattr(phone, 'overall_device_score', 0)}"
        ]
        
        # Create a hash of the key parts
        key_string = "|".join(key_parts)
        return f"badge:{hashlib.md5(key_string.encode()).hexdigest()}"
    
    async def generate_highlights(self, target_phone: Phone, candidate_phone: Phone) -> List[str]:
        """
        Generate highlights comparing two phones based on AI analysis
        
        Args:
            target_phone: The reference phone
            candidate_phone: The phone to generate highlights for
            
        Returns:
            List of highlight strings
        """
        # Generate cache key based on both phones' IDs and basic specs
        cache_key = self._generate_highlights_cache_key(target_phone, candidate_phone)
        
        # Check cache first
        cached_highlights = self._cache.get(cache_key)
        if cached_highlights:
            logger.debug(f"Highlights cache hit for phones {target_phone.id} vs {candidate_phone.id}")
            # Convert cached string back to list
            return cached_highlights.split('|')
        
        # Create prompt for highlight generation
        prompt = self._create_highlight_prompt(target_phone, candidate_phone)
        
        # Call Gemini API
        response = await self._call_gemini_api(prompt)
        if not response:
            return []
        
        # Process response to extract highlights
        highlights = self._process_highlight_response(response)
        
        # Cache the result if valid
        if highlights:
            # Convert list to string for caching
            self._cache.set(cache_key, '|'.join(highlights))
            logger.debug(f"Cached highlights for phones {target_phone.id} vs {candidate_phone.id}: {highlights}")
        
        return highlights
    
    async def process_contextual_query(
        self, 
        query: str, 
        context_phones: List[Phone] = None,
        session_id: str = None,
        query_id: str = None
    ) -> Dict[str, Any]:
        """
        Process a contextual query using AI to understand intent and extract phone references
        
        Args:
            query: The user's query text
            context_phones: List of phones from conversation context
            session_id: Session ID for tracking
            query_id: Query ID for monitoring
            
        Returns:
            Dictionary containing extracted information and intent
        """
        start_time = time.time()
        
        try:
            # Generate cache key for contextual query
            cache_key = self._generate_contextual_cache_key(query, context_phones)
            
            # Check cache first
            cached_result = self._cache.get(cache_key)
            if cached_result:
                logger.debug(f"Contextual query cache hit for: {query[:50]}...")
                result = json.loads(cached_result)
                
                # Record metrics (monitoring removed)
                processing_time = time.time() - start_time
                logger.debug(f"Query processed in {processing_time:.3f}s (cached)")
                
                return result
            
            # Create prompt for contextual query processing
            prompt = self._create_contextual_query_prompt(query, context_phones)
            
            # Call Gemini API
            response = await self._call_gemini_api(prompt)
            if not response:
                # Fallback processing
                if self.fallback_enabled:
                    result = self._fallback_contextual_processing(query, context_phones)
                else:
                    raise ExternalServiceError("gemini_ai", "Service unavailable")
            else:
                # Process AI response
                result = self._process_contextual_response(response, query, context_phones)
            
            # Cache the result
            if result:
                self._cache.set(cache_key, json.dumps(result))
                logger.debug(f"Cached contextual query result for: {query[:50]}...")
            
            # Record metrics (monitoring removed)
            processing_time = time.time() - start_time
            logger.info(f"Query processed in {processing_time:.3f}s")
            
            return result
            
        except Exception as e:
            processing_time = time.time() - start_time
            
            # Record error metrics (monitoring removed)
            logger.error(f"Query failed after {processing_time:.3f}s: {type(e).__name__}")
            
            # Handle error
            error_context = {
                'query': query,
                'session_id': session_id,
                'request_id': query_id
            }
            error_response = handle_contextual_error(e, error_context)
            
            logger.error(f"Error processing contextual query: {e}")
            
            # Return fallback result if available
            if self.fallback_enabled:
                return self._fallback_contextual_processing(query, context_phones)
            else:
                raise e
    
    async def extract_phone_references(
        self, 
        query: str, 
        available_phones: List[Phone] = None
    ) -> List[Dict[str, Any]]:
        """
        Extract phone references from a query using AI
        
        Args:
            query: The user's query text
            available_phones: List of available phones to match against
            
        Returns:
            List of phone reference dictionaries
        """
        try:
            # Create prompt for phone reference extraction
            prompt = self._create_phone_extraction_prompt(query, available_phones)
            
            # Call Gemini API
            response = await self._call_gemini_api(prompt)
            if not response:
                # Fallback to regex-based extraction
                return self._fallback_phone_extraction(query, available_phones)
            
            # Process AI response
            return self._process_phone_extraction_response(response, available_phones)
            
        except Exception as e:
            logger.error(f"Error extracting phone references: {e}")
            # Fallback to regex-based extraction
            return self._fallback_phone_extraction(query, available_phones)
    
    async def classify_query_intent(
        self, 
        query: str, 
        context_phones: List[Phone] = None
    ) -> Dict[str, Any]:
        """
        Classify the intent of a query using AI
        
        Args:
            query: The user's query text
            context_phones: List of phones from conversation context
            
        Returns:
            Dictionary containing intent classification and confidence
        """
        try:
            # Create prompt for intent classification
            prompt = self._create_intent_classification_prompt(query, context_phones)
            
            # Call Gemini API
            response = await self._call_gemini_api(prompt)
            if not response:
                # Fallback to rule-based classification
                return self._fallback_intent_classification(query)
            
            # Process AI response
            return self._process_intent_classification_response(response)
            
        except Exception as e:
            logger.error(f"Error classifying query intent: {e}")
            # Fallback to rule-based classification
            return self._fallback_intent_classification(query)
        
    def _generate_highlights_cache_key(self, target_phone: Phone, candidate_phone: Phone) -> str:
        """
        Generate a cache key for highlights comparing two phones
        
        Args:
            target_phone: The reference phone
            candidate_phone: The phone to generate highlights for
            
        Returns:
            Cache key string
        """
        # Use both phones' IDs and key specs to generate a unique key
        target_key_parts = [
            f"id:{getattr(target_phone, 'id', 0)}",
            f"brand:{getattr(target_phone, 'brand', '')}",
            f"model:{getattr(target_phone, 'model', '')}"
        ]
        
        candidate_key_parts = [
            f"id:{getattr(candidate_phone, 'id', 0)}",
            f"brand:{getattr(candidate_phone, 'brand', '')}",
            f"model:{getattr(candidate_phone, 'model', '')}"
        ]
        
        # Create a hash of the key parts
        key_string = f"target:{','.join(target_key_parts)}|candidate:{','.join(candidate_key_parts)}"
        return f"highlights:{hashlib.md5(key_string.encode()).hexdigest()}"
    
    def _create_badge_prompt(self, phone: Phone) -> str:
        """
        Create a prompt for badge generation
        
        Args:
            phone: Phone object to analyze
            
        Returns:
            Prompt string
        """
        # Format phone specifications for the prompt
        specs = self._format_phone_specs(phone)
        
        # Determine phone category based on price
        category = self._determine_phone_category(phone)
        
        # Create prompt with enhanced context and guidelines for more diverse badge generation
        prompt = f"""Analyze this smartphone's specifications and determine the most appropriate badge from the following options:

AVAILABLE BADGES:
- "Popular" - For phones from popular brands with high overall scores (8.0+) or phones from major brands like Samsung, Apple, Xiaomi
- "Best Value" - For phones with excellent price-to-performance ratio, typically mid-range phones with high scores relative to price
- "New Launch" - For phones released within the last 3 months or marked as new releases
- "Battery King" - For phones with exceptional battery capacity (5000mAh+) or battery score (9.0+)
- "Top Camera" - For phones with outstanding camera capabilities (high MP count, multiple cameras, camera score 9.0+)
- "Premium" - For high-end flagship phones with top-tier specifications and price points (typically 60,000+ BDT)
- "Gaming Beast" - For phones with powerful processors, high RAM, and features optimized for gaming
- "Selfie Expert" - For phones with exceptional front camera capabilities
- "Compact Champion" - For smaller phones with good specs and portability
- "Display Marvel" - For phones with exceptional display quality, high refresh rates, or resolution
- "Storage King" - For phones with large storage capacity or expandable storage options
- "Performance Pro" - For phones with high-performance processors and smooth operation
- "Budget Hero" - For affordable phones that offer great features at a low price point
- "Multimedia Master" - For phones with excellent audio-visual capabilities for media consumption
- "Flagship Killer" - For mid-range phones that offer flagship-like features at lower prices
- "Design Icon" - For phones with exceptional build quality, materials, or aesthetic design

PHONE CATEGORY: {category.upper()}

PHONE SPECIFICATIONS:
{specs}

BADGE SELECTION GUIDELINES:
1. Choose only ONE badge that best represents this phone's standout feature or market position
2. For {category} phones, prioritize badges that highlight their key selling points in this segment
3. Consider the target audience for this phone category when selecting the badge
4. If multiple badges could apply, choose the one that would be most meaningful to potential buyers
5. Be creative and specific - avoid generic badges when a more specific one would better highlight the phone's strengths
6. Consider the phone's unique selling points compared to other phones in the same category
7. For phones with multiple strengths, choose the badge that represents the most distinctive feature

Return only the name of the single most appropriate badge from the list above, with no additional text or explanation.
"""
        return prompt
        
    def _determine_phone_category(self, phone: Phone) -> str:
        """
        Determine the category of a phone based on its specifications
        
        Args:
            phone: Phone object to analyze
            
        Returns:
            Category string (entry-level, budget, mid-range, premium, flagship)
        """
        # Use price as the primary indicator if available
        if hasattr(phone, 'price_original') and phone.price_original:
            if phone.price_original < 18000:
                return "entry-level"
            elif phone.price_original < 30000:
                return "budget"
            elif phone.price_original < 45000:
                return "mid-range"
            elif phone.price_original < 80000:
                return "premium"
            else:
                return "flagship"
        
        # If price is not available, use other indicators
        
        # Check for flagship indicators
        if (hasattr(phone, 'chipset') and phone.chipset and 
            any(x in phone.chipset.lower() for x in ['snapdragon 8', 'dimensity 9', 'a16', 'a17'])):
            return "flagship"
        
        # Check for premium indicators
        if (hasattr(phone, 'ram_gb') and phone.ram_gb and phone.ram_gb >= 12) or \
           (hasattr(phone, 'overall_device_score') and phone.overall_device_score and phone.overall_device_score >= 9.0):
            return "premium"
        
        # Check for mid-range indicators
        if (hasattr(phone, 'ram_gb') and phone.ram_gb and phone.ram_gb >= 8) or \
           (hasattr(phone, 'overall_device_score') and phone.overall_device_score and phone.overall_device_score >= 7.5):
            return "mid-range"
        
        # Default to budget
        return "budget"
    
    def _create_highlight_prompt(self, target_phone: Phone, candidate_phone: Phone) -> str:
        """
        Create a prompt for highlight generation
        
        Args:
            target_phone: The reference phone
            candidate_phone: The phone to generate highlights for
            
        Returns:
            Prompt string
        """
        # Format phone specifications for the prompt
        target_specs = self._format_phone_specs(target_phone)
        candidate_specs = self._format_phone_specs(candidate_phone)
        
        # Determine phone categories
        target_category = self._determine_phone_category(target_phone)
        candidate_category = self._determine_phone_category(candidate_phone)
        
        # Calculate price difference if available
        price_difference_text = ""
        if (hasattr(target_phone, 'price_original') and target_phone.price_original and 
            hasattr(candidate_phone, 'price_original') and candidate_phone.price_original and
            target_phone.price_original > 0):
            price_diff = target_phone.price_original - candidate_phone.price_original
            if price_diff != 0:
                percentage = abs(int(round((price_diff / target_phone.price_original) * 100)))
                if price_diff > 0:
                    price_difference_text = f"Phone B is {percentage}% more affordable than Phone A."
                else:
                    price_difference_text = f"Phone B is {percentage}% more expensive than Phone A."
        
        # Create enhanced prompt with better context and guidelines
        prompt = f"""Compare these two smartphones and identify the key advantages of Phone B over Phone A.

HIGHLIGHT CATEGORIES (with emoji):
- Display improvements (🔥) - Better screen quality, higher refresh rate, larger display, etc.
- Battery improvements (⚡) - Larger capacity, faster charging, better battery life, etc.
- Camera improvements (📸) - Better camera quality, more megapixels, additional features, etc.
- Performance improvements (🚀) - Faster processor, better gaming performance, etc.
- Value improvements (💰) - Better price-to-performance ratio, more affordable, etc.
- Design improvements (💎) - Better build quality, premium materials, etc.
- Storage improvements (💾) - More storage space, faster storage, etc.
- RAM improvements (🧠) - More RAM, faster memory, etc.

PHONE COMPARISON:
Phone A (Reference): {target_phone.brand} {target_phone.name} - {target_category.upper()} category
{target_specs}

Phone B (Candidate): {candidate_phone.brand} {candidate_phone.name} - {candidate_category.upper()} category
{candidate_specs}

{price_difference_text}

HIGHLIGHT GUIDELINES:
1. Identify ONLY the genuine advantages of Phone B over Phone A based on specifications
2. Focus on the most significant and meaningful differences between the phones
3. Be specific and quantitative where possible (e.g., "20% larger battery" instead of just "larger battery")
4. If there are no clear advantages for a category, do not include it
5. Prioritize highlights that would be most important to consumers in the {candidate_category} category
6. Each highlight must start with the appropriate emoji from the categories above

Return a list of up to 3 highlights in the format: "emoji Specific Description" (e.g. "🔥 120Hz smoother display").
Each highlight should be on a new line with no additional text or explanation.
"""
        return prompt
    
    def _format_phone_specs(self, phone: Phone) -> str:
        """
        Format phone specifications for inclusion in a prompt
        
        Args:
            phone: Phone object to format
            
        Returns:
            Formatted specifications string
        """
        specs = []
        
        # Basic information
        specs.append(f"- Name: {phone.name}")
        specs.append(f"- Brand: {phone.brand}")
        
        # Price
        if hasattr(phone, 'price_original') and phone.price_original:
            specs.append(f"- Price: ৳{phone.price_original}")
        elif hasattr(phone, 'price') and phone.price:
            specs.append(f"- Price: {phone.price}")
        
        # Release date
        if hasattr(phone, 'release_date_clean') and phone.release_date_clean:
            specs.append(f"- Release Date: {phone.release_date_clean}")
        elif hasattr(phone, 'release_date') and phone.release_date:
            specs.append(f"- Release Date: {phone.release_date}")
        
        # Battery
        if hasattr(phone, 'battery_capacity_numeric') and phone.battery_capacity_numeric:
            specs.append(f"- Battery: {phone.battery_capacity_numeric}mAh")
        elif hasattr(phone, 'capacity') and phone.capacity:
            specs.append(f"- Battery: {phone.capacity}")
        
        # Camera
        camera_specs = []
        if hasattr(phone, 'primary_camera_mp') and phone.primary_camera_mp:
            camera_specs.append(f"{phone.primary_camera_mp}MP main")
        if hasattr(phone, 'selfie_camera_mp') and phone.selfie_camera_mp:
            camera_specs.append(f"{phone.selfie_camera_mp}MP selfie")
        if camera_specs:
            specs.append(f"- Camera: {', '.join(camera_specs)}")
        
        # Performance
        if hasattr(phone, 'chipset') and phone.chipset:
            specs.append(f"- Performance: {phone.chipset}")
        
        # RAM
        if hasattr(phone, 'ram_gb') and phone.ram_gb:
            specs.append(f"- RAM: {phone.ram_gb}GB")
        elif hasattr(phone, 'ram') and phone.ram:
            specs.append(f"- RAM: {phone.ram}")
        
        # Storage
        if hasattr(phone, 'storage_gb') and phone.storage_gb:
            specs.append(f"- Storage: {phone.storage_gb}GB")
        elif hasattr(phone, 'internal_storage') and phone.internal_storage:
            specs.append(f"- Storage: {phone.internal_storage}")
        
        # Display
        display_specs = []
        if hasattr(phone, 'screen_size_numeric') and phone.screen_size_numeric:
            display_specs.append(f"{phone.screen_size_numeric}\"")
        if hasattr(phone, 'display_resolution') and phone.display_resolution:
            display_specs.append(f"{phone.display_resolution}")
        if hasattr(phone, 'refresh_rate_numeric') and phone.refresh_rate_numeric:
            display_specs.append(f"{phone.refresh_rate_numeric}Hz")
        if display_specs:
            specs.append(f"- Display: {' '.join(display_specs)}")
        
        # Scores
        scores = []
        if hasattr(phone, 'overall_device_score') and phone.overall_device_score:
            scores.append(f"Overall {phone.overall_device_score}/10")
        if hasattr(phone, 'camera_score') and phone.camera_score:
            scores.append(f"Camera {phone.camera_score}/10")
        if hasattr(phone, 'battery_score') and phone.battery_score:
            scores.append(f"Battery {phone.battery_score}/10")
        if hasattr(phone, 'performance_score') and phone.performance_score:
            scores.append(f"Performance {phone.performance_score}/10")
        if hasattr(phone, 'display_score') and phone.display_score:
            scores.append(f"Display {phone.display_score}/10")
        if scores:
            specs.append(f"- Scores: {', '.join(scores)}")
        
        return "\n".join(specs)
    
    async def _call_gemini_api(self, prompt: str, retries: int = 2) -> Optional[str]:
        """
        Make an API call to the Gemini service with retry logic
        
        Args:
            prompt: Prompt string to send to the API
            retries: Number of retries on failure (default: 2)
            
        Returns:
            Response string or None if the call fails
        """
        if not self.api_url:
            logger.error("Gemini API URL not configured")
            return None
        
        # Calculate exponential backoff delays for retries
        backoff_delays = [min(2 ** i, 10) for i in range(retries)]
        
        # Try the API call with retries
        for attempt, delay in enumerate(backoff_delays + [0]):  # +[0] for the initial attempt
            try:
                # Create async HTTP client with timeout
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    # Make API call
                    logger.debug(f"Calling Gemini API (attempt {attempt + 1}/{retries + 1})")
                    response = await client.post(
                        self.api_url,
                        json={"prompt": prompt},
                        headers={"Content-Type": "application/json"}
                    )
                    
                    # Check if response is successful
                    if response.status_code != 200:
                        logger.warning(f"Gemini API error: {response.status_code} - {response.text}")
                        
                        # Don't retry on client errors (4xx)
                        if 400 <= response.status_code < 500:
                            return None
                            
                        # For server errors (5xx), retry after backoff
                        if attempt < retries:
                            logger.info(f"Retrying after {delay} seconds...")
                            await asyncio.sleep(delay)
                            continue
                        
                        return None
                    
                    # Parse response
                    result = response.json()
                    
                    # Extract summary or result from response
                    if "summary" in result:
                        return result["summary"]
                    elif "result" in result:
                        return result["result"]
                    else:
                        logger.warning(f"Unexpected Gemini API response format: {result}")
                        return None
                    
            except httpx.RequestError as e:
                logger.warning(f"Gemini API request error: {str(e)}")
                if attempt < retries:
                    logger.info(f"Retrying after {delay} seconds...")
                    await asyncio.sleep(delay)
                    continue
                return None
                
            except httpx.TimeoutException:
                logger.warning(f"Gemini API request timed out (attempt {attempt + 1}/{retries + 1})")
                if attempt < retries:
                    logger.info(f"Retrying after {delay} seconds with increased timeout...")
                    # Increase timeout for next attempt
                    self.timeout = min(self.timeout * 1.5, 30)  # Max 30 seconds
                    await asyncio.sleep(delay)
                    continue
                return None
                
            except Exception as e:
                logger.error(f"Unexpected error calling Gemini API: {str(e)}")
                if attempt < retries:
                    logger.info(f"Retrying after {delay} seconds...")
                    await asyncio.sleep(delay)
                    continue
                return None
                
        # If we get here, all retries failed
        return None
    
    def _process_badge_response(self, response: str) -> Optional[str]:
        """
        Process the response from the Gemini API to extract a badge
        
        Args:
            response: Response string from the API
            
        Returns:
            Badge string or None if processing fails
        """
        if not response:
            return None
        
        # Clean up response
        response = response.strip()
        
        # Valid badge options with normalized versions
        valid_badges = {
            "popular": "Popular",
            "best value": "Best Value",
            "new launch": "New Launch",
            "battery king": "Battery King",
            "top camera": "Top Camera",
            "premium": "Premium",
            "gaming beast": "Gaming Beast",
            "selfie expert": "Selfie Expert",
            "compact champion": "Compact Champion",
            "display marvel": "Display Marvel",
            "storage king": "Storage King",
            "performance pro": "Performance Pro",
            "budget hero": "Budget Hero",
            "multimedia master": "Multimedia Master",
            "flagship killer": "Flagship Killer",
            "design icon": "Design Icon"
        }
        
        # Check for exact matches first
        response_lower = response.lower()
        for badge_key, badge_value in valid_badges.items():
            if response_lower == badge_key:
                return badge_value
        
        # If no exact match, check for partial matches
        for badge_key, badge_value in valid_badges.items():
            if badge_key in response_lower:
                return badge_value
        
        # If still no match, try more aggressive normalization
        normalized_response = ''.join(c.lower() for c in response if c.isalnum() or c.isspace())
        for badge_key, badge_value in valid_badges.items():
            normalized_badge = ''.join(c.lower() for c in badge_key if c.isalnum() or c.isspace())
            if normalized_badge in normalized_response:
                return badge_value
        
        # If no valid badge found, return None
        logger.warning(f"No valid badge found in response: {response}")
        return None
    
    def _generate_contextual_cache_key(self, query: str, context_phones: List[Phone] = None) -> str:
        """Generate cache key for contextual query processing"""
        context_key = ""
        if context_phones:
            phone_ids = sorted([str(getattr(phone, 'id', 0)) for phone in context_phones])
            context_key = f"context:{','.join(phone_ids)}"
        
        query_hash = hashlib.md5(query.encode()).hexdigest()
        return f"contextual:{query_hash}:{context_key}"
    
    def _create_contextual_query_prompt(self, query: str, context_phones: List[Phone] = None) -> str:
        """Create prompt for contextual query processing"""
        context_info = ""
        if context_phones:
            context_info = "\n\nCONTEXT PHONES (previously discussed):\n"
            for i, phone in enumerate(context_phones, 1):
                context_info += f"{i}. {phone.brand} {phone.name}"
                if hasattr(phone, 'price_original') and phone.price_original:
                    context_info += f" - ৳{phone.price_original}"
                context_info += "\n"
        
        prompt = f"""Analyze this user query and extract the following information in JSON format:

USER QUERY: "{query}"
{context_info}

REQUIRED OUTPUT FORMAT (JSON):
{{
    "intent_type": "comparison|alternative|specification|contextual_recommendation|recommendation|qa",
    "confidence": 0.0-1.0,
    "phone_references": [
        {{
            "text": "extracted phone name/reference",
            "type": "explicit|contextual|pronoun",
            "context_index": null or index if referring to context phone
        }}
    ],
    "comparison_criteria": ["price", "camera", "battery", "performance", "display", "storage"],
    "contextual_terms": ["better", "cheaper", "similar", "alternative", "like this", "that one"],
    "price_range": {{"min": null, "max": null}},
    "specific_features": ["feature1", "feature2"],
    "query_focus": "brief description of what user wants"
}}

INTENT TYPES:
- comparison: Comparing specific phones or features
- alternative: Looking for alternatives to a phone
- specification: Asking about specific phone details
- contextual_recommendation: Asking for recommendations based on context
- recommendation: General phone recommendations
- qa: Questions about phones or features

ANALYSIS GUIDELINES:
1. Identify explicit phone names mentioned in the query
2. Detect contextual references like "it", "that phone", "the first one"
3. Extract comparison criteria from the query
4. Determine price range if mentioned
5. Identify specific features of interest
6. Classify the overall intent with confidence score

Return only valid JSON with no additional text."""
        
        return prompt
    
    def _create_phone_extraction_prompt(self, query: str, available_phones: List[Phone] = None) -> str:
        """Create prompt for phone reference extraction"""
        phone_list = ""
        if available_phones:
            phone_list = "\n\nAVAILABLE PHONES:\n"
            for phone in available_phones[:20]:  # Limit to avoid prompt size issues
                phone_list += f"- {phone.brand} {phone.name}\n"
        
        prompt = f"""Extract phone references from this query and match them to available phones.

USER QUERY: "{query}"
{phone_list}

Return a JSON array of phone references:
[
    {{
        "extracted_text": "text found in query",
        "matched_phone": "exact phone name if matched",
        "confidence": 0.0-1.0,
        "match_type": "exact|partial|fuzzy|none"
    }}
]

MATCHING GUIDELINES:
1. Look for brand names (iPhone, Samsung, Xiaomi, etc.)
2. Look for model names and numbers
3. Consider common abbreviations and nicknames
4. Match against available phones if provided
5. Include confidence score for each match

Return only valid JSON array with no additional text."""
        
        return prompt
    
    def _create_intent_classification_prompt(self, query: str, context_phones: List[Phone] = None) -> str:
        """Create prompt for intent classification"""
        context_info = ""
        if context_phones:
            context_info = f"\n\nCONTEXT: User has been discussing {len(context_phones)} phones"
        
        prompt = f"""Classify the intent of this user query.

USER QUERY: "{query}"
{context_info}

Return JSON with intent classification:
{{
    "intent_type": "comparison|alternative|specification|contextual_recommendation|recommendation|qa",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation",
    "sub_intent": "specific sub-category if applicable"
}}

INTENT DEFINITIONS:
- comparison: Comparing phones or features ("iPhone vs Samsung", "which is better")
- alternative: Looking for alternatives ("similar to iPhone", "alternative to this")
- specification: Asking about specs ("what's the camera", "how much RAM")
- contextual_recommendation: Recommendations based on context ("something better", "cheaper option")
- recommendation: General recommendations ("best phone under 30k")
- qa: General questions ("what is 5G", "how does wireless charging work")

Return only valid JSON with no additional text."""
        
        return prompt
    
    def _process_contextual_response(self, response: str, query: str, context_phones: List[Phone] = None) -> Dict[str, Any]:
        """Process AI response for contextual query"""
        try:
            # Try to parse JSON response
            result = json.loads(response.strip())
            
            # Validate required fields
            if 'intent_type' not in result:
                result['intent_type'] = 'unknown'
            if 'confidence' not in result:
                result['confidence'] = 0.5
            if 'phone_references' not in result:
                result['phone_references'] = []
            
            # Ensure confidence is within valid range
            result['confidence'] = max(0.0, min(1.0, float(result.get('confidence', 0.5))))
            
            return result
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse contextual response as JSON: {e}")
            # Fallback processing
            return self._fallback_contextual_processing(query, context_phones)
    
    def _process_phone_extraction_response(self, response: str, available_phones: List[Phone] = None) -> List[Dict[str, Any]]:
        """Process AI response for phone extraction"""
        try:
            # Try to parse JSON response
            result = json.loads(response.strip())
            
            if not isinstance(result, list):
                return []
            
            # Validate each phone reference
            validated_references = []
            for ref in result:
                if isinstance(ref, dict) and 'extracted_text' in ref:
                    validated_ref = {
                        'extracted_text': ref.get('extracted_text', ''),
                        'matched_phone': ref.get('matched_phone', ''),
                        'confidence': max(0.0, min(1.0, float(ref.get('confidence', 0.5)))),
                        'match_type': ref.get('match_type', 'none')
                    }
                    validated_references.append(validated_ref)
            
            return validated_references
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse phone extraction response as JSON: {e}")
            # Fallback to regex-based extraction
            return self._fallback_phone_extraction(response, available_phones)
    
    def _process_intent_classification_response(self, response: str) -> Dict[str, Any]:
        """Process AI response for intent classification"""
        try:
            # Try to parse JSON response
            result = json.loads(response.strip())
            
            # Validate required fields
            if 'intent_type' not in result:
                result['intent_type'] = 'unknown'
            if 'confidence' not in result:
                result['confidence'] = 0.5
            
            # Ensure confidence is within valid range
            result['confidence'] = max(0.0, min(1.0, float(result.get('confidence', 0.5))))
            
            return result
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse intent classification response as JSON: {e}")
            # Fallback to rule-based classification
            return self._fallback_intent_classification(response)
    
    def _fallback_contextual_processing(self, query: str, context_phones: List[Phone] = None) -> Dict[str, Any]:
        """Fallback contextual processing when AI is unavailable"""
        logger.info("Using fallback contextual processing")
        
        # Basic intent classification using keywords
        intent_type = "unknown"
        confidence = 0.3  # Lower confidence for fallback
        
        query_lower = query.lower()
        
        # Intent classification rules
        if any(word in query_lower for word in ['vs', 'versus', 'compare', 'comparison', 'better', 'difference']):
            intent_type = "comparison"
        elif any(word in query_lower for word in ['alternative', 'similar', 'like', 'instead']):
            intent_type = "alternative"
        elif any(word in query_lower for word in ['recommend', 'suggest', 'best', 'good']):
            intent_type = "recommendation"
        elif any(word in query_lower for word in ['what', 'how', 'when', 'why', 'specs', 'specification']):
            intent_type = "qa"
        
        # Basic phone reference extraction using regex
        phone_references = self._fallback_phone_extraction(query, context_phones)
        
        # Basic comparison criteria detection
        comparison_criteria = []
        criteria_keywords = {
            'price': ['price', 'cost', 'expensive', 'cheap', 'affordable'],
            'camera': ['camera', 'photo', 'picture', 'selfie', 'video'],
            'battery': ['battery', 'charge', 'power', 'mah'],
            'performance': ['performance', 'speed', 'fast', 'processor', 'ram'],
            'display': ['display', 'screen', 'size', 'resolution'],
            'storage': ['storage', 'memory', 'gb', 'space']
        }
        
        for criterion, keywords in criteria_keywords.items():
            if any(keyword in query_lower for keyword in keywords):
                comparison_criteria.append(criterion)
        
        return {
            'intent_type': intent_type,
            'confidence': confidence,
            'phone_references': phone_references,
            'comparison_criteria': comparison_criteria,
            'contextual_terms': [],
            'price_range': {'min': None, 'max': None},
            'specific_features': [],
            'query_focus': query[:100] + "..." if len(query) > 100 else query
        }
    
    def _fallback_phone_extraction(self, query: str, available_phones: List[Phone] = None) -> List[Dict[str, Any]]:
        """Fallback phone extraction using regex patterns"""
        logger.info("Using fallback phone extraction")
        
        references = []
        query_lower = query.lower()
        
        # Common phone brand patterns
        brand_patterns = {
            'iphone': r'\biphone\s*(\d+\s*(?:pro|plus|mini|max)?)',
            'samsung': r'\bsamsung\s*(?:galaxy\s*)?([a-z]\d+)',
            'xiaomi': r'\bxiaomi\s*(?:redmi\s*)?([a-z0-9\s]+)',
            'oneplus': r'\boneplus\s*(\d+[a-z]*)',
            'oppo': r'\boppo\s*([a-z0-9\s]+)',
            'vivo': r'\bvivo\s*([a-z0-9\s]+)',
            'realme': r'\brealme\s*([a-z0-9\s]+)',
            'huawei': r'\bhuawei\s*([a-z0-9\s]+)'
        }
        
        for brand, pattern in brand_patterns.items():
            matches = re.finditer(pattern, query_lower)
            for match in matches:
                extracted_text = match.group(0)
                references.append({
                    'extracted_text': extracted_text,
                    'matched_phone': '',
                    'confidence': 0.7,
                    'match_type': 'partial'
                })
        
        # Contextual references
        contextual_patterns = [
            r'\bit\b', r'\bthat\s+(?:phone|one)\b', r'\bthis\s+(?:phone|one)\b',
            r'\bthe\s+(?:first|second|third)\s+(?:phone|one)\b'
        ]
        
        for pattern in contextual_patterns:
            if re.search(pattern, query_lower):
                references.append({
                    'extracted_text': re.search(pattern, query_lower).group(0),
                    'matched_phone': '',
                    'confidence': 0.5,
                    'match_type': 'contextual'
                })
        
        return references
    
    def _fallback_intent_classification(self, query: str) -> Dict[str, Any]:
        """Fallback intent classification using rule-based approach"""
        logger.info("Using fallback intent classification")
        
        query_lower = query.lower()
        
        # Intent classification rules with confidence scores
        if any(word in query_lower for word in ['vs', 'versus', 'compare', 'comparison', 'better than', 'difference between']):
            return {'intent_type': 'comparison', 'confidence': 0.8, 'reasoning': 'Contains comparison keywords'}
        elif any(word in query_lower for word in ['alternative', 'similar to', 'like', 'instead of', 'replace']):
            return {'intent_type': 'alternative', 'confidence': 0.7, 'reasoning': 'Contains alternative keywords'}
        elif any(word in query_lower for word in ['recommend', 'suggest', 'best phone', 'good phone', 'should i buy']):
            return {'intent_type': 'recommendation', 'confidence': 0.7, 'reasoning': 'Contains recommendation keywords'}
        elif any(word in query_lower for word in ['what is', 'how much', 'specs', 'specification', 'details']):
            return {'intent_type': 'specification', 'confidence': 0.6, 'reasoning': 'Contains specification keywords'}
        elif any(word in query_lower for word in ['what', 'how', 'when', 'why', 'explain']):
            return {'intent_type': 'qa', 'confidence': 0.6, 'reasoning': 'Contains question keywords'}
        else:
            return {'intent_type': 'unknown', 'confidence': 0.3, 'reasoning': 'No clear intent pattern found'}
    
    def _process_highlight_response(self, response: str) -> List[str]:
        """
        Process the response from the Gemini API to extract highlights
        
        Args:
            response: Response string from the API
            
        Returns:
            List of highlight strings
        """
        if not response:
            return []
        
        # Split response into lines
        lines = response.strip().split("\n")
        
        # Filter valid highlights (must start with an emoji)
        valid_highlights = []
        emoji_prefixes = ["🔥", "⚡", "📸", "🚀", "💰", "💎", "💾", "🧠"]
        
        # Map of emoji categories for validation
        emoji_categories = {
            "🔥": ["display", "screen", "refresh", "resolution", "ppi", "inch", "hz", "amoled", "oled", "lcd"],
            "⚡": ["battery", "mah", "charging", "fast", "power", "capacity", "wireless", "life"],
            "📸": ["camera", "mp", "megapixel", "photo", "video", "lens", "zoom", "ultra", "wide", "macro", "selfie"],
            "🚀": ["performance", "processor", "chipset", "cpu", "gpu", "gaming", "speed", "fast", "snapdragon", "dimensity", "exynos"],
            "💰": ["value", "price", "affordable", "cheaper", "cost", "saving", "budget", "expensive", "worth"],
            "💎": ["design", "build", "premium", "glass", "metal", "slim", "light", "thin", "waterproof", "ip"],
            "💾": ["storage", "gb", "tb", "expandable", "memory", "microsd"],
            "🧠": ["ram", "memory", "multitasking"]
        }
        
        for line in lines:
            line = line.strip()
            
            # Check if line starts with a valid emoji
            emoji_match = None
            for emoji in emoji_prefixes:
                if line.startswith(emoji):
                    emoji_match = emoji
                    break
            
            if not emoji_match:
                continue
            
            # Check if the highlight text is relevant to the emoji category
            highlight_text = line[len(emoji_match):].strip().lower()
            
            # Skip if highlight is too short
            if len(highlight_text) < 5:
                continue
            
            # Check if highlight contains relevant keywords for the emoji category
            is_relevant = False
            for keyword in emoji_categories[emoji_match]:
                if keyword in highlight_text:
                    is_relevant = True
                    break
            
            # If no specific keywords found, accept it anyway if it's not too generic
            if not is_relevant and len(highlight_text) > 10:
                is_relevant = True
            
            if is_relevant:
                # Clean up any markdown or extra formatting
                clean_highlight = emoji_match + " " + highlight_text.capitalize()
                valid_highlights.append(clean_highlight)
        
        # Limit to top 3 highlights
        return valid_highlights[:3]