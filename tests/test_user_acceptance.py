"""
User Acceptance Tests for Contextual Query System
"""

import pytest
import asyncio
import uuid
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

from app.services.contextual_query_processor import ContextualQueryProcessor
from app.models.phone import Phone
from app.models.contextual_models import ResolvedPhone

class TestConversationalFlowValidation:
    """Test realistic conversational flows that users would have"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.query_processor = ContextualQueryProcessor()
        self.mock_db = Mock()
        self.session_id = str(uuid.uuid4())
        
        # Create realistic mock phones
        self.mock_phones = self._create_realistic_phones()
        self._setup_mock_responses()
    
    def _create_realistic_phones(self):
        """Create realistic phone objects for testing"""
        phones = []
        
        # iPhone 14 Pro
        iphone = Mock(spec=Phone)
        iphone.id = 1
        iphone.name = "iPhone 14 Pro"
        iphone.brand = "Apple"
        iphone.model = "14 Pro"
        iphone.price_original = 120000
        iphone.battery_capacity_numeric = 3200
        iphone.primary_camera_mp = 48
        iphone.selfie_camera_mp = 12
        iphone.ram_gb = 6
        iphone.storage_gb = 128
        iphone.screen_size_numeric = 6.1
        iphone.overall_device_score = 9.2
        iphone.camera_score = 9.5
        iphone.battery_score = 8.5
        iphone.performance_score = 9.8
        iphone.display_score = 9.3
        iphone.chipset = "A16 Bionic"
        iphone.release_date_clean = "2022-09-16"
        phones.append(iphone)
        
        # Samsung Galaxy S23 Ultra
        samsung = Mock(spec=Phone)
        samsung.id = 2
        samsung.name = "Galaxy S23 Ultra"
        samsung.brand = "Samsung"
        samsung.model = "S23 Ultra"
        samsung.price_original = 110000
        samsung.battery_capacity_numeric = 5000
        samsung.primary_camera_mp = 200
        samsung.selfie_camera_mp = 12
        samsung.ram_gb = 12
        samsung.storage_gb = 256
        samsung.screen_size_numeric = 6.8
        samsung.overall_device_score = 9.0
        samsung.camera_score = 9.8
        samsung.battery_score = 9.2
        samsung.performance_score = 9.3
        samsung.display_score = 9.4
        samsung.chipset = "Snapdragon 8 Gen 2"
        samsung.release_date_clean = "2023-02-17"
        phones.append(samsung)
        
        # Xiaomi 13 Pro
        xiaomi = Mock(spec=Phone)
        xiaomi.id = 3
        xiaomi.name = "13 Pro"
        xiaomi.brand = "Xiaomi"
        xiaomi.model = "13 Pro"
        xiaomi.price_original = 75000
        xiaomi.battery_capacity_numeric = 4820
        xiaomi.primary_camera_mp = 50
        xiaomi.selfie_camera_mp = 32
        xiaomi.ram_gb = 12
        xiaomi.storage_gb = 256
        xiaomi.screen_size_numeric = 6.73
        xiaomi.overall_device_score = 8.7
        xiaomi.camera_score = 8.9
        xiaomi.battery_score = 8.8
        xiaomi.performance_score = 8.9
        xiaomi.display_score = 8.6
        xiaomi.chipset = "Snapdragon 8 Gen 2"
        xiaomi.release_date_clean = "2022-12-11"
        phones.append(xiaomi)
        
        # OnePlus 11
        oneplus = Mock(spec=Phone)
        oneplus.id = 4
        oneplus.name = "OnePlus 11"
        oneplus.brand = "OnePlus"
        oneplus.model = "11"
        oneplus.price_original = 65000
        oneplus.battery_capacity_numeric = 5000
        oneplus.primary_camera_mp = 50
        oneplus.selfie_camera_mp = 16
        oneplus.ram_gb = 8
        oneplus.storage_gb = 128
        oneplus.screen_size_numeric = 6.7
        oneplus.overall_device_score = 8.5
        oneplus.camera_score = 8.3
        oneplus.battery_score = 8.9
        oneplus.performance_score = 9.1
        oneplus.display_score = 8.7
        oneplus.chipset = "Snapdragon 8 Gen 2"
        oneplus.release_date_clean = "2023-02-07"
        phones.append(oneplus)
        
        # Google Pixel 7 Pro
        pixel = Mock(spec=Phone)
        pixel.id = 5
        pixel.name = "Pixel 7 Pro"
        pixel.brand = "Google"
        pixel.model = "7 Pro"
        pixel.price_original = 85000
        pixel.battery_capacity_numeric = 5000
        pixel.primary_camera_mp = 50
        pixel.selfie_camera_mp = 10.8
        pixel.ram_gb = 12
        pixel.storage_gb = 128
        pixel.screen_size_numeric = 6.7
        pixel.overall_device_score = 8.8
        pixel.camera_score = 9.6
        pixel.battery_score = 8.4
        pixel.performance_score = 8.2
        pixel.display_score = 8.9
        pixel.chipset = "Google Tensor G2"
        pixel.release_date_clean = "2022-10-13"
        phones.append(pixel)
        
        return phones
    
    def _setup_mock_responses(self):
        """Set up mock database responses"""
        mock_query = Mock()
        mock_query.filter.return_value.all.return_value = self.mock_phones
        mock_query.filter.return_value.first.return_value = self.mock_phones[0]
        mock_query.filter.return_value.limit.return_value.all.return_value = self.mock_phones[:3]
        self.mock_db.query.return_value = mock_query
    
    @pytest.mark.asyncio
    async def test_phone_shopping_conversation_flow(self):
        """Test a realistic phone shopping conversation"""
        conversation = [
            {
                "query": "I'm looking for a new phone with a great camera under 100000 taka",
                "expected_intent": "recommendation",
                "expected_criteria": ["camera"],
                "expected_price_max": 100000
            },
            {
                "query": "How does the iPhone 14 Pro compare to the Samsung Galaxy S23 Ultra?",
                "expected_intent": "comparison",
                "expected_phones": ["iPhone 14 Pro", "Samsung Galaxy S23 Ultra"],
                "expected_criteria": ["camera", "performance", "battery"]
            },
            {
                "query": "What about the battery life of the iPhone?",
                "expected_intent": "specification",
                "expected_contextual": True,
                "expected_feature": "battery"
            },
            {
                "query": "Show me something similar to the iPhone but cheaper",
                "expected_intent": "alternative",
                "expected_contextual": True,
                "expected_criteria": ["price"]
            },
            {
                "query": "Is the Xiaomi 13 Pro a good alternative?",
                "expected_intent": "comparison",
                "expected_phones": ["Xiaomi 13 Pro"],
                "expected_contextual": True
            }
        ]
        
        conversation_results = []
        
        for i, turn in enumerate(conversation):
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                # Mock AI response based on expected intent
                mock_ai.return_value = self._create_mock_ai_response(turn)
                
                with patch.object(self.query_processor.phone_resolver, 'resolve_phone_references') as mock_resolver:
                    # Mock phone resolution
                    mock_resolver.return_value = self._create_mock_resolved_phones(turn)
                    
                    with patch.object(self.query_processor.filter_generator, 'generate_contextual_filters') as mock_filters:
                        # Mock filter generation
                        mock_filters.return_value = self._create_mock_filters(turn)
                        
                        # Process the query
                        result = await self.query_processor.process_contextual_query(
                            query=turn["query"],
                            session_id=self.session_id,
                            db=self.mock_db
                        )
                        
                        conversation_results.append({
                            "turn": i + 1,
                            "query": turn["query"],
                            "result": result,
                            "expected": turn
                        })
                        
                        # Validate the result
                        self._validate_conversation_turn(result, turn, i + 1)
        
        # Validate overall conversation flow
        self._validate_conversation_coherence(conversation_results)
    
    def _create_mock_ai_response(self, turn):
        """Create mock AI response based on conversation turn"""
        phone_references = []
        
        if "expected_phones" in turn:
            for phone_name in turn["expected_phones"]:
                phone_references.append({
                    "text": phone_name,
                    "type": "explicit",
                    "context_index": None
                })
        
        if turn.get("expected_contextual", False):
            phone_references.append({
                "text": "contextual reference",
                "type": "contextual",
                "context_index": 0
            })
        
        return {
            "intent_type": turn["expected_intent"],
            "confidence": 0.85,
            "phone_references": phone_references,
            "comparison_criteria": turn.get("expected_criteria", []),
            "contextual_terms": ["contextual"] if turn.get("expected_contextual", False) else [],
            "price_range": {
                "min": turn.get("expected_price_min"),
                "max": turn.get("expected_price_max")
            },
            "specific_features": [turn.get("expected_feature")] if turn.get("expected_feature") else [],
            "query_focus": f"Turn {turn.get('turn', 1)} query"
        }
    
    def _create_mock_resolved_phones(self, turn):
        """Create mock resolved phones based on conversation turn"""
        resolved_phones = []
        
        if "expected_phones" in turn:
            for phone_name in turn["expected_phones"]:
                # Find matching mock phone
                matching_phone = None
                for phone in self.mock_phones:
                    if phone_name.lower() in phone.name.lower():
                        matching_phone = phone
                        break
                
                if matching_phone:
                    resolved_phones.append(ResolvedPhone(
                        original_text=phone_name,
                        resolved_phone=matching_phone,
                        confidence=0.9,
                        match_type="exact"
                    ))
        
        if turn.get("expected_contextual", False):
            # Use first phone as contextual reference
            resolved_phones.append(ResolvedPhone(
                original_text="contextual reference",
                resolved_phone=self.mock_phones[0],
                confidence=0.8,
                match_type="contextual"
            ))
        
        return resolved_phones
    
    def _create_mock_filters(self, turn):
        """Create mock filters based on conversation turn"""
        base_filters = {}
        comparison_filters = {}
        
        if "expected_price_max" in turn:
            base_filters["price_max"] = turn["expected_price_max"]
        
        if "expected_phones" in turn:
            phone_ids = [i + 1 for i in range(len(turn["expected_phones"]))]
            comparison_filters["phone_ids"] = phone_ids
        
        return {
            "base_filters": base_filters,
            "comparison_filters": comparison_filters,
            "sort_criteria": [("overall_device_score", "desc")]
        }
    
    def _validate_conversation_turn(self, result, expected, turn_number):
        """Validate a single conversation turn"""
        assert result is not None, f"Turn {turn_number}: No result returned"
        assert "intent" in result, f"Turn {turn_number}: Missing intent in result"
        assert "phones" in result, f"Turn {turn_number}: Missing phones in result"
        assert "metadata" in result, f"Turn {turn_number}: Missing metadata in result"
        
        # Validate intent
        assert result["intent"]["type"] == expected["expected_intent"], \
            f"Turn {turn_number}: Expected intent {expected['expected_intent']}, got {result['intent']['type']}"
        
        # Validate confidence
        assert result["intent"]["confidence"] > 0.5, \
            f"Turn {turn_number}: Low confidence {result['intent']['confidence']}"
        
        # Validate contextual processing
        if expected.get("expected_contextual", False):
            assert "contextual_terms" in result["metadata"], \
                f"Turn {turn_number}: Missing contextual terms in metadata"
            assert len(result["metadata"]["contextual_terms"]) > 0, \
                f"Turn {turn_number}: No contextual terms found"
        
        # Validate criteria
        if "expected_criteria" in expected:
            assert "comparison_criteria" in result["metadata"], \
                f"Turn {turn_number}: Missing comparison criteria"
            for criterion in expected["expected_criteria"]:
                assert criterion in result["metadata"]["comparison_criteria"], \
                    f"Turn {turn_number}: Missing criterion {criterion}"
    
    def _validate_conversation_coherence(self, conversation_results):
        """Validate overall conversation coherence"""
        assert len(conversation_results) > 0, "No conversation results to validate"
        
        # Check that all turns have the same session ID
        session_ids = set()
        for result in conversation_results:
            if "session_id" in result["result"]["metadata"]:
                session_ids.add(result["result"]["metadata"]["session_id"])
        
        assert len(session_ids) <= 1, "Inconsistent session IDs across conversation"
        
        # Check that contextual turns reference previous context
        for i, result in enumerate(conversation_results[1:], 1):  # Skip first turn
            if result["expected"].get("expected_contextual", False):
                assert "contextual_terms" in result["result"]["metadata"], \
                    f"Turn {i + 1}: Contextual turn missing contextual terms"
    
    @pytest.mark.asyncio
    async def test_technical_specification_conversation(self):
        """Test a conversation focused on technical specifications"""
        conversation = [
            {
                "query": "Tell me about the iPhone 14 Pro specifications",
                "expected_intent": "specification",
                "expected_phones": ["iPhone 14 Pro"]
            },
            {
                "query": "What's the camera quality like?",
                "expected_intent": "specification",
                "expected_contextual": True,
                "expected_feature": "camera"
            },
            {
                "query": "How does it compare to the Samsung Galaxy S23 Ultra camera?",
                "expected_intent": "comparison",
                "expected_contextual": True,
                "expected_phones": ["Samsung Galaxy S23 Ultra"],
                "expected_criteria": ["camera"]
            },
            {
                "query": "What about battery life comparison?",
                "expected_intent": "comparison",
                "expected_contextual": True,
                "expected_criteria": ["battery"]
            }
        ]
        
        for i, turn in enumerate(conversation):
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = self._create_mock_ai_response(turn)
                
                with patch.object(self.query_processor.phone_resolver, 'resolve_phone_references') as mock_resolver:
                    mock_resolver.return_value = self._create_mock_resolved_phones(turn)
                    
                    with patch.object(self.query_processor.filter_generator, 'generate_contextual_filters') as mock_filters:
                        mock_filters.return_value = self._create_mock_filters(turn)
                        
                        result = await self.query_processor.process_contextual_query(
                            query=turn["query"],
                            session_id=f"{self.session_id}_tech",
                            db=self.mock_db
                        )
                        
                        self._validate_conversation_turn(result, turn, i + 1)
    
    @pytest.mark.asyncio
    async def test_price_comparison_conversation(self):
        """Test a conversation focused on price comparisons"""
        conversation = [
            {
                "query": "What are the best phones under 80000 taka?",
                "expected_intent": "recommendation",
                "expected_price_max": 80000
            },
            {
                "query": "How does the Xiaomi 13 Pro compare to the OnePlus 11?",
                "expected_intent": "comparison",
                "expected_phones": ["Xiaomi 13 Pro", "OnePlus 11"]
            },
            {
                "query": "Which one offers better value for money?",
                "expected_intent": "comparison",
                "expected_contextual": True,
                "expected_criteria": ["price"]
            },
            {
                "query": "Are there any cheaper alternatives to the Xiaomi?",
                "expected_intent": "alternative",
                "expected_contextual": True,
                "expected_criteria": ["price"]
            }
        ]
        
        for i, turn in enumerate(conversation):
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = self._create_mock_ai_response(turn)
                
                with patch.object(self.query_processor.phone_resolver, 'resolve_phone_references') as mock_resolver:
                    mock_resolver.return_value = self._create_mock_resolved_phones(turn)
                    
                    with patch.object(self.query_processor.filter_generator, 'generate_contextual_filters') as mock_filters:
                        mock_filters.return_value = self._create_mock_filters(turn)
                        
                        result = await self.query_processor.process_contextual_query(
                            query=turn["query"],
                            session_id=f"{self.session_id}_price",
                            db=self.mock_db
                        )
                        
                        self._validate_conversation_turn(result, turn, i + 1)
    
    @pytest.mark.asyncio
    async def test_brand_preference_conversation(self):
        """Test a conversation with brand preferences"""
        conversation = [
            {
                "query": "I'm looking for a Samsung phone with good camera",
                "expected_intent": "recommendation",
                "expected_criteria": ["camera"]
            },
            {
                "query": "How does the Galaxy S23 Ultra compare to iPhone 14 Pro?",
                "expected_intent": "comparison",
                "expected_phones": ["Galaxy S23 Ultra", "iPhone 14 Pro"]
            },
            {
                "query": "I prefer Android phones, what other options do I have?",
                "expected_intent": "alternative",
                "expected_contextual": True
            },
            {
                "query": "What about Google Pixel phones?",
                "expected_intent": "specification",
                "expected_phones": ["Google Pixel"]
            }
        ]
        
        for i, turn in enumerate(conversation):
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = self._create_mock_ai_response(turn)
                
                with patch.object(self.query_processor.phone_resolver, 'resolve_phone_references') as mock_resolver:
                    mock_resolver.return_value = self._create_mock_resolved_phones(turn)
                    
                    with patch.object(self.query_processor.filter_generator, 'generate_contextual_filters') as mock_filters:
                        mock_filters.return_value = self._create_mock_filters(turn)
                        
                        result = await self.query_processor.process_contextual_query(
                            query=turn["query"],
                            session_id=f"{self.session_id}_brand",
                            db=self.mock_db
                        )
                        
                        self._validate_conversation_turn(result, turn, i + 1)

class TestUserExperienceScenarios:
    """Test user experience scenarios and edge cases"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.query_processor = ContextualQueryProcessor()
        self.mock_db = Mock()
    
    @pytest.mark.asyncio
    async def test_confused_user_scenario(self):
        """Test handling of confused or unclear user queries"""
        unclear_queries = [
            "I don't know what phone to buy",
            "Something good but not too expensive",
            "What do you recommend?",
            "I'm confused about all these options"
        ]
        
        for query in unclear_queries:
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    "intent_type": "recommendation",
                    "confidence": 0.4,  # Lower confidence for unclear queries
                    "phone_references": [],
                    "comparison_criteria": [],
                    "contextual_terms": [],
                    "price_range": {"min": None, "max": None},
                    "specific_features": [],
                    "query_focus": "Unclear user request"
                }
                
                result = await self.query_processor.process_contextual_query(
                    query=query,
                    session_id="confused_user",
                    db=self.mock_db
                )
                
                # Should still provide helpful response
                assert result is not None
                assert result["intent"]["type"] == "recommendation"
                # Lower confidence is acceptable for unclear queries
                assert result["intent"]["confidence"] >= 0.3
    
    @pytest.mark.asyncio
    async def test_expert_user_scenario(self):
        """Test handling of expert users with technical queries"""
        technical_queries = [
            "Compare the Snapdragon 8 Gen 2 performance in Samsung S23 Ultra vs OnePlus 11",
            "What's the difference in camera sensor sizes between iPhone 14 Pro and Pixel 7 Pro?",
            "Which phone has better GPU performance for gaming at 120fps?",
            "Compare the charging speeds and battery degradation patterns"
        ]
        
        for query in technical_queries:
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    "intent_type": "comparison",
                    "confidence": 0.9,  # High confidence for technical queries
                    "phone_references": [
                        {"text": "technical phone reference", "type": "explicit", "context_index": None}
                    ],
                    "comparison_criteria": ["performance", "camera", "battery"],
                    "contextual_terms": [],
                    "price_range": {"min": None, "max": None},
                    "specific_features": ["technical_specs"],
                    "query_focus": "Technical comparison"
                }
                
                result = await self.query_processor.process_contextual_query(
                    query=query,
                    session_id="expert_user",
                    db=self.mock_db
                )
                
                # Should handle technical queries with high confidence
                assert result is not None
                assert result["intent"]["confidence"] >= 0.8
                assert len(result["metadata"]["comparison_criteria"]) > 0
    
    @pytest.mark.asyncio
    async def test_budget_conscious_user_scenario(self):
        """Test handling of budget-conscious users"""
        budget_queries = [
            "What's the cheapest phone with decent camera?",
            "I need a phone under 30000 taka",
            "Show me the best value phones",
            "Is there anything cheaper than the Xiaomi 13 Pro with similar features?"
        ]
        
        for query in budget_queries:
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    "intent_type": "recommendation" if "cheapest" in query or "under" in query else "alternative",
                    "confidence": 0.85,
                    "phone_references": [],
                    "comparison_criteria": ["price"],
                    "contextual_terms": ["cheaper", "budget"] if "cheaper" in query else [],
                    "price_range": {"min": None, "max": 30000 if "30000" in query else None},
                    "specific_features": ["value"],
                    "query_focus": "Budget-conscious query"
                }
                
                result = await self.query_processor.process_contextual_query(
                    query=query,
                    session_id="budget_user",
                    db=self.mock_db
                )
                
                # Should prioritize price considerations
                assert result is not None
                assert "price" in result["metadata"]["comparison_criteria"]
                if "30000" in query:
                    assert result["metadata"]["filters"]["price_max"] == 30000
    
    @pytest.mark.asyncio
    async def test_feature_focused_user_scenario(self):
        """Test handling of users focused on specific features"""
        feature_queries = [
            "I need a phone with the best camera for photography",
            "Which phone has the longest battery life?",
            "What's the best gaming phone available?",
            "I want a phone with excellent display quality"
        ]
        
        expected_features = ["camera", "battery", "performance", "display"]
        
        for query, feature in zip(feature_queries, expected_features):
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    "intent_type": "recommendation",
                    "confidence": 0.88,
                    "phone_references": [],
                    "comparison_criteria": [feature],
                    "contextual_terms": [],
                    "price_range": {"min": None, "max": None},
                    "specific_features": [feature],
                    "query_focus": f"Feature-focused query: {feature}"
                }
                
                result = await self.query_processor.process_contextual_query(
                    query=query,
                    session_id="feature_user",
                    db=self.mock_db
                )
                
                # Should focus on the specific feature
                assert result is not None
                assert feature in result["metadata"]["comparison_criteria"]
                assert feature in result["metadata"]["specific_features"]

