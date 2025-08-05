import React from 'react';
import { Phone } from '../api/phones';
import { ArrowLeft } from 'lucide-react';

interface FeatureDetailViewProps {
  phones: Phone[];
  feature: string;
  darkMode: boolean;
  onBackToSimple?: () => void;
}

interface FeatureConfig {
  title: string;
  icon: string;
  description: string;
  fields: Array<{
    key: keyof Phone;
    label: string;
    unit?: string;
    formatter?: (value: any) => string;
    importance?: 'high' | 'medium' | 'low';
  }>;
  insights: (phones: Phone[]) => string[];
}

const FeatureDetailView: React.FC<FeatureDetailViewProps> = ({
  phones,
  feature,
  darkMode,
  onBackToSimple
}) => {
  const featureConfigs: Record<string, FeatureConfig> = {
    display: {
      title: 'Display Analysis',
      icon: '📱',
      description: 'Comprehensive analysis of display quality, size, and technology',
      fields: [
        { key: 'display_type', label: 'Display Technology', importance: 'high' },
        { key: 'screen_size_numeric', label: 'Screen Size', unit: 'inches', importance: 'high', formatter: (v) => v?.toFixed(1) || 'N/A' },
        { key: 'display_resolution', label: 'Resolution', importance: 'high' },
        { key: 'ppi_numeric', label: 'Pixel Density', unit: 'PPI', importance: 'medium' },
        { key: 'refresh_rate_numeric', label: 'Refresh Rate', unit: 'Hz', importance: 'high' },
        { key: 'screen_protection', label: 'Screen Protection', importance: 'medium' },
        { key: 'display_brightness', label: 'Brightness', importance: 'medium' },
        { key: 'aspect_ratio', label: 'Aspect Ratio', importance: 'low' },
        { key: 'hdr_support', label: 'HDR Support', importance: 'medium' },
        { key: 'display_score', label: 'Display Score', unit: '/10', importance: 'high', formatter: (v) => v?.toFixed(1) || 'N/A' }
      ],
      insights: (phones) => {
        const insights = [];
        const highRefreshPhones = phones.filter(p => p.refresh_rate_numeric && p.refresh_rate_numeric >= 90);
        const largeScreenPhones = phones.filter(p => p.screen_size_numeric && p.screen_size_numeric >= 6.5);
        const highPpiPhones = phones.filter(p => p.ppi_numeric && p.ppi_numeric >= 400);
        
        if (highRefreshPhones.length > 0) {
          insights.push(`${highRefreshPhones.length} phone(s) have high refresh rate displays (90Hz+) for smoother scrolling and gaming`);
        }
        if (largeScreenPhones.length > 0) {
          insights.push(`${largeScreenPhones.length} phone(s) have large screens (6.5+ inches) ideal for media consumption`);
        }
        if (highPpiPhones.length > 0) {
          insights.push(`${highPpiPhones.length} phone(s) have high pixel density (400+ PPI) for sharp text and images`);
        }
        
        return insights;
      }
    },
    camera: {
      title: 'Camera Analysis',
      icon: '📸',
      description: 'Detailed camera specifications and photography capabilities',
      fields: [
        { key: 'camera_setup', label: 'Camera Setup', importance: 'high' },
        { key: 'primary_camera_mp', label: 'Main Camera', unit: 'MP', importance: 'high' },
        { key: 'selfie_camera_mp', label: 'Front Camera', unit: 'MP', importance: 'medium' },
        { key: 'primary_camera_video_recording', label: 'Video Recording', importance: 'medium' },
        { key: 'primary_camera_ois', label: 'Optical Stabilization', importance: 'high' },
        { key: 'primary_camera_aperture', label: 'Main Camera Aperture', importance: 'medium' },
        { key: 'selfie_camera_aperture', label: 'Front Camera Aperture', importance: 'low' },
        { key: 'camera_features', label: 'Camera Features', importance: 'medium' },
        { key: 'camera_count', label: 'Total Cameras', importance: 'medium' },
        { key: 'camera_score', label: 'Camera Score', unit: '/10', importance: 'high', formatter: (v) => v?.toFixed(1) || 'N/A' }
      ],
      insights: (phones) => {
        const insights = [];
        const highMpPhones = phones.filter(p => p.primary_camera_mp && p.primary_camera_mp >= 48);
        const oisPhones = phones.filter(p => p.primary_camera_ois === 'Yes');
        const multiCameraPhones = phones.filter(p => p.camera_count && p.camera_count >= 3);
        
        if (highMpPhones.length > 0) {
          insights.push(`${highMpPhones.length} phone(s) have high-resolution main cameras (48MP+) for detailed photos`);
        }
        if (oisPhones.length > 0) {
          insights.push(`${oisPhones.length} phone(s) have optical image stabilization for sharper photos and videos`);
        }
        if (multiCameraPhones.length > 0) {
          insights.push(`${multiCameraPhones.length} phone(s) have multiple cameras for versatile photography options`);
        }
        
        return insights;
      }
    },
    battery: {
      title: 'Battery Analysis',
      icon: '🔋',
      description: 'Battery capacity, charging technology, and power efficiency',
      fields: [
        { key: 'battery_capacity_numeric', label: 'Battery Capacity', unit: 'mAh', importance: 'high' },
        { key: 'battery_type', label: 'Battery Type', importance: 'low' },
        { key: 'quick_charging', label: 'Quick Charging', importance: 'high' },
        { key: 'wireless_charging', label: 'Wireless Charging', importance: 'medium' },
        { key: 'reverse_charging', label: 'Reverse Charging', importance: 'low' },
        { key: 'has_fast_charging', label: 'Fast Charging Support', importance: 'high', formatter: (v) => v ? 'Yes' : 'No' },
        { key: 'has_wireless_charging', label: 'Wireless Charging Support', importance: 'medium', formatter: (v) => v ? 'Yes' : 'No' },
        { key: 'charging_wattage', label: 'Charging Power', unit: 'W', importance: 'medium' },
        { key: 'battery_score', label: 'Battery Score', unit: '/10', importance: 'high', formatter: (v) => v?.toFixed(1) || 'N/A' }
      ],
      insights: (phones) => {
        const insights = [];
        const largeBatteryPhones = phones.filter(p => p.battery_capacity_numeric && p.battery_capacity_numeric >= 4500);
        const fastChargingPhones = phones.filter(p => p.has_fast_charging);
        const wirelessChargingPhones = phones.filter(p => p.has_wireless_charging);
        
        if (largeBatteryPhones.length > 0) {
          insights.push(`${largeBatteryPhones.length} phone(s) have large batteries (4500mAh+) for all-day usage`);
        }
        if (fastChargingPhones.length > 0) {
          insights.push(`${fastChargingPhones.length} phone(s) support fast charging for quick power-ups`);
        }
        if (wirelessChargingPhones.length > 0) {
          insights.push(`${wirelessChargingPhones.length} phone(s) support wireless charging for convenient charging`);
        }
        
        return insights;
      }
    },
    performance: {
      title: 'Performance Analysis',
      icon: '⚡',
      description: 'Processing power, memory, and storage specifications',
      fields: [
        { key: 'chipset', label: 'Chipset', importance: 'high' },
        { key: 'cpu', label: 'CPU', importance: 'medium' },
        { key: 'gpu', label: 'GPU', importance: 'medium' },
        { key: 'ram_gb', label: 'RAM', unit: 'GB', importance: 'high' },
        { key: 'ram_type', label: 'RAM Type', importance: 'low' },
        { key: 'storage_gb', label: 'Storage', unit: 'GB', importance: 'high' },
        { key: 'storage_type', label: 'Storage Type', importance: 'medium' },
        { key: 'performance_score', label: 'Performance Score', unit: '/10', importance: 'high', formatter: (v) => v?.toFixed(1) || 'N/A' }
      ],
      insights: (phones) => {
        const insights = [];
        const highRamPhones = phones.filter(p => p.ram_gb && p.ram_gb >= 8);
        const largeStoragePhones = phones.filter(p => p.storage_gb && p.storage_gb >= 128);
        const flagshipChipsets = phones.filter(p => p.chipset && (
          p.chipset.includes('Snapdragon 8') || 
          p.chipset.includes('A17') || 
          p.chipset.includes('A16') ||
          p.chipset.includes('Dimensity 9')
        ));
        
        if (highRamPhones.length > 0) {
          insights.push(`${highRamPhones.length} phone(s) have 8GB+ RAM for smooth multitasking`);
        }
        if (largeStoragePhones.length > 0) {
          insights.push(`${largeStoragePhones.length} phone(s) have 128GB+ storage for apps and media`);
        }
        if (flagshipChipsets.length > 0) {
          insights.push(`${flagshipChipsets.length} phone(s) have flagship-level chipsets for top performance`);
        }
        
        return insights;
      }
    }
  };

  const config = featureConfigs[feature] || featureConfigs.display;
  const insights = config.insights(phones);

  const formatValue = (value: any, field: FeatureConfig['fields'][0]): string => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }

    if (field.formatter) {
      return field.formatter(value);
    }

    if (field.unit) {
      return `${value} ${field.unit}`;
    }

    return String(value);
  };

  const getImportanceColor = (importance: string, darkMode: boolean) => {
    switch (importance) {
      case 'high':
        return darkMode ? 'text-red-400' : 'text-red-600';
      case 'medium':
        return darkMode ? 'text-yellow-400' : 'text-yellow-600';
      case 'low':
        return darkMode ? 'text-gray-400' : 'text-gray-500';
      default:
        return darkMode ? 'text-gray-300' : 'text-gray-700';
    }
  };

  return (
    <div className={`max-w-6xl mx-auto p-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onBackToSimple && (
            <button
              onClick={onBackToSimple}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              aria-label="Back to simple view"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span>{config.icon}</span>
              {config.title}
            </h2>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {config.description}
            </p>
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <span>💡</span>
            Key Insights
          </h3>
          <ul className="space-y-1">
            {insights.map((insight, index) => (
              <li key={index} className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                • {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Comparison Table */}
      <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-4 py-3 text-left font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Feature
                </th>
                {phones.map((phone, index) => (
                  <th key={index} className={`px-4 py-3 text-left font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    <div className="flex items-center gap-2">
                      <img
                        src={phone.img_url || '/phone.png'}
                        alt={phone.name}
                        className="w-8 h-8 object-contain rounded"
                      />
                      <div>
                        <div className="font-medium">{phone.brand}</div>
                        <div className="text-xs opacity-75">{phone.model}</div>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.fields.map((field, fieldIndex) => {
                const hasData = phones.some(phone => {
                  const value = phone[field.key];
                  return value !== null && value !== undefined && value !== '';
                });

                if (!hasData) return null;

                return (
                  <tr key={fieldIndex} className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <td className={`px-4 py-3 font-medium ${getImportanceColor(field.importance || 'medium', darkMode)}`}>
                      <div className="flex items-center gap-2">
                        {field.label}
                        {field.importance === 'high' && <span className="text-xs">⭐</span>}
                      </div>
                    </td>
                    {phones.map((phone, phoneIndex) => (
                      <td key={phoneIndex} className={`px-4 py-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {formatValue(phone[field.key], field)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-xs">⭐</span>
          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>High importance</span>
        </div>
        <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-red-400' : 'bg-red-600'}`}></div>
        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Critical specs</span>
        <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-yellow-400' : 'bg-yellow-600'}`}></div>
        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Important specs</span>
        <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-gray-400' : 'bg-gray-500'}`}></div>
        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Additional specs</span>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Detailed {feature} analysis for {phones.length} phone(s)
        </p>
        {onBackToSimple && (
          <button
            onClick={onBackToSimple}
            className="mt-4 px-6 py-2 bg-brand text-white rounded-lg hover:bg-brand-darkGreen transition-colors"
          >
            Back to Simple View
          </button>
        )}
      </div>
    </div>
  );
};

export default FeatureDetailView;