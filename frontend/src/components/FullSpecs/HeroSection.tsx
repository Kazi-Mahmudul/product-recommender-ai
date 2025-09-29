import React, { useState } from "react";
import { Phone } from "../../api/phones";
import { FaMicrochip, FaMemory, FaCamera, FaMobileAlt, FaBatteryFull, FaBolt, FaHdd, FaCalendarAlt, FaUser, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { useComparison } from "../../context/ComparisonContext";

interface HeroSectionProps {
  phone: Phone;
  onAISummary: () => void;
  onAddToCompare: () => void;
  tagline: string;
  loadingTagline: boolean;
}

const specIcons: Record<string, React.ReactNode> = {
  Storage: <FaHdd className="inline mr-1 text-gray-400" />, // Storage
  RAM: <FaMemory className="inline mr-1 text-gray-400" />, // RAM
  MainCamera: <FaCamera className="inline mr-1 text-gray-400" />, // Main Camera
  FrontCamera: <FaCamera className="inline mr-1 text-gray-400 rotate-180" />, // Front Camera
  Display: <FaMobileAlt className="inline mr-1 text-gray-400" />, // Display size
  BatteryCapacity: <FaBatteryFull className="inline mr-1 text-gray-400" />, // Battery capacity
};

const HeroSection: React.FC<HeroSectionProps> = ({ phone, onAISummary, onAddToCompare, tagline, loadingTagline }) => {
  // For carousel, but fallback to single image
  const images = phone.img_url ? [phone.img_url] : ["/no-image-placeholder.svg"];
  const [imgIdx, setImgIdx] = useState(0);
  
  // Use comparison context to check selection state
  const { isPhoneSelected } = useComparison();
  const isSelected = isPhoneSelected(phone.slug!);

  // Key specs for grid
  const specs = [
    { label: "Storage", value: (phone as any).internal_storage || (typeof (phone as any).storage_gb === "number" ? `${(phone as any).storage_gb} GB` : "-"), icon: specIcons.Storage },
    { label: "RAM", value: (phone as any).ram || (typeof (phone as any).ram_gb === "number" ? `${(phone as any).ram_gb} GB` : "-"), icon: specIcons.RAM },
    { label: "Main Camera", value: (phone as any).main_camera || ((phone as any).primary_camera_mp ? `${(phone as any).primary_camera_mp} MP` : (phone as any).camera_setup || "-"), icon: specIcons.MainCamera },
    { label: "Front Camera", value: (phone as any).front_camera || ((phone as any).selfie_camera_mp ? `${(phone as any).selfie_camera_mp} MP` : "-"), icon: specIcons.FrontCamera },
    { label: "Display", value: (typeof (phone as any).screen_size_numeric === "number" && (phone as any).screen_size_numeric > 0) ? `${(phone as any).screen_size_numeric}"` : ((phone as any).screen_size_inches ? `${(phone as any).screen_size_inches}"` : "-"), icon: specIcons.Display },
    { label: "Battery", value: (typeof (phone as any).battery_capacity_numeric === "number" && (phone as any).battery_capacity_numeric > 0) ? `${(phone as any).battery_capacity_numeric} mAh` : (phone as any).capacity || "-", icon: specIcons.BatteryCapacity },
  ];

  return (
    <section className="rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col md:flex-row items-center gap-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full">
      {/* Image/Carousel */}
      <div className="flex flex-col items-center w-full md:w-1/2 max-w-xs sm:max-w-sm md:max-w-xs lg:max-w-sm xl:max-w-md">
        <div className="relative w-full flex justify-center items-center">
          <img
            src={images[imgIdx]}
            alt={phone.name}
            className="w-48 h-60 sm:w-64 sm:h-80 md:w-56 md:h-72 lg:w-72 lg:h-96 object-contain rounded-xl bg-gray-100 dark:bg-gray-800 transition-all duration-300"
            onError={(e) => {
              e.currentTarget.src = "/no-image-placeholder.svg";
            }}
          />
          {images.length > 1 && (
            <>
              <button
                className="absolute left-0 top-1/2 -translate-y-1/2 bg-gray-200 dark:bg-gray-700 rounded-full p-1 shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50"
                onClick={() => setImgIdx((imgIdx - 1 + images.length) % images.length)}
                disabled={imgIdx === 0}
                aria-label="Previous image"
              >
                &#8592;
              </button>
              <button
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-200 dark:bg-gray-700 rounded-full p-1 shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50"
                onClick={() => setImgIdx((imgIdx + 1) % images.length)}
                disabled={imgIdx === images.length - 1}
                aria-label="Next image"
              >
                &#8594;
              </button>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 mt-2 justify-center">
            {images.map((img, idx) => (
              <button
                key={img}
                className={`w-4 h-4 rounded-full border-2 ${idx === imgIdx ? "border-gray-700 dark:border-gray-200" : "border-gray-300 dark:border-gray-700"} bg-gray-200 dark:bg-gray-700 transition`}
                onClick={() => setImgIdx(idx)}
                aria-label={`Show image ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
      {/* Info & Specs */}
      <div className="flex-1 flex flex-col gap-2 w-full md:w-1/2">
        {/* Name, price, brand, status, release, made by, UI, OS */}
        <div className="mb-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1 break-words">{phone.name}</h1>
          <div className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-200 mb-1">Tk. {phone.price}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-1">
            <span><FaUser className="inline mr-1 text-gray-400" />{phone.brand}</span>
            {(phone as any).release_date && <span><FaCalendarAlt className="inline mr-1 text-gray-400" />{(phone as any).release_date}</span>}
            {(phone as any).made_by && <span><FaUser className="inline mr-1 text-gray-400" />{(phone as any).made_by}</span>}
            {(phone as any).user_interface && <span><FaMicrochip className="inline mr-1 text-gray-400" />{(phone as any).user_interface}</span>}
            {(phone as any).operating_system && <span><FaMicrochip className="inline mr-1 text-gray-400" />{(phone as any).operating_system}</span>}
          </div>
        </div>
        {/* Specs grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm mb-2">
          {specs.map(spec => (
            <div key={spec.label} className="flex items-center gap-1 text-gray-700 dark:text-gray-200">
              {spec.icon}
              <span className="font-medium">{spec.label}:</span>
              <span className="ml-1">{spec.value}</span>
            </div>
          ))}
        </div>
        {/* Buttons */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={onAISummary}
            className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 font-semibold shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
          >
            AI Summary
          </button>
          <button
            onClick={onAddToCompare}
            className={`flex-1 rounded-lg px-3 py-2 font-semibold shadow transition-all duration-200 focus:outline-none focus:ring-2 ${
              isSelected
                ? 'bg-brand hover:bg-brand-darkGreen text-white hover:text-black focus:ring-brand'
                : 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 focus:ring-gray-400 dark:focus:ring-gray-600'
            }`}
            title={isSelected ? 'Remove from comparison' : 'Add to comparison'}
          >
            {isSelected ? 'Added to Compare' : 'Compare'}
          </button>
        </div>
        {/* Tagline */}
        <div className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic min-h-[1.5em]">
          {loadingTagline ? <span className="animate-pulse">Generating summary...</span> : tagline}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
