import React from "react";
import { Phone } from "../api/phones";

interface FeatureDetailViewProps {
  phones: Phone[];
  analysis: any;
  message: string;
  darkMode: boolean;
  onBackToSimple?: () => void;
}

const FeatureDetailView: React.FC<FeatureDetailViewProps> = ({
  phones,
  analysis,
  message,
  darkMode,
  onBackToSimple,
}) => {
  // Format field names for display
  const formatFieldName = (field: string): string => {
    const fieldMap: Record<string, string> = {
      id: "ID",
      name: "Name",
      brand: "Brand",
      model: "Model",
      price: "Price",
      display_type: "Display Type",
      screen_size_inches: "Screen Size",
      display_resolution: "Resolution",
      pixel_density_ppi: "Pixel Density",
      refresh_rate_hz: "Refresh Rate",
      screen_protection: "Screen Protection",
      display_brightness: "Brightness",
      aspect_ratio: "Aspect Ratio",
      hdr_support: "HDR Support",
      chipset: "Chipset",
      cpu: "CPU",
      gpu: "GPU",
      ram: "RAM",
      ram_type: "RAM Type",
      internal_storage: "Storage",
      storage_type: "Storage Type",
      camera_setup: "Camera Setup",
      primary_camera_mp: "Main Camera",
      selfie_camera_mp: "Selfie Camera",
      primary_camera_video_recording: "Video Recording",
      selfie_camera_video_recording: "Selfie Video",
      primary_camera_ois: "OIS",
      primary_camera_aperture: "Main Aperture",
      selfie_camera_aperture: "Selfie Aperture",
      camera_features: "Camera Features",
      autofocus: "Autofocus",
      flash: "Flash",
      settings: "Settings",
      zoom: "Zoom",
      shooting_modes: "Shooting Modes",
      video_fps: "Video FPS",
      battery_type: "Battery Type",
      capacity: "Capacity",
      quick_charging: "Quick Charging",
      wireless_charging: "Wireless Charging",
      reverse_charging: "Reverse Charging",
      build: "Build",
      weight: "Weight",
      thickness: "Thickness",
      colors: "Colors",
      waterproof: "Waterproof",
      ip_rating: "IP Rating",
      ruggedness: "Ruggedness",
      network: "Network",
      speed: "Speed",
      sim_slot: "SIM Slot",
      volte: "VoLTE",
      bluetooth: "Bluetooth",
      wlan: "WLAN",
      gps: "GPS",
      nfc: "NFC",
      usb: "USB",
      usb_otg: "USB OTG",
      fingerprint_sensor: "Fingerprint",
      finger_sensor_type: "Sensor Type",
      finger_sensor_position: "Sensor Position",
      face_unlock: "Face Unlock",
      light_sensor: "Light Sensor",
      infrared: "Infrared",
      fm_radio: "FM Radio",
      operating_system: "OS",
      os_version: "OS Version",
      user_interface: "UI",
      status: "Status",
      made_by: "Made By",
      release_date: "Release Date",
    };
    return (
      fieldMap[field] ||
      field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    );
  };

  return (
    <div className={`max-w-6xl mx-auto p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-[#eae4da]'} border shadow-xl`}>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h3 className={`text-2xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <span className="text-2xl">🔍</span>
            {message}
          </h3>
          {onBackToSimple && (
            <button
              onClick={onBackToSimple}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
            >
              Back to Simple View
            </button>
          )}
        </div>
        <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Detailed analysis of {analysis.target} features for {phones.length} phone(s)
        </p>
      </div>
      
      {/* Insights */}
      {analysis.insights && analysis.insights.length > 0 && (
        <div className={`p-4 rounded-lg mb-6 ${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
          <h4 className={`font-bold mb-2 flex items-center gap-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
            <span>💡</span> Key Insights
          </h4>
          <ul className="space-y-1">
            {analysis.insights.map((insight: string, index: number) => (
              <li key={index} className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                • {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Phone Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {analysis.phones && analysis.phones.map((phoneAnalysis: any, index: number) => (
          <div 
            key={index}
            className={`rounded-xl p-5 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}
          >
            <h4 className={`font-bold text-lg mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {phoneAnalysis.name} {phoneAnalysis.brand && `(${phoneAnalysis.brand})`}
            </h4>
            
            <div className="space-y-2">
              {Object.entries(phoneAnalysis.features).map(([field, value]: [string, any]) => (
                <div key={field} className="flex justify-between items-center text-sm">
                  <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {formatFieldName(field)}:
                  </span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className={`mt-6 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        🔍 Detailed feature analysis
      </div>
    </div>
  );
};

export default FeatureDetailView;