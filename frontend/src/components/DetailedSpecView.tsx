import React, { useState } from 'react';
import { Phone } from '../api/phones';
import { ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

interface DetailedSpecViewProps {
  phones: Phone[];
  darkMode: boolean;
  onBackToSimple?: () => void;
}

interface SpecSection {
  title: string;
  icon: string;
  fields: Array<{
    key: keyof Phone;
    label: string;
    unit?: string;
    formatter?: (value: any) => string;
  }>;
}

const DetailedSpecView: React.FC<DetailedSpecViewProps> = ({
  phones,
  darkMode,
  onBackToSimple
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));
  const [selectedPhone, setSelectedPhone] = useState<number>(0);

  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  const specSections: SpecSection[] = [
    {
      title: 'Basic Information',
      icon: '📱',
      fields: [
        { key: 'name', label: 'Model Name' },
        { key: 'brand', label: 'Brand' },
        { key: 'price', label: 'Price', unit: 'BDT' },
        { key: 'price_category', label: 'Price Category' },
        { key: 'overall_device_score', label: 'Overall Score', unit: '/10', formatter: (v) => v?.toFixed(1) || 'N/A' }
      ]
    },
    {
      title: 'Display',
      icon: '🖥️',
      fields: [
        { key: 'display_type', label: 'Display Type' },
        { key: 'screen_size_numeric', label: 'Screen Size', unit: 'inches', formatter: (v) => v?.toFixed(1) || 'N/A' },
        { key: 'display_resolution', label: 'Resolution' },
        { key: 'ppi_numeric', label: 'Pixel Density', unit: 'PPI' },
        { key: 'refresh_rate_numeric', label: 'Refresh Rate', unit: 'Hz' },
        { key: 'screen_protection', label: 'Screen Protection' },
        { key: 'display_brightness', label: 'Brightness' },
        { key: 'aspect_ratio', label: 'Aspect Ratio' },
        { key: 'hdr_support', label: 'HDR Support' },
        { key: 'display_score', label: 'Display Score', unit: '/10', formatter: (v) => v?.toFixed(1) || 'N/A' }
      ]
    },
    {
      title: 'Performance',
      icon: '⚡',
      fields: [
        { key: 'chipset', label: 'Chipset' },
        { key: 'cpu', label: 'CPU' },
        { key: 'gpu', label: 'GPU' },
        { key: 'ram', label: 'RAM' },
        { key: 'ram_gb', label: 'RAM Capacity', unit: 'GB' },
        { key: 'ram_type', label: 'RAM Type' },
        { key: 'internal_storage', label: 'Storage' },
        { key: 'storage_gb', label: 'Storage Capacity', unit: 'GB' },
        { key: 'storage_type', label: 'Storage Type' },
        { key: 'performance_score', label: 'Performance Score', unit: '/10', formatter: (v) => v?.toFixed(1) || 'N/A' }
      ]
    },
    {
      title: 'Camera',
      icon: '📸',
      fields: [
        { key: 'camera_setup', label: 'Camera Setup' },
        { key: 'primary_camera_mp', label: 'Main Camera', unit: 'MP' },
        { key: 'selfie_camera_mp', label: 'Front Camera', unit: 'MP' },
        { key: 'primary_camera_video_recording', label: 'Main Camera Video' },
        { key: 'selfie_camera_video_recording', label: 'Front Camera Video' },
        { key: 'primary_camera_ois', label: 'OIS (Main)' },
        { key: 'primary_camera_aperture', label: 'Main Camera Aperture' },
        { key: 'selfie_camera_aperture', label: 'Front Camera Aperture' },
        { key: 'camera_features', label: 'Camera Features' },
        { key: 'camera_count', label: 'Total Cameras' },
        { key: 'camera_score', label: 'Camera Score', unit: '/10', formatter: (v) => v?.toFixed(1) || 'N/A' }
      ]
    },
    {
      title: 'Battery',
      icon: '🔋',
      fields: [
        { key: 'battery_type', label: 'Battery Type' },
        { key: 'battery_capacity_numeric', label: 'Capacity', unit: 'mAh' },
        { key: 'quick_charging', label: 'Quick Charging' },
        { key: 'wireless_charging', label: 'Wireless Charging' },
        { key: 'reverse_charging', label: 'Reverse Charging' },
        { key: 'has_fast_charging', label: 'Fast Charging', formatter: (v) => v ? 'Yes' : 'No' },
        { key: 'has_wireless_charging', label: 'Wireless Charging', formatter: (v) => v ? 'Yes' : 'No' },
        { key: 'charging_wattage', label: 'Charging Power', unit: 'W' },
        { key: 'battery_score', label: 'Battery Score', unit: '/10', formatter: (v) => v?.toFixed(1) || 'N/A' }
      ]
    },
    {
      title: 'Design & Build',
      icon: '🎨',
      fields: [
        { key: 'build', label: 'Build Materials' },
        { key: 'weight', label: 'Weight' },
        { key: 'thickness', label: 'Thickness' },
        { key: 'colors', label: 'Available Colors' },
        { key: 'waterproof', label: 'Water Resistance' },
        { key: 'ip_rating', label: 'IP Rating' },
        { key: 'ruggedness', label: 'Ruggedness' }
      ]
    },
    {
      title: 'Connectivity',
      icon: '📶',
      fields: [
        { key: 'network', label: 'Network Support' },
        { key: 'speed', label: 'Network Speed' },
        { key: 'sim_slot', label: 'SIM Slot' },
        { key: 'volte', label: 'VoLTE' },
        { key: 'bluetooth', label: 'Bluetooth' },
        { key: 'wlan', label: 'Wi-Fi' },
        { key: 'gps', label: 'GPS' },
        { key: 'nfc', label: 'NFC' },
        { key: 'usb', label: 'USB' },
        { key: 'usb_otg', label: 'USB OTG' },
        { key: 'connectivity_score', label: 'Connectivity Score', unit: '/10', formatter: (v) => v?.toFixed(1) || 'N/A' }
      ]
    },
    {
      title: 'Security & Sensors',
      icon: '🔒',
      fields: [
        { key: 'fingerprint_sensor', label: 'Fingerprint Sensor' },
        { key: 'finger_sensor_type', label: 'Fingerprint Type' },
        { key: 'finger_sensor_position', label: 'Fingerprint Position' },
        { key: 'face_unlock', label: 'Face Unlock' },
        { key: 'light_sensor', label: 'Light Sensor' },
        { key: 'infrared', label: 'Infrared' },
        { key: 'fm_radio', label: 'FM Radio' },
        { key: 'security_score', label: 'Security Score', unit: '/10', formatter: (v) => v?.toFixed(1) || 'N/A' }
      ]
    },
    {
      title: 'Software & Status',
      icon: '💾',
      fields: [
        { key: 'operating_system', label: 'Operating System' },
        { key: 'os_version', label: 'OS Version' },
        { key: 'user_interface', label: 'User Interface' },
        { key: 'status', label: 'Status' },
        { key: 'made_by', label: 'Manufacturer' },
        { key: 'release_date', label: 'Release Date' },
        { key: 'is_new_release', label: 'New Release', formatter: (v) => v ? 'Yes' : 'No' },
        { key: 'age_in_months', label: 'Age', unit: 'months' },
        { key: 'is_upcoming', label: 'Upcoming', formatter: (v) => v ? 'Yes' : 'No' }
      ]
    }
  ];

  const formatValue = (value: any, field: SpecSection['fields'][0]): string => {
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

  const currentPhone = phones[selectedPhone];

  return (
    <div className={`max-w-4xl mx-auto p-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
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
          <h2 className="text-2xl font-bold">📋 Detailed Specifications</h2>
        </div>
      </div>

      {/* Phone Selector */}
      {phones.length > 1 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {phones.map((phone, index) => (
              <button
                key={index}
                onClick={() => setSelectedPhone(index)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedPhone === index
                    ? 'bg-brand text-white'
                    : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {phone.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Specifications */}
      <div className="space-y-4">
        {specSections.map((section, sectionIndex) => {
          const isExpanded = expandedSections.has(section.title.toLowerCase().replace(/\s+/g, '_'));
          const hasData = section.fields.some(field => {
            const value = currentPhone[field.key];
            return value !== null && value !== undefined && value !== '';
          });

          if (!hasData) return null;

          return (
            <div
              key={sectionIndex}
              className={`rounded-lg border ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } overflow-hidden`}
            >
              <button
                onClick={() => toggleSection(section.title.toLowerCase().replace(/\s+/g, '_'))}
                className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{section.icon}</span>
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                </div>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {isExpanded && (
                <div className={`px-6 pb-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {section.fields.map((field, fieldIndex) => {
                      const value = currentPhone[field.key];
                      if (value === null || value === undefined || value === '') return null;

                      return (
                        <div key={fieldIndex} className="flex justify-between items-center py-2">
                          <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {field.label}:
                          </span>
                          <span className={`text-right ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatValue(value, field)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Showing detailed specifications for {currentPhone.name}
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

export default DetailedSpecView;