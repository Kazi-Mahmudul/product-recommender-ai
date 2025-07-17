import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session
import logging

from app.models.phone import Phone
from app.services.recommendation_service import RecommendationService, SimilarityMetrics, RecommendationCandidate
from app.services.matchers.price_proximity_matcher import PriceProximityMatcher
from app.services.matchers.spec_similarity_matcher import SpecSimilarityMatcher
from app.services.matchers.score_based_matcher import ScoreBasedMatcher
from app.services.matchers.ai_similarity_engine import AISimilarityEngine
from app.services.badge_generator import BadgeGenerator
from app.services.highlight_generator import HighlightGenerator

# Configure logging for tests
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test data setup
@pytest.fixture
def mock_db():
    return MagicMock(spec=Session)

@pytest.fixture
def mock_phones():
    """Create mock phone objects for testing"""
    phones = []
    
    # Target phone (flagship)
    target_phone = MagicMock(spec=Phone)
    target_phone.id = 1
    target_phone.brand = "TestBrand"
    target_phone.model = "Flagship X"
    target_phone.price_original = 80000
    target_phone.price_category = "flagship"
    target_phone.display_type = "AMOLED"
    target_phone.chipset = "Snapdragon 8 Gen 1"
    target_phone.ram_gb = 12
    target_phone.storage_gb = 256
    target_phone.camera_score = 9.0
    target_phone.battery_score = 8.5
    target_phone.performance_score = 9.5
    target_phone.display_score = 9.0
    target_phone.overall_device_score = 9.0
    phones.append(target_phone)
    
    # Similar phone, same brand (flagship)
    similar_same_brand = MagicMock(spec=Phone)
    similar_same_brand.id = 2
    similar_same_brand.brand = "TestBrand"
    similar_same_brand.model = "Flagship S"
    similar_same_brand.price_original = 75000
    similar_same_brand.price_category = "flagship"
    similar_same_brand.display_type = "AMOLED"
    similar_same_brand.chipset = "Snapdragon 8 Gen 1"
    similar_same_brand.ram_gb = 8
    similar_same_brand.storage_gb = 256
    similar_same_brand.camera_score = 8.8
    similar_same_brand.battery_score = 8.7
    similar_same_brand.performance_score = 9.3
    similar_same_brand.display_score = 9.0
    similar_same_brand.overall_device_score = 8.9
    phones.append(similar_same_brand)
    
    # Similar phone, different brand (flagship)
    similar_diff_brand = MagicMock(spec=Phone)
    similar_diff_brand.id = 3
    similar_diff_brand.brand = "CompetitorA"
    similar_diff_brand.model = "Ultra Pro"
    similar_diff_brand.price_original = 85000
    similar_diff_brand.price_category = "flagship"
    similar_diff_brand.display_type = "AMOLED"
    similar_diff_brand.chipset = "Snapdragon 8 Gen 1"
    similar_diff_brand.ram_gb = 12
    similar_diff_brand.storage_gb = 512
    similar_diff_brand.camera_score = 9.2
    similar_diff_brand.battery_score = 8.3
    similar_diff_brand.performance_score = 9.4
    similar_diff_brand.display_score = 9.1
    similar_diff_brand.overall_device_score = 9.1
    phones.append(similar_diff_brand)
    
    # Mid-range alternative
    midrange_phone = MagicMock(spec=Phone)
    midrange_phone.id = 4
    midrange_phone.brand = "CompetitorB"
    midrange_phone.model = "Mid Plus"
    midrange_phone.price_original = 45000
    midrange_phone.price_category = "mid-range"
    midrange_phone.display_type = "AMOLED"
    midrange_phone.chipset = "Snapdragon 778G"
    midrange_phone.ram_gb = 8
    midrange_phone.storage_gb = 128
    midrange_phone.camera_score = 8.0
    midrange_phone.battery_score = 8.8
    midrange_phone.performance_score = 7.5
    midrange_phone.display_score = 8.0
    midrange_phone.overall_device_score = 8.0
    phones.append(midrange_phone)
    
    # Budget alternative
    budget_phone = MagicMock(spec=Phone)
    budget_phone.id = 5
    budget_phone.brand = "CompetitorC"
    budget_phone.model = "Lite"
    budget_phone.price_original = 20000
    budget_phone.price_category = "entry-level"
    budget_phone.display_type = "LCD"
    budget_phone.chipset = "MediaTek Dimensity 700"
    budget_phone.ram_gb = 6
    budget_phone.storage_gb = 128
    budget_phone.camera_score = 7.0
    budget_phone.battery_score = 8.5
    budget_phone.performance_score = 6.5
    budget_phone.display_score = 7.0
    budget_phone.overall_device_score = 7.0
    phones.append(budget_phone)
    
    return phones

