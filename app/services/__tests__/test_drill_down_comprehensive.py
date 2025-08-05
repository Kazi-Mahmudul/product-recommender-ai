# Comprehensive tests for drill-down handler service

import pytest
import sys
import os
from unittest.mock import Mock, MagicMock, patch

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from services.drill_down_handler import DrillDownHandler


class TestDrillDownHandlerComprehensive:
    """Comprehensive test cases for DrillDownHandler"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_db = Mock()
        
        # Mock phone data - Samsung Galaxy A55
        self.mock_phone_samsung = {
            "id": 1,
            "name": "Samsung Galaxy A55",
            "brand": "Samsung",
            "price_original": 45000,
            "ram_gb": 8,
            "storage_gb": 128,
            "primary_camera_mp": 50,
            "selfie_camera_mp": 32,
            "battery_capacity_numeric": 5000,
            "display_score": 8.0,
            "camera_score": 8.5,
            "battery_score": 8.2,
            "performance_score": 7.8,
            "overall_device_score": 8.2,
            "refresh_rate_numeric": 120,
            "screen_size_numeric": 6.6,
            "has_fast_charging": True,
            "has_wireless_charging": False,
            "primary_camera_ois": "Yes",
            "display_type": "Super AMOLED",
            "display_resolution": "2340 x 1080",
            "ppi_numeric": 390,
            "chipset": "Exynos 1480",
            "cpu": "Octa-core",
            "gpu": "Xclipse 530"
        }
        
        # Mock phone data - iPhone 15
        self.mock_phone_iphone = {
            "id": 2,
            "name": "iPhone 15",
            "brand": "Apple",
            "price_original": 95000,
            "ram_gb": 6,
            "storage_gb": 128,
            "primary_camera_mp": 48,
            "selfie_camera_mp": 12,
            "battery_capacity_numeric": 3349,
            "display_score": 9.0,
            "camera_score": 9.2,
            "battery_score": 7.5,
            "performance_score": 9.5,
            "overall_device_score": 9.0,
            "refresh_rate_numeric": 60,
            "screen_size_numeric": 6.1,
            "has_fast_charging": True,
            "has_wireless_charging": True,
            "primary_camera_ois": "Yes",
            "display_type": "Super Retina XDR OLED",
            "display_resolution": "2556 x 1179",
            "ppi_numeric": 460,
            "chipset": "A16 Bionic",
            "cpu": "Hexa-core",
            "gpu": "Apple GPU"
        }
        
        # Mock phone data - Xiaomi POCO X6
        self.mock_phone_poco = {
            "id": 3,
            "name": "Xiaomi POCO X6",
            "brand": "Xiaomi",
            "price_original": 35000,
            "ram_gb": 12,
            "storage_gb": 256,
            "primary_camera_mp": 64,
            "selfie_camera_mp": 16,
            "battery_capacity_numeric": 5100,
            "display_score": 7.8,
            "camera_score": 7.5,
            "battery_score": 8.5,
            "performance_score": 8.2,
            "overall_device_score": 7.9,
            "refresh_rate_numeric": 120,
            "screen_size_numeric": 6.67,
            "has_fast_charging": True,
            "has_wireless_charging": False,
            "primary_camera_ois": "No",
            "display_type": "AMOLED",
            "display_resolution": "2712 x 1220",
            "ppi_numeric": 446,
            "chipset": "Snapdragon 7s Gen 2",
            "cpu": "Octa-core",
            "gpu": "Adreno 710"
        }
        
        self.mock_phones = [self.mock_phone_samsung, self.mock_phone_iphone, self.mock_phone_poco]
    
    # ===== COMMAND PROCESSING TESTS =====
    
    def test_process_drill_down_command_full_specs_success(self):
        """Test successful full_specs command processing"""
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.return_value = Mock()
            mock_crud.phone_to_dict.return_value = self.mock_phone_samsung
            
            result = DrillDownHandler.process_drill_down_command(
                db=self.mock_db,
                command="full_specs",
                phone_names=["Samsung Galaxy A55"]
            )
            
            assert result["type"] == "detailed_specs"
            assert len(result["phones"]) == 1
            assert result["phones"][0]["name"] == "Samsung Galaxy A55"
            assert result["back_to_simple"] is True
            assert "complete specifications" in result["message"]
    
    def test_process_drill_down_command_chart_view_success(self):
        """Test successful chart_view command processing"""
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.side_effect = [Mock(), Mock()]
            mock_crud.phone_to_dict.side_effect = [self.mock_phone_samsung, self.mock_phone_iphone]
            
            result = DrillDownHandler.process_drill_down_command(
                db=self.mock_db,
                command="chart_view",
                phone_names=["Samsung Galaxy A55", "iPhone 15"]
            )
            
            assert result["type"] == "chart_visualization"
            assert len(result["phones"]) == 2
            assert "comparison_data" in result
            assert result["back_to_simple"] is True
            assert "Interactive chart comparison" in result["message"]
    
    def test_process_drill_down_command_detail_focus_success(self):
        """Test successful detail_focus command processing"""
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.return_value = Mock()
            mock_crud.phone_to_dict.return_value = self.mock_phone_samsung
            
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
            assert "Detailed display analysis" in result["message"]
    
    def test_process_drill_down_command_unknown_command(self):
        """Test handling of unknown commands"""
        result = DrillDownHandler.process_drill_down_command(
            db=self.mock_db,
            command="unknown_command"
        )
        
        assert result["type"] == "error"
        assert "Unknown drill-down command" in result["message"]
        assert "suggestions" in result
        assert "full_specs" in result["suggestions"]
        assert "chart_view" in result["suggestions"]
        assert "detail_focus" in result["suggestions"]
    
    # ===== FULL SPECS TESTS =====
    
    def test_handle_full_specs_with_context(self):
        """Test full_specs with context containing current phones"""
        context = {
            "current_phones": [
                {"name": "Samsung Galaxy A55"},
                {"name": "iPhone 15"}
            ]
        }
        
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.side_effect = [Mock(), Mock()]
            mock_crud.phone_to_dict.side_effect = [self.mock_phone_samsung, self.mock_phone_iphone]
            
            result = DrillDownHandler._handle_full_specs(self.mock_db, context=context)
            
            assert result["type"] == "detailed_specs"
            assert len(result["phones"]) == 2
    
    def test_handle_full_specs_no_phones_found(self):
        """Test full_specs when no phones are found"""
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.return_value = None
            
            result = DrillDownHandler._handle_full_specs(
                self.mock_db,
                phone_names=["Nonexistent Phone"]
            )
            
            assert result["type"] == "error"
            assert "Could not find detailed specifications" in result["message"]
    
    def test_handle_full_specs_limit_to_three_phones(self):
        """Test that full_specs limits to 3 phones maximum"""
        phone_names = ["Phone1", "Phone2", "Phone3", "Phone4", "Phone5"]
        
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.return_value = Mock()
            mock_crud.phone_to_dict.return_value = self.mock_phone_samsung
            
            result = DrillDownHandler._handle_full_specs(
                self.mock_db,
                phone_names=phone_names
            )
            
            # Should only process first 3 phones
            assert mock_crud.get_phone_by_name_or_model.call_count == 3
    
    # ===== CHART VIEW TESTS =====
    
    def test_handle_chart_view_insufficient_phones_error(self):
        """Test chart_view error with insufficient phones"""
        result = DrillDownHandler._handle_chart_view(
            self.mock_db,
            phone_names=["Single Phone"]
        )
        
        assert result["type"] == "error"
        assert "at least 2 phones" in result["message"]
    
    def test_handle_chart_view_limit_to_five_phones(self):
        """Test that chart_view limits to 5 phones maximum"""
        phone_names = ["Phone1", "Phone2", "Phone3", "Phone4", "Phone5", "Phone6"]
        
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.return_value = Mock()
            mock_crud.phone_to_dict.return_value = self.mock_phone_samsung
            
            result = DrillDownHandler._handle_chart_view(
                self.mock_db,
                phone_names=phone_names
            )
            
            # Should only process first 5 phones
            assert mock_crud.get_phone_by_name_or_model.call_count == 5
    
    def test_handle_chart_view_not_enough_found(self):
        """Test chart_view when not enough phones are found in database"""
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            # Only first phone found, second returns None
            mock_crud.get_phone_by_name_or_model.side_effect = [Mock(), None]
            mock_crud.phone_to_dict.return_value = self.mock_phone_samsung
            
            result = DrillDownHandler._handle_chart_view(
                self.mock_db,
                phone_names=["Phone1", "Phone2"]
            )
            
            assert result["type"] == "error"
            assert "Could not find enough phones" in result["message"]
            assert "Found: 1, need at least 2" in result["message"]
    
    # ===== DETAIL FOCUS TESTS =====
    
    def test_handle_detail_focus_no_target_defaults_to_general(self):
        """Test detail_focus with no target defaults to general"""
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.return_value = Mock()
            mock_crud.phone_to_dict.return_value = self.mock_phone_samsung
            
            result = DrillDownHandler._handle_detail_focus(
                self.mock_db,
                target=None,
                phone_names=["Samsung Galaxy A55"]
            )
            
            assert result["type"] == "feature_analysis"
            assert result["target"] == "general"
    
    def test_handle_detail_focus_all_feature_types(self):
        """Test detail_focus with different feature types"""
        feature_types = ["display", "camera", "battery", "performance", "connectivity"]
        
        for feature_type in feature_types:
            with patch('services.drill_down_handler.phone_crud') as mock_crud:
                mock_crud.get_phone_by_name_or_model.return_value = Mock()
                mock_crud.phone_to_dict.return_value = self.mock_phone_samsung
                
                result = DrillDownHandler._handle_detail_focus(
                    self.mock_db,
                    target=feature_type,
                    phone_names=["Samsung Galaxy A55"]
                )
                
                assert result["type"] == "feature_analysis"
                assert result["target"] == feature_type
                assert "analysis" in result
                assert feature_type.capitalize() in result["analysis"]["title"]
    
    def test_handle_detail_focus_with_context(self):
        """Test detail_focus using context for phone names"""
        context = {
            "current_phones": [
                {"name": "Samsung Galaxy A55"}
            ]
        }
        
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.return_value = Mock()
            mock_crud.phone_to_dict.return_value = self.mock_phone_samsung
            
            result = DrillDownHandler._handle_detail_focus(
                self.mock_db,
                target="camera",
                context=context
            )
            
            assert result["type"] == "feature_analysis"
            assert result["target"] == "camera"
    
    # ===== COMPARISON DATA GENERATION TESTS =====
    
    def test_generate_comparison_data_comprehensive(self):
        """Test comprehensive comparison data generation"""
        result = DrillDownHandler._generate_comparison_data(self.mock_phones)
        
        assert "metrics" in result
        assert "phone_names" in result
        assert "chart_type" in result
        assert result["chart_type"] == "multi_metric"
        assert len(result["phone_names"]) == 3
        
        # Check that key metrics are included
        metric_keys = [metric["key"] for metric in result["metrics"]]
        expected_metrics = [
            "price_original", "ram_gb", "storage_gb", "primary_camera_mp",
            "battery_capacity_numeric", "display_score", "camera_score", "overall_device_score"
        ]
        
        for expected_metric in expected_metrics:
            assert expected_metric in metric_keys
    
    def test_generate_comparison_data_handles_missing_values(self):
        """Test comparison data generation with missing values"""
        incomplete_phone = {
            "name": "Incomplete Phone",
            "price_original": 30000,
            # Missing other fields
        }
        
        result = DrillDownHandler._generate_comparison_data([incomplete_phone])
        
        assert "metrics" in result
        # Should still include metrics with valid values
        price_metrics = [m for m in result["metrics"] if m["key"] == "price_original"]
        assert len(price_metrics) == 1
        assert price_metrics[0]["values"][0]["value"] == 30000
    
    # ===== FEATURE ANALYSIS TESTS =====
    
    def test_generate_feature_analysis_display(self):
        """Test display feature analysis generation"""
        result = DrillDownHandler._generate_feature_analysis([self.mock_phone_samsung], "display")
        
        assert result["title"] == "Display Analysis"
        assert result["target"] == "display"
        assert len(result["phones"]) == 1
        assert "insights" in result
        
        phone_analysis = result["phones"][0]
        assert phone_analysis["name"] == "Samsung Galaxy A55"
        assert "features" in phone_analysis
        
        # Check display-specific fields
        display_fields = ["display_type", "screen_size_numeric", "refresh_rate_numeric", "display_score"]
        for field in display_fields:
            if field in self.mock_phone_samsung:
                assert field in phone_analysis["features"]
    
    def test_generate_feature_analysis_camera(self):
        """Test camera feature analysis generation"""
        result = DrillDownHandler._generate_feature_analysis([self.mock_phone_samsung], "camera")
        
        assert result["title"] == "Camera Analysis"
        assert result["target"] == "camera"
        
        phone_analysis = result["phones"][0]
        camera_fields = ["primary_camera_mp", "selfie_camera_mp", "primary_camera_ois", "camera_score"]
        for field in camera_fields:
            if field in self.mock_phone_samsung:
                assert field in phone_analysis["features"]
    
    def test_generate_feature_analysis_battery(self):
        """Test battery feature analysis generation"""
        result = DrillDownHandler._generate_feature_analysis([self.mock_phone_samsung], "battery")
        
        assert result["title"] == "Battery Analysis"
        assert result["target"] == "battery"
        
        phone_analysis = result["phones"][0]
        battery_fields = ["battery_capacity_numeric", "has_fast_charging", "has_wireless_charging"]
        for field in battery_fields:
            if field in self.mock_phone_samsung:
                assert field in phone_analysis["features"]
    
    def test_generate_feature_analysis_performance(self):
        """Test performance feature analysis generation"""
        result = DrillDownHandler._generate_feature_analysis([self.mock_phone_samsung], "performance")
        
        assert result["title"] == "Performance Analysis"
        assert result["target"] == "performance"
        
        phone_analysis = result["phones"][0]
        performance_fields = ["chipset", "cpu", "gpu", "ram_gb", "storage_gb", "performance_score"]
        for field in performance_fields:
            if field in self.mock_phone_samsung:
                assert field in phone_analysis["features"]
    
    def test_generate_feature_analysis_connectivity(self):
        """Test connectivity feature analysis generation"""
        result = DrillDownHandler._generate_feature_analysis([self.mock_phone_samsung], "connectivity")
        
        assert result["title"] == "Connectivity Analysis"
        assert result["target"] == "connectivity"
    
    def test_generate_feature_analysis_unknown_target(self):
        """Test feature analysis with unknown target defaults to general"""
        result = DrillDownHandler._generate_feature_analysis([self.mock_phone_samsung], "unknown_feature")
        
        assert result["title"] == "General Analysis"
        assert result["target"] == "unknown_feature"
        
        phone_analysis = result["phones"][0]
        general_fields = ["name", "brand", "price_original", "overall_device_score"]
        for field in general_fields:
            if field in self.mock_phone_samsung:
                assert field in phone_analysis["features"]
    
    # ===== FEATURE INSIGHTS TESTS =====
    
    def test_generate_feature_insights_display(self):
        """Test display feature insights generation"""
        phones_with_high_refresh = [self.mock_phone_samsung, self.mock_phone_poco]  # Both have 120Hz
        phones_with_low_refresh = [self.mock_phone_iphone]  # 60Hz
        
        # Test with high refresh rate phones
        insights = DrillDownHandler._generate_feature_insights(
            phones_with_high_refresh, 
            "display", 
            ["refresh_rate_numeric", "screen_size_numeric"]
        )
        
        assert isinstance(insights, list)
        assert len(insights) > 0
        assert any("high refresh rate" in insight for insight in insights)
        
        # Test with large screen phones
        large_screen_insights = DrillDownHandler._generate_feature_insights(
            phones_with_high_refresh,
            "display",
            ["screen_size_numeric"]
        )
        
        assert any("large screens" in insight for insight in large_screen_insights)
    
    def test_generate_feature_insights_camera(self):
        """Test camera feature insights generation"""
        insights = DrillDownHandler._generate_feature_insights(
            [self.mock_phone_samsung, self.mock_phone_poco], 
            "camera", 
            ["primary_camera_mp", "primary_camera_ois"]
        )
        
        assert isinstance(insights, list)
        assert len(insights) > 0
        
        # Should mention high-resolution cameras (both have 48MP+)
        assert any("high-resolution main cameras" in insight for insight in insights)
        
        # Should mention OIS (Samsung has it)
        assert any("optical image stabilization" in insight for insight in insights)
    
    def test_generate_feature_insights_battery(self):
        """Test battery feature insights generation"""
        insights = DrillDownHandler._generate_feature_insights(
            self.mock_phones, 
            "battery", 
            ["battery_capacity_numeric", "has_fast_charging"]
        )
        
        assert isinstance(insights, list)
        assert len(insights) > 0
        
        # Should mention large batteries (all have 4500mAh+)
        assert any("large batteries" in insight for insight in insights)
        
        # Should mention fast charging (all support it)
        assert any("fast charging" in insight for insight in insights)
    
    def test_generate_feature_insights_performance(self):
        """Test performance feature insights generation"""
        insights = DrillDownHandler._generate_feature_insights(
            self.mock_phones, 
            "performance", 
            ["ram_gb", "storage_gb"]
        )
        
        assert isinstance(insights, list)
        assert len(insights) > 0
        
        # Should mention high RAM (Samsung has 8GB+, POCO has 12GB)
        assert any("8GB+ RAM" in insight for insight in insights)
        
        # Should mention large storage (all have 128GB+)
        assert any("128GB+ storage" in insight for insight in insights)
    
    def test_generate_feature_insights_fallback(self):
        """Test feature insights fallback for unknown targets"""
        insights = DrillDownHandler._generate_feature_insights(
            [self.mock_phone_samsung], 
            "unknown_target", 
            ["name"]
        )
        
        assert isinstance(insights, list)
        assert len(insights) > 0
        assert any("Analysis completed" in insight for insight in insights)
    
    # ===== EDGE CASES AND ERROR HANDLING =====
    
    def test_empty_phone_list_handling(self):
        """Test handling of empty phone lists"""
        result = DrillDownHandler._generate_comparison_data([])
        
        assert "metrics" in result
        assert "phone_names" in result
        assert len(result["phone_names"]) == 0
        assert len(result["metrics"]) == 0
    
    def test_single_phone_comparison_data(self):
        """Test comparison data generation with single phone"""
        result = DrillDownHandler._generate_comparison_data([self.mock_phone_samsung])
        
        assert len(result["phone_names"]) == 1
        assert result["phone_names"][0] == "Samsung Galaxy A55"
    
    def test_phone_with_missing_name(self):
        """Test handling phone with missing name"""
        phone_no_name = {**self.mock_phone_samsung}
        del phone_no_name["name"]
        
        result = DrillDownHandler._generate_comparison_data([phone_no_name])
        
        assert len(result["phone_names"]) == 1
        assert result["phone_names"][0] == "Unknown"
    
    def test_feature_analysis_with_empty_phones(self):
        """Test feature analysis with empty phone list"""
        result = DrillDownHandler._generate_feature_analysis([], "display")
        
        assert result["title"] == "Display Analysis"
        assert result["target"] == "display"
        assert len(result["phones"]) == 0
        assert "insights" in result
    
    # ===== INTEGRATION TESTS =====
    
    def test_full_workflow_full_specs(self):
        """Test complete workflow for full_specs command"""
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.return_value = Mock()
            mock_crud.phone_to_dict.return_value = self.mock_phone_samsung
            
            # Test with explicit phone names
            result = DrillDownHandler.process_drill_down_command(
                db=self.mock_db,
                command="full_specs",
                phone_names=["Samsung Galaxy A55"]
            )
            
            assert result["type"] == "detailed_specs"
            assert result["back_to_simple"] is True
            assert len(result["phones"]) == 1
            
            # Verify phone data structure
            phone_data = result["phones"][0]
            assert phone_data["name"] == "Samsung Galaxy A55"
            assert phone_data["brand"] == "Samsung"
            assert phone_data["price_original"] == 45000
    
    def test_full_workflow_chart_view(self):
        """Test complete workflow for chart_view command"""
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.side_effect = [Mock(), Mock(), Mock()]
            mock_crud.phone_to_dict.side_effect = self.mock_phones
            
            result = DrillDownHandler.process_drill_down_command(
                db=self.mock_db,
                command="chart_view",
                phone_names=["Samsung Galaxy A55", "iPhone 15", "Xiaomi POCO X6"]
            )
            
            assert result["type"] == "chart_visualization"
            assert result["back_to_simple"] is True
            assert len(result["phones"]) == 3
            
            # Verify comparison data structure
            comparison_data = result["comparison_data"]
            assert "metrics" in comparison_data
            assert "phone_names" in comparison_data
            assert len(comparison_data["phone_names"]) == 3
            assert "Samsung Galaxy A55" in comparison_data["phone_names"]
            assert "iPhone 15" in comparison_data["phone_names"]
            assert "Xiaomi POCO X6" in comparison_data["phone_names"]
    
    def test_full_workflow_detail_focus(self):
        """Test complete workflow for detail_focus command"""
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.return_value = Mock()
            mock_crud.phone_to_dict.return_value = self.mock_phone_samsung
            
            result = DrillDownHandler.process_drill_down_command(
                db=self.mock_db,
                command="detail_focus",
                target="camera",
                phone_names=["Samsung Galaxy A55"]
            )
            
            assert result["type"] == "feature_analysis"
            assert result["target"] == "camera"
            assert result["back_to_simple"] is True
            
            # Verify analysis structure
            analysis = result["analysis"]
            assert analysis["title"] == "Camera Analysis"
            assert analysis["target"] == "camera"
            assert len(analysis["phones"]) == 1
            assert "insights" in analysis
            
            # Verify phone features
            phone_features = analysis["phones"][0]["features"]
            assert "primary_camera_mp" in phone_features
            assert "camera_score" in phone_features
            assert phone_features["primary_camera_mp"] == 50
    
    def test_context_based_operations(self):
        """Test operations using context instead of explicit phone names"""
        context = {
            "current_phones": [
                {"name": "Samsung Galaxy A55"},
                {"name": "iPhone 15"}
            ]
        }
        
        # Test full_specs with context
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.side_effect = [Mock(), Mock()]
            mock_crud.phone_to_dict.side_effect = [self.mock_phone_samsung, self.mock_phone_iphone]
            
            result = DrillDownHandler.process_drill_down_command(
                db=self.mock_db,
                command="full_specs",
                context=context
            )
            
            assert result["type"] == "detailed_specs"
            assert len(result["phones"]) == 2
        
        # Test chart_view with context
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.side_effect = [Mock(), Mock()]
            mock_crud.phone_to_dict.side_effect = [self.mock_phone_samsung, self.mock_phone_iphone]
            
            result = DrillDownHandler.process_drill_down_command(
                db=self.mock_db,
                command="chart_view",
                context=context
            )
            
            assert result["type"] == "chart_visualization"
            assert len(result["phones"]) == 2
        
        # Test detail_focus with context
        with patch('services.drill_down_handler.phone_crud') as mock_crud:
            mock_crud.get_phone_by_name_or_model.side_effect = [Mock(), Mock()]
            mock_crud.phone_to_dict.side_effect = [self.mock_phone_samsung, self.mock_phone_iphone]
            
            result = DrillDownHandler.process_drill_down_command(
                db=self.mock_db,
                command="detail_focus",
                target="display",
                context=context
            )
            
            assert result["type"] == "feature_analysis"
            assert len(result["analysis"]["phones"]) == 2