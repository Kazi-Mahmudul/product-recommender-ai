"""
Tests for the AI-enhanced highlight generator
"""

import pytest
from unittest.mock import MagicMock, patch
import asyncio
from app.services.highlight_generator import HighlightGenerator
from app.models.phone import Phone

# Mock phone data for testing
@pytest.fixture
def mock_target_phone():
    phone = MagicMock(spec=Phone)
    phone.id = 1
    phone.name = "Target Phone"
    phone.brand = "Test Brand"
    phone.model = "Target Model"
    phone.price_original