class TestErrorRecoveryScenarios:
    """Test error recovery and graceful degradation scenarios"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.query_processor = ContextualQueryProcessor()
        self.mock_db = Mock()
    
    @pytest.mark.asyncio
    async def test_ai_service_failure_recovery(self):
        """Test recovery when AI service fails"""
        query = "Compare iPhone with Samsung"
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            mock_ai.side_effect = Exception("AI service unavailable")
            
            # Should still process query using fallback mechanisms
            result = await self.query_processor.process_contextual_query(
                query=query,
                session_id="ai_failure_test",
                db=self.mock_db
            )
            
            # Should return a result even with AI failure
            assert result is not None
            assert "error_handled" in result["metadata"] or result["intent"]["confidence"] < 0.8
    
    @pytest.mark.asyncio
    async def test_phone_resolution_failure_recovery(self):
        """Test recovery when phone resolution fails"""
        query = "Tell me about the NonExistentPhone 2024"
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = {
                "intent_type": "specification",
                "confidence": 0.8,
                "phone_references": [
                    {"text": "NonExistentPhone 2024", "type": "explicit", "context_index": None}
                ],
                "comparison_criteria": [],
                "contextual_terms": [],
                "price_range": {"min": None, "max": None},
                "specific_features": [],
                "query_focus": "Non-existent phone query"
            }
            
            with patch.object(self.query_processor.phone_resolver, 'resolve_phone_references') as mock_resolver:
                mock_resolver.return_value = []  # No phones resolved
                
                result = await self.query_processor.process_contextual_query(
                    query=query,
                    session_id="phone_resolution_failure",
                    db=self.mock_db
                )
                
                # Should handle gracefully with helpful error message
                assert result is not None
                assert "error" in result or len(result["phones"]) == 0
    
    @pytest.mark.asyncio
    async def test_context_corruption_recovery(self):
        """Test recovery when conversation context is corrupted"""
        query = "Tell me more about that phone we discussed"
        
        with patch.object(self.query_processor.context_manager, 'get_conversation_context') as mock_context:
            mock_context.return_value = None  # Corrupted context
            
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    "intent_type": "specification",
                    "confidence": 0.3,  # Low confidence due to missing context
                    "phone_references": [
                        {"text": "that phone", "type": "contextual", "context_index": None}
                    ],
                    "comparison_criteria": [],
                    "contextual_terms": ["that phone"],
                    "price_range": {"min": None, "max": None},
                    "specific_features": [],
                    "query_focus": "Contextual query without context"
                }
                
                result = await self.query_processor.process_contextual_query(
                    query=query,
                    session_id="context_corruption_test",
                    db=self.mock_db
                )
                
                # Should handle missing context gracefully
                assert result is not None
                # Low confidence is expected when context is missing
                assert result["intent"]["confidence"] < 0.5 or "context_missing" in result["metadata"]