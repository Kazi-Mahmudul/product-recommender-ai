import React, { useState } from "react";
import { Phone } from "../../api/phones";

// SVG icons (Lucide style, inline for now)
const icons = {
  Display: (
    <svg width="22" height="22" fill="none" stroke="#7c3aed" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 21h8"/></svg>
  ),
  Performance: (
    <svg width="22" height="22" fill="none" stroke="#0ea5e9" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
  ),
  Camera: (
    <svg width="22" height="22" fill="none" stroke="#f59e42" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
  ),
  Battery: (
    <svg width="22" height="22" fill="none" stroke="#22c55e" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2"/></svg>
  ),
  Storage: (
    <svg width="22" height="22" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14"/><path d="M17 5v14"/></svg>
  ),
  Build: (
    <svg width="22" height="22" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
  ),
  OS: (
    <svg width="22" height="22" fill="none" stroke="#06b6d4" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4v16"/><path d="M15 4v16"/></svg>
  ),
  Connectivity: (
    <svg width="22" height="22" fill="none" stroke="#fbbf24" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 8.82A15.94 15.94 0 0 1 12 4c3.18 0 6.18 1 8.82 2.82"/><path d="M22 15.18A15.94 15.94 0 0 1 12 20c-3.18 0-6.18-1-8.82-2.82"/><path d="M16 12a4 4 0 0 0-8 0"/></svg>
  ),
  Security: (
    <svg width="22" height="22" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  ),
};

const categoryFields = [
  {
    key: "Display",
    icon: icons.Display,
    fields: [
      { key: "display_type", label: "Display Type" },
      { key: "screen_size_inches", label: "Screen Size (inches)" },
      { key: "display_resolution", label: "Resolution" },
      { key: "pixel_density_ppi", label: "Pixel Density (PPI)" },
      { key: "refresh_rate_hz", label: "Refresh Rate (Hz)" },
      { key: "screen_protection", label: "Screen Protection" },
      { key: "display_brightness", label: "Brightness" },
      { key: "aspect_ratio", label: "Aspect Ratio" },
      { key: "hdr_support", label: "HDR Support" },
    ],
  },
  {
    key: "Performance",
    icon: icons.Performance,
    fields: [
      { key: "chipset", label: "Chipset" },
      { key: "cpu", label: "CPU" },
      { key: "gpu", label: "GPU" },
      { key: "performance_score", label: "Performance Score" },
    ],
  },
  {
    key: "Camera",
    icon: icons.Camera,
    fields: [
      { key: "camera_setup", label: "Camera Setup" },
      { key: "primary_camera_mp", label: "Primary Camera (MP)" },
      { key: "selfie_camera_mp", label: "Selfie Camera (MP)" },
      { key: "primary_camera_video_recording", label: "Primary Cam Video" },
      { key: "selfie_camera_video_recording", label: "Selfie Cam Video" },
      { key: "primary_camera_ois", label: "Primary Cam OIS" },
      { key: "primary_camera_aperture", label: "Primary Cam Aperture" },
      { key: "selfie_camera_aperture", label: "Selfie Cam Aperture" },
      { key: "camera_features", label: "Camera Features" },
      { key: "autofocus", label: "Autofocus" },
      { key: "flash", label: "Flash" },
      { key: "settings", label: "Settings" },
      { key: "zoom", label: "Zoom" },
      { key: "shooting_modes", label: "Shooting Modes" },
      { key: "video_fps", label: "Video FPS" },
      { key: "camera_score", label: "Camera Score" },
    ],
  },
  {
    key: "Battery",
    icon: icons.Battery,
    fields: [
      { key: "battery_type", label: "Battery Type" },
      { key: "capacity", label: "Capacity" },
      { key: "battery_capacity_numeric", label: "Capacity (mAh)" },
      { key: "quick_charging", label: "Quick Charging" },
      { key: "wireless_charging", label: "Wireless Charging" },
      { key: "reverse_charging", label: "Reverse Charging" },
      { key: "has_fast_charging", label: "Fast Charging" },
      { key: "has_wireless_charging", label: "Wireless Charging (bool)" },
      { key: "charging_wattage", label: "Charging Wattage (W)" },
      { key: "battery_score", label: "Battery Score" },
    ],
  },
  {
    key: "Storage & RAM",
    icon: icons.Storage,
    fields: [
      { key: "ram", label: "RAM" },
      { key: "ram_type", label: "RAM Type" },
      { key: "ram_gb", label: "RAM (GB)" },
      { key: "internal_storage", label: "Storage" },
      { key: "storage_type", label: "Storage Type" },
      { key: "storage_gb", label: "Storage (GB)" },
    ],
  },
  {
    key: "Build & Design",
    icon: icons.Build,
    fields: [
      { key: "build", label: "Build" },
      { key: "weight", label: "Weight" },
      { key: "thickness", label: "Thickness" },
      { key: "colors", label: "Colors" },
      { key: "waterproof", label: "Waterproof" },
      { key: "ip_rating", label: "IP Rating" },
      { key: "ruggedness", label: "Ruggedness" },
    ],
  },
  {
    key: "OS & UI",
    icon: icons.OS,
    fields: [
      { key: "operating_system", label: "Operating System" },
      { key: "os_version", label: "OS Version" },
      { key: "user_interface", label: "User Interface" },
    ],
  },
  {
    key: "Connectivity",
    icon: icons.Connectivity,
    fields: [
      { key: "network", label: "Network" },
      { key: "speed", label: "Speed" },
      { key: "sim_slot", label: "SIM Slot" },
      { key: "volte", label: "VoLTE" },
      { key: "bluetooth", label: "Bluetooth" },
      { key: "wlan", label: "WLAN" },
      { key: "gps", label: "GPS" },
      { key: "nfc", label: "NFC" },
      { key: "usb", label: "USB" },
      { key: "usb_otg", label: "USB OTG" },
      { key: "connectivity_score", label: "Connectivity Score" },
    ],
  },
  {
    key: "Security",
    icon: icons.Security,
    fields: [
      { key: "fingerprint_sensor", label: "Fingerprint Sensor" },
      { key: "finger_sensor_type", label: "Finger Sensor Type" },
      { key: "finger_sensor_position", label: "Finger Sensor Position" },
      { key: "face_unlock", label: "Face Unlock" },
      { key: "light_sensor", label: "Light Sensor" },
      { key: "infrared", label: "Infrared" },
      { key: "fm_radio", label: "FM Radio" },
      { key: "security_score", label: "Security Score" },
    ],
  },
];

