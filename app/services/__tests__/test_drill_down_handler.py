# Unit tests for drill-down handler service

import pytest
import sys
import os
from unittest.mock import Mock, MagicMock, patch

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from services.drill_down_handler import DrillDownHandler


class TestDrillDownHandler:
    """Test cases for DrillDownHandler"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_db = Mock()
        self.mock_phone_crud = Mock()
        
        # Mock phone data
        self.mock_phone_dict = {
            "id": 1,
            "name": "Samsung Galaxy A55",
            "brand": "Samsung",
            "price_original": 45000,
            "ram_gb": 8,
            "storage_gb": 128,
            "primary_camera_mp": 50,
            "battery_capacity_numeric": 5000,
            "display_score": 8.0,
            "camera_score": 8.5,
            "overall_device_score": 8.2,
            "refresh_rate_numeric": 120,
            "has_fast_charging": True
        }
    
    def test_process_drill_down_command_full_specs(self):
        """Test processing full_specs command"""
        # Mock phone_crud methods
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.return_value = Mock()
            mock_crud.phone_to_dict.return_value = self.mock_phone_dict
            
            result = DrillDownHandler.process_drill_down_command(
                db=self.mock_db,
                command="full_specs",
                phone_names=["Samsung Galaxy A55"]
            )
            
            assert result["type"] == "detailed_specs"
            assert len(result["phones"]) == 1
            assert result["phones"][0]["name"] == "Samsung Galaxy A55"
            assert result["back_to_simple"] is True
    
    def test_process_drill_down_command_chart_view(self):
        """Test processing chart_view command"""
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.return_value = Mock()
            mock_crud.phone_to_dict.return_value = self.mock_phone_dict
            
            result = DrillDownHandler.process_drill_down_command(
                db=self.mock_db,
                command="chart_view",
                phone_names=["Samsung Galaxy A55", "iPhone 15"]
            )
            
            assert result["type"] == "chart_visualization"
            assert "comparison_data" in result
            assert result["back_to_simple"] is True
    
    def test_process_drill_down_command_detail_focus(self):
        """Test processing detail_focus command"""
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.return_value = Mock()
            mock_crud.phone_to_dict.return_value = self.mock_phone_dict
            
            result = DrillDownHandler.process_drill_down_command(
                db=self.mock_db,
                command="detail_focus",
                target="display",
                phone_names=["Samsung Galaxy A55"]
            )
            
            assert result["type"] == "feature_analysis"
            assert result["target"] == "display"
            assert "analysis" in result
            assert result["back_to_simple"] is True
    
    def test_process_drill_down_command_unknown(self):
        """Test processing unknown command"""
        result = DrillDownHandler.process_drill_down_command(
            db=self.mock_db,
            command="unknown_command"
        )
        
        assert result["type"] == "error"
        assert "Unknown drill-down command" in result["message"]
        assert "suggestions" in result
    
    def test_handle_full_specs_no_phones(self):
        """Test full_specs with no phone names"""
        result = DrillDownHandler._handle_full_specs(self.mock_db)
        
        assert result["type"] == "error"
        assert "No phones specified" in result["message"]
    
    def test_handle_chart_view_insufficient_phones(self):
        """Test chart_view with insufficient phones"""
        result = DrillDownHandler._handle_chart_view(
            self.mock_db,
            phone_names=["Single Phone"]
        )
        
        assert result["type"] == "error"
        assert "at least 2 phones" in result["message"]
    
    def test_generate_comparison_data(self):
        """Test comparison data generation"""
        phones = [self.mock_phone_dict, {**self.mock_phone_dict, "name": "iPhone 15"}]
        
        result = DrillDownHandler._generate_comparison_data(phones)
        
        assert "metrics" in result
        assert "phone_names" in result
        assert "chart_type" in result
        assert len(result["phone_names"]) == 2
        assert result["chart_type"] == "multi_metric"
    
    def test_generate_feature_analysis_display(self):
        """Test feature analysis for display"""
        phones = [self.mock_phone_dict]
        
        result = DrillDownHandler._generate_feature_analysis(phones, "display")
        
        assert result["title"] == "Display Analysis"
        assert result["target"] == "display"
        assert len(result["phones"]) == 1
        assert "insights" in result
    
    def test_generate_feature_analysis_camera(self):
        """Test feature analysis for camera"""
        phones = [self.mock_phone_dict]
        
        result = DrillDownHandler._generate_feature_analysis(phones, "camera")
        
        assert result["title"] == "Camera Analysis"
        assert result["target"] == "camera"
        assert "insights" in result
    
    def test_generate_feature_insights_display(self):
        """Test feature insights generation for display"""
        phones = [self.mock_phone_dict]
        
        insights = DrillDownHandler._generate_feature_insights(phones, "display", ["refresh_rate_numeric"])
        
        assert isinstance(insights, list)
        assert len(insights) > 0
        assert any("high refresh rate" in insight for insight in insights)
    
    def test_generate_feature_insights_battery(self):
        """Test feature insights generation for battery"""
        phones = [self.mock_phone_dict]
        
        insights = DrillDownHandler._generate_feature_insights(phones, "battery", ["battery_capacity_numeric", "has_fast_charging"])
        
        assert isinstance(insights, list)
        assert len(insights) > 0
        assert any("large batteries" in insight or "fast charging" in insight for insight in insights)