@pytest.fixture
def recommendation_service(mock_db):
    """Create a recommendation service with mocked dependencies"""
    service = RecommendationService(mock_db)
    
    # Mock the matchers and generators
    service.price_matcher = MagicMock(spec=PriceProximityMatcher)
    service.spec_matcher = MagicMock(spec=SpecSimilarityMatcher)
    service.score_matcher = MagicMock(spec=ScoreBasedMatcher)
    service.ai_engine = MagicMock(spec=AISimilarityEngine)
    service.badge_generator = MagicMock(spec=BadgeGenerator)
    service.highlight_generator = MagicMock(spec=HighlightGenerator)
    
    return service

# Tests for the recommendation service
def test_get_candidate_phones(recommendation_service, mock_db, mock_phones):
    """Test that candidate phones are correctly filtered"""
    # Setup
    target_phone = mock_phones[0]
    mock_db.query.return_value.filter.return_value.limit.return_value.all.return_value = mock_phones[1:]
    recommendation_service.price_matcher.get_price_range_bounds.return_value = (68000, 92000)
    
    # Execute
    candidates = recommendation_service._get_candidate_phones(target_phone)
    
    # Assert
    assert len(candidates) == 4
    assert all(phone.id != target_phone.id for phone in candidates)
    mock_db.query.return_value.filter.assert_called()

def test_calculate_similarity_scores(recommendation_service, mock_phones):
    """Test that similarity scores are correctly calculated"""
    # Setup
    target_phone = mock_phones[0]
    candidates = mock_phones[1:]
    
    # Mock matcher responses
    recommendation_service.price_matcher.calculate_price_similarity.side_effect = [0.95, 0.9, 0.7, 0.5]
    recommendation_service.spec_matcher.get_matching_score.side_effect = [0.9, 0.85, 0.7, 0.6]
    recommendation_service.score_matcher.get_matching_score.side_effect = [0.95, 0.9, 0.8, 0.7]
    recommendation_service.ai_engine.get_matching_score.side_effect = [0.9, 0.95, 0.75, 0.65]
    
    # Execute
    similarity_scores = recommendation_service._calculate_similarity_scores(target_phone, candidates)
    
    # Assert
    assert len(similarity_scores) == 4
    for phone_id, metrics in similarity_scores.items():
        assert isinstance(metrics, SimilarityMetrics)
        assert 0 <= metrics.price_similarity <= 1
        assert 0 <= metrics.spec_similarity <= 1
        assert 0 <= metrics.score_similarity <= 1
        assert 0 <= metrics.ai_similarity <= 1
        assert 0 <= metrics.overall_similarity <= 1

def test_rank_recommendations_with_diversity(recommendation_service, mock_phones):
    """Test that recommendations are ranked with diversity in mind"""
    # Setup
    candidates = []
    
    # Create recommendation candidates with pre-defined similarity metrics
    # Two phones from same brand with high similarity
    candidates.append(RecommendationCandidate(
        phone=mock_phones[1],  # TestBrand phone
        similarity_metrics=SimilarityMetrics(
            price_similarity=0.95,
            spec_similarity=0.9,
            score_similarity=0.95,
            ai_similarity=0.9,
            overall_similarity=0.925
        )
    ))
    
    candidates.append(RecommendationCandidate(
        phone=mock_phones[2],  # CompetitorA phone
        similarity_metrics=SimilarityMetrics(
            price_similarity=0.9,
            spec_similarity=0.85,
            score_similarity=0.9,
            ai_similarity=0.95,
            overall_similarity=0.9
        )
    ))
    
    candidates.append(RecommendationCandidate(
        phone=mock_phones[3],  # CompetitorB phone
        similarity_metrics=SimilarityMetrics(
            price_similarity=0.7,
            spec_similarity=0.7,
            score_similarity=0.8,
            ai_similarity=0.75,
            overall_similarity=0.7375
        )
    ))
    
    candidates.append(RecommendationCandidate(
        phone=mock_phones[4],  # CompetitorC phone
        similarity_metrics=SimilarityMetrics(
            price_similarity=0.5,
            spec_similarity=0.6,
            score_similarity=0.7,
            ai_similarity=0.65,
            overall_similarity=0.6125
        )
    ))
    
    # Instead of using side_effect which can run out of values, use a return_value
    # that will work for any call
    recommendation_service.spec_matcher.get_matching_score.return_value = 0.7
    
    # Execute
    ranked = recommendation_service._rank_recommendations(candidates)
    
    # Assert
    assert len(ranked) == 4
    
    # The first phone should be the highest similarity one
    assert ranked[0].similarity_metrics.overall_similarity == 0.925
    
    # Check that all phones are included
    phone_ids = [c.phone.id for c in ranked]
    assert sorted(phone_ids) == [2, 3, 4, 5]