interface FullSpecsAccordionProps {
  phone: Phone;
}

const FullSpecsAccordion: React.FC<FullSpecsAccordionProps> = ({ phone }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <div className="rounded-2xl shadow border max-w-xl mx-auto bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700">
      {categoryFields.map((cat, idx) => {
        // Only show categories with at least one value
        const specs = cat.fields
          .map(f => ({ label: f.label, value: phone[f.key as keyof Phone] }))
          .filter(s => s.value !== undefined && s.value !== null && s.value !== "");
        if (specs.length === 0) return null;
        return (
          <div key={cat.key} className="border-b last:border-b-0 border-gray-100 dark:border-gray-800">
            <button
              className={`w-full flex items-center justify-between px-3 py-2 md:px-4 md:py-4 text-left focus:outline-none transition ${openIndex === idx ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}`}
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              aria-expanded={openIndex === idx}
            >
              <div className="flex items-center gap-2 md:gap-3">
                <span className="shrink-0">{cat.icon}</span>
                <span className="font-semibold text-sm md:text-base truncate text-gray-900 dark:text-white">{cat.key}</span>
              </div>
              <span className={`transition-transform duration-200 ${openIndex === idx ? "rotate-180" : "rotate-0"}`}>
                <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
              </span>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${openIndex === idx ? "max-h-96 py-1 md:py-2" : "max-h-0 py-0"} ${openIndex === idx ? 'bg-[#f8fafc] dark:bg-gray-800' : ''}`}
            >
              <ul className="px-4 md:px-8 pb-1 md:pb-2">
                {specs.map((spec) => (
                  <li key={spec.label} className="flex justify-between py-1 md:py-2 text-xs md:text-sm border-b last:border-b-0 text-gray-700 border-gray-100 dark:text-gray-200 dark:border-gray-800" style={{wordBreak: 'break-word'}}>
                    <span className="font-medium text-gray-800 dark:text-gray-100 truncate">{spec.label}</span>
                    <span className="text-gray-600 dark:text-gray-300">{String(spec.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FullSpecsAccordion;
