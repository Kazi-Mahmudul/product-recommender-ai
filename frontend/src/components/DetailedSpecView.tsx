import React from "react";
import { Phone } from "../api/phones";
import { useNavigate } from "react-router-dom";

interface DetailedSpecViewProps {
  phones: Phone[];
  message: string;
  darkMode: boolean;
  onBackToSimple?: () => void;
}

const DetailedSpecView: React.FC<DetailedSpecViewProps> = ({
  phones,
  message,
  darkMode,
  onBackToSimple,
}) => {
  const navigate = useNavigate();

  // Generate slug from phone name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  // Format field names for display
  const formatFieldName = (field: string): string => {
    const fieldMap: Record<string, string> = {
      id: "ID",
      name: "Name",
      brand: "Brand",
      model: "Model",
      price: "Price",
      display_type: "Display Type",
      screen_size_inches: "Screen Size (inches)",
      display_resolution: "Display Resolution",
      pixel_density_ppi: "Pixel Density (PPI)",
      refresh_rate_hz: "Refresh Rate (Hz)",
      screen_protection: "Screen Protection",
      display_brightness: "Display Brightness",
      aspect_ratio: "Aspect Ratio",
      hdr_support: "HDR Support",
      chipset: "Chipset",
      cpu: "CPU",
      gpu: "GPU",
      ram: "RAM",
      ram_type: "RAM Type",
      internal_storage: "Internal Storage",
      storage_type: "Storage Type",
      camera_setup: "Camera Setup",
      primary_camera_mp: "Primary Camera (MP)",
      selfie_camera_mp: "Selfie Camera (MP)",
      primary_camera_video_recording: "Primary Camera Video Recording",
      selfie_camera_video_recording: "Selfie Camera Video Recording",
      primary_camera_ois: "Primary Camera OIS",
      primary_camera_aperture: "Primary Camera Aperture",
      selfie_camera_aperture: "Selfie Camera Aperture",
      camera_features: "Camera Features",
      autofocus: "Autofocus",
      flash: "Flash",
      settings: "Settings",
      zoom: "Zoom",
      shooting_modes: "Shooting Modes",
      video_fps: "Video FPS",
      battery_type: "Battery Type",
      capacity: "Battery Capacity",
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
      fingerprint_sensor: "Fingerprint Sensor",
      finger_sensor_type: "Finger Sensor Type",
      finger_sensor_position: "Finger Sensor Position",
      face_unlock: "Face Unlock",
      light_sensor: "Light Sensor",
      infrared: "Infrared",
      fm_radio: "FM Radio",
      operating_system: "Operating System",
      os_version: "OS Version",
      user_interface: "User Interface",
      status: "Status",
      made_by: "Made By",
      release_date: "Release Date",
    };
    return (
      fieldMap[field] ||
      field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    );
  };

  // Fields to show in full specification table
  const fullSpecFields = [
    "id",
    "name",
    "brand",
    "model",
    "price",
    "display_type",
    "screen_size_inches",
    "display_resolution",
    "pixel_density_ppi",
    "refresh_rate_hz",
    "screen_protection",
    "display_brightness",
    "aspect_ratio",
    "hdr_support",
    "chipset",
    "cpu",
    "gpu",
    "ram",
    "ram_type",
    "internal_storage",
    "storage_type",
    "camera_setup",
    "primary_camera_mp",
    "selfie_camera_mp",
    "primary_camera_video_recording",
    "selfie_camera_video_recording",
    "primary_camera_ois",
    "primary_camera_aperture",
    "selfie_camera_aperture",
    "camera_features",
    "autofocus",
    "flash",
    "settings",
    "zoom",
    "shooting_modes",
    "video_fps",
    "battery_type",
    "capacity",
    "quick_charging",
    "wireless_charging",
    "reverse_charging",
    "build",
    "weight",
    "thickness",
    "colors",
    "waterproof",
    "ip_rating",
    "ruggedness",
    "network",
    "speed",
    "sim_slot",
    "volte",
    "bluetooth",
    "wlan",
    "gps",
    "nfc",
    "usb",
    "usb_otg",
    "fingerprint_sensor",
    "finger_sensor_type",
    "finger_sensor_position",
    "face_unlock",
    "light_sensor",
    "infrared",
    "fm_radio",
    "operating_system",
    "os_version",
    "user_interface",
    "status",
    "made_by",
    "release_date",
  ];

  return (
    <div className={`max-w-6xl mx-auto p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-[#eae4da]'} border shadow-xl`}>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h3 className={`text-2xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <span className="text-2xl">📋</span>
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
          Complete technical specifications for {phones.length} phone(s)
        </p>
      </div>
      
      <div className="space-y-8">
        {phones.map((phone, index) => (
          <div 
            key={phone.id || index}
            className={`rounded-xl p-6 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} cursor-pointer hover:scale-[1.01] transition-transform`}
            onClick={() => navigate(`/phones/${generateSlug(phone.name)}`)}
          >
            <h4 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {phone.name} {phone.brand && `(${phone.brand})`}
            </h4>
            
            <div className="overflow-x-auto">
              <table className={`min-w-full border-separate ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`} style={{ borderSpacing: '0 0.25rem' }}>
                <tbody>
                  {fullSpecFields.map((field) => {
                    const value = (phone as any)[field];
                    // Only show fields that have values
                    if (value === null || value === undefined || value === "") {
                      return null;
                    }
                    
                    return (
                      <tr key={field} className="border-b border-gray-200 dark:border-gray-700">
                        <td className={`py-2 px-4 font-semibold whitespace-nowrap ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          {formatFieldName(field)}
                        </td>
                        <td className={`py-2 px-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                          {value}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      
      <div className={`mt-6 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        🔍 Click on any phone to view in detail page
      </div>
    </div>
  );
};

export default DetailedSpecView;