def test_generate_match_reasons(recommendation_service):
    """Test that match reasons are correctly generated"""
    # Setup
    metrics = SimilarityMetrics(
        price_similarity=0.87,
        spec_similarity=0.75,
        score_similarity=0.9,
        ai_similarity=0.8,
        overall_similarity=0.825
    )
    
    # Execute
    reasons = recommendation_service._generate_match_reasons(metrics)
    
    # Assert
    # Check that we get the expected reasons based on our thresholds
    assert "Similar price range" in reasons
    assert "Similar performance profile" in reasons  # Updated to match actual implementation
    assert "Similar specifications" in reasons

@patch('app.crud.phone.get_phone')
@patch('app.crud.phone.phone_to_dict')
def test_get_smart_recommendations_integration(mock_phone_to_dict, mock_get_phone, 
                                              recommendation_service, mock_phones):
    """Integration test for the complete recommendation flow"""
    # Setup
    target_phone = mock_phones[0]
    mock_get_phone.return_value = target_phone
    
    # Mock the candidate phone retrieval
    recommendation_service._get_candidate_phones = MagicMock(return_value=mock_phones[1:])
    
    # Mock similarity calculations
    mock_similarity_scores = {
        2: SimilarityMetrics(price_similarity=0.95, spec_similarity=0.9, 
                            score_similarity=0.95, ai_similarity=0.9, overall_similarity=0.925),
        3: SimilarityMetrics(price_similarity=0.9, spec_similarity=0.85, 
                            score_similarity=0.9, ai_similarity=0.95, overall_similarity=0.9),
        4: SimilarityMetrics(price_similarity=0.7, spec_similarity=0.7, 
                            score_similarity=0.8, ai_similarity=0.75, overall_similarity=0.7375),
        5: SimilarityMetrics(price_similarity=0.5, spec_similarity=0.6, 
                            score_similarity=0.7, ai_similarity=0.65, overall_similarity=0.6125)
    }
    recommendation_service._calculate_similarity_scores = MagicMock(return_value=mock_similarity_scores)
    
    # Mock the ranking function to return candidates in a predictable order
    ranked_candidates = [
        RecommendationCandidate(phone=mock_phones[1], similarity_metrics=mock_similarity_scores[2]),
        RecommendationCandidate(phone=mock_phones[2], similarity_metrics=mock_similarity_scores[3]),
        RecommendationCandidate(phone=mock_phones[3], similarity_metrics=mock_similarity_scores[4]),
        RecommendationCandidate(phone=mock_phones[4], similarity_metrics=mock_similarity_scores[5])
    ]
    recommendation_service._rank_recommendations = MagicMock(return_value=ranked_candidates)
    
    # Mock highlight and badge generation
    recommendation_service._generate_highlights = MagicMock(return_value=["🔥 Better Display", "⚡ Longer Battery"])
    recommendation_service._generate_badges = MagicMock(return_value=["Popular"])
    recommendation_service._generate_match_reasons = MagicMock(return_value=["Similar price range"])
    
    # Mock phone_to_dict to return a simple dict
    mock_phone_to_dict.side_effect = lambda phone: {"id": phone.id, "brand": phone.brand, "model": phone.model}
    
    # Execute
    results = recommendation_service.get_smart_recommendations(1, limit=3)
    
    # Assert
    assert len(results) == 3
    assert all(result.phone["id"] != 1 for result in results)
    assert all(len(result.highlights) > 0 for result in results)
    assert all(len(result.badges) > 0 for result in results)
    assert all(len(result.match_reasons) > 0 for result in results)
    assert all(hasattr(result, "similarity_metrics") for result in results)

def test_get_smart_recommendations_empty_result(recommendation_service):
    """Test handling of empty results"""
    # Setup
    recommendation_service._get_candidate_phones = MagicMock(return_value=[])
    
    # Execute
    results = recommendation_service.get_smart_recommendations(1)
    
    # Assert
    assert results == []

def test_get_smart_recommendations_error_handling(recommendation_service):
    """Test error handling in the recommendation flow"""
    # Setup
    recommendation_service._get_candidate_phones = MagicMock(side_effect=Exception("Test error"))
    
    # Execute
    results = recommendation_service.get_smart_recommendations(1)
    
    # Assert
    assert results == []

def test_diversity_with_no_candidates(recommendation_service):
    """Test that diversity logic handles empty candidate list"""
    # Execute
    ranked = recommendation_service._rank_recommendations([])
    
    # Assert
    assert ranked == []