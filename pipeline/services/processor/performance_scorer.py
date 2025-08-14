"""
Performance scoring module for mobile phones.
"""

import pandas as pd
import numpy as np
import re
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class PerformanceScorer:
    """
    Handles performance scoring for mobile phones based on chipset, CPU, GPU, RAM, and storage.
    """
    
    def __init__(self):
        """Initialize the performance scorer."""
        self.chipset_rankings = self._load_chipset_rankings()
        logger.info("Performance scorer initialized")
    
    def _load_chipset_rankings(self) -> Dict[str, float]:
        """Load chipset performance rankings."""
        # This would ideally load from a database or file
        # For now, using a simplified ranking system
        return {
            # Flagship chipsets (90-100)
            'snapdragon 8 gen 3': 100,
            'snapdragon 8 gen 2': 95,
            'snapdragon 8 gen 1': 90,
            'apple a17 pro': 100,
            'apple a16 bionic': 95,
            'apple a15 bionic': 90,
            'dimensity 9300': 95,
            'dimensity 9200': 90,
            'exynos 2400': 90,
            
            # High-end chipsets (70-89)
            'snapdragon 7 gen 3': 85,
            'snapdragon 7 gen 2': 80,
            'snapdragon 7 gen 1': 75,
            'dimensity 8300': 85,
            'dimensity 8200': 80,
            'dimensity 8100': 75,
            'exynos 1480': 75,
            
            # Mid-range chipsets (50-69)
            'snapdragon 6 gen 1': 65,
            'snapdragon 695': 60,
            'snapdragon 680': 55,
            'dimensity 7050': 65,
            'dimensity 6100+': 60,
            'helio g99': 55,
            'helio g96': 50,
            
            # Entry-level chipsets (30-49)
            'snapdragon 4 gen 2': 45,
            'snapdragon 4 gen 1': 40,
            'helio g85': 40,
            'helio g36': 35,
            'unisoc tiger t606': 30,
        }
    
    def get_chipset_score(self, chipset: str) -> float:
        """Get performance score for a chipset."""
        if pd.isna(chipset):
            return 0.0
        
        chipset_lower = str(chipset).lower().strip()
        
        # Direct match
        if chipset_lower in self.chipset_rankings:
            return self.chipset_rankings[chipset_lower]
        
        # Fuzzy matching for partial matches
        for known_chipset, score in self.chipset_rankings.items():
            if known_chipset in chipset_lower or any(word in chipset_lower for word in known_chipset.split()):
                return score
        
        # Default score for unknown chipsets
        return 50.0
    
    def get_ram_score(self, ram: str) -> float:
        """Get performance score based on RAM."""
        if pd.isna(ram):
            return 0.0
        
        ram_str = str(ram).lower()
        ram_match = re.search(r'(\d+)', ram_str)
        
        if ram_match:
            ram_gb = int(ram_match.group(1))
            
            # Convert MB to GB if needed
            if 'mb' in ram_str:
                ram_gb = ram_gb / 1024
            
            # Score based on RAM amount
            if ram_gb >= 16:
                return 100.0
            elif ram_gb >= 12:
                return 90.0
            elif ram_gb >= 8:
                return 80.0
            elif ram_gb >= 6:
                return 70.0
            elif ram_gb >= 4:
                return 60.0
            elif ram_gb >= 3:
                return 50.0
            elif ram_gb >= 2:
                return 40.0
            else:
                return 30.0
        
        return 50.0
    
    def get_storage_score(self, storage: str) -> float:
        """Get performance score based on storage."""
        if pd.isna(storage):
            return 0.0
        
        storage_str = str(storage).lower()
        
        # Extract storage amount
        storage_match = re.search(r'(\d+)', storage_str)
        if storage_match:
            storage_amount = int(storage_match.group(1))
            
            # Convert to GB if needed
            if 'tb' in storage_str:
                storage_gb = storage_amount * 1024
            elif 'mb' in storage_str:
                storage_gb = storage_amount / 1024
            else:
                storage_gb = storage_amount
            
            # Base score on storage amount
            if storage_gb >= 1024:  # 1TB+
                base_score = 100.0
            elif storage_gb >= 512:
                base_score = 90.0
            elif storage_gb >= 256:
                base_score = 80.0
            elif storage_gb >= 128:
                base_score = 70.0
            elif storage_gb >= 64:
                base_score = 60.0
            elif storage_gb >= 32:
                base_score = 50.0
            else:
                base_score = 40.0
            
            # Bonus for SSD/UFS storage types
            if any(term in storage_str for term in ['ufs', 'ssd', 'nvme']):
                base_score = min(base_score + 10, 100.0)
            
            return base_score
        
        return 50.0
    
    def get_cpu_score(self, cpu: str, chipset: str) -> float:
        """Get CPU performance score."""
        if pd.isna(cpu) and pd.isna(chipset):
            return 0.0
        
        # If we have chipset info, use that as primary indicator
        if not pd.isna(chipset):
            chipset_score = self.get_chipset_score(chipset)
            return chipset_score
        
        # Otherwise, try to extract info from CPU string
        if not pd.isna(cpu):
            cpu_str = str(cpu).lower()
            
            # Look for core count and frequency
            core_match = re.search(r'(\d+)\s*core', cpu_str)
            freq_match = re.search(r'(\d+\.?\d*)\s*ghz', cpu_str)
            
            score = 50.0  # Base score
            
            if core_match:
                cores = int(core_match.group(1))
                if cores >= 8:
                    score += 20
                elif cores >= 6:
                    score += 15
                elif cores >= 4:
                    score += 10
            
            if freq_match:
                freq = float(freq_match.group(1))
                if freq >= 3.0:
                    score += 20
                elif freq >= 2.5:
                    score += 15
                elif freq >= 2.0:
                    score += 10
            
            return min(score, 100.0)
        
        return 50.0
    
    def get_gpu_score(self, gpu: str, chipset: str) -> float:
        """Get GPU performance score."""
        if pd.isna(gpu) and pd.isna(chipset):
            return 0.0
        
        # GPU performance is often tied to chipset
        if not pd.isna(chipset):
            chipset_score = self.get_chipset_score(chipset)
            # GPU score is typically slightly lower than overall chipset score
            return max(chipset_score - 5, 0)
        
        if not pd.isna(gpu):
            gpu_str = str(gpu).lower()
            
            # High-end GPUs
            if any(term in gpu_str for term in ['adreno 750', 'adreno 740', 'mali-g715', 'apple gpu']):
                return 95.0
            elif any(term in gpu_str for term in ['adreno 730', 'adreno 720', 'mali-g710']):
                return 85.0
            elif any(term in gpu_str for term in ['adreno 710', 'adreno 650', 'mali-g78']):
                return 75.0
            elif any(term in gpu_str for term in ['adreno 640', 'adreno 630', 'mali-g76']):
                return 65.0
            else:
                return 50.0
        
        return 50.0
    
    def get_performance_breakdown(self, device_data: pd.Series) -> Dict[str, float]:
        """Get detailed performance breakdown for a device."""
        
        # Get individual component scores
        cpu_score = self.get_cpu_score(device_data.get('cpu'), device_data.get('chipset'))
        gpu_score = self.get_gpu_score(device_data.get('gpu'), device_data.get('chipset'))
        ram_score = self.get_ram_score(device_data.get('ram'))
        storage_score = self.get_storage_score(device_data.get('internal_storage'))
        chipset_score = self.get_chipset_score(device_data.get('chipset'))
        
        # Calculate weighted overall score
        weights = {
            'chipset': 0.3,
            'cpu': 0.25,
            'gpu': 0.25,
            'ram': 0.15,
            'storage': 0.05
        }
        
        overall_score = (
            chipset_score * weights['chipset'] +
            cpu_score * weights['cpu'] +
            gpu_score * weights['gpu'] +
            ram_score * weights['ram'] +
            storage_score * weights['storage']
        )
        
        return {
            'chipset_score': round(chipset_score, 2),
            'cpu_score': round(cpu_score, 2),
            'gpu_score': round(gpu_score, 2),
            'ram_score': round(ram_score, 2),
            'storage_score': round(storage_score, 2),
            'overall_score': round(overall_score, 2),
            'performance_category': self._get_performance_category(overall_score)
        }
    
    def _get_performance_category(self, score: float) -> str:
        """Get performance category based on score."""
        if score >= 90:
            return 'Flagship'
        elif score >= 80:
            return 'High-end'
        elif score >= 70:
            return 'Upper Mid-range'
        elif score >= 60:
            return 'Mid-range'
        elif score >= 50:
            return 'Entry-level'
        else:
            return 'Basic'