import React from "react";
import { getThemeClasses } from "../utils/colorUtils";
import { ExternalLink } from "lucide-react";

import { Phone } from "../api/phones";

interface ChatSpecTableProps {
  phones: Phone[];
  darkMode: boolean;
  onPhoneSelect?: (phoneId: string) => void;
}

// Group specifications into logical categories
const specGroups = [
  {
    name: "Basic",
    specs: [
      { key: "brand", label: "Brand" },
      { key: "price", label: "Price", prefix: "৳ " },
    ],
  },
  {
    name: "Performance",
    specs: [
      { key: "chipset", label: "Chipset", fallbackKey: "cpu" },
      { key: "ram", label: "RAM" },
      { key: "internal_storage", label: "Storage" },
    ],
  },
  {
    name: "Display",
    specs: [
      { key: "display_type", label: "Type" },
      { key: "screen_size_inches", label: "Size", suffix: '"' },
      { key: "resolution", label: "Resolution" },
      { key: "refresh_rate", label: "Refresh Rate", suffix: " Hz" },
    ],
  },
  {
    name: "Camera",
    specs: [
      { key: "main_camera", label: "Main Camera" },
      { key: "front_camera", label: "Front Camera" },
    ],
  },
  {
    name: "Battery",
    specs: [
      { 
        key: "battery_capacity_numeric", 
        label: "Capacity", 
        suffix: " mAh",
        fallbackKey: "capacity" 
      },
      { key: "charging", label: "Charging" },
    ],
  },
];

const ChatSpecTable: React.FC<ChatSpecTableProps> = ({
  phones,
  darkMode,
  onPhoneSelect,
}) => {
  const themeClasses = getThemeClasses(darkMode);
  
  // Helper function to get the value of a spec
  const getSpecValue = (phone: Phone, spec: { key: string; label: string; prefix?: string; suffix?: string; fallbackKey?: string }) => {
    let value = phone[spec.key as keyof Phone];
    
    // Use fallback key if the primary key doesn't have a value
    if ((!value || value === "N/A") && spec.fallbackKey && phone[spec.fallbackKey as keyof Phone]) {
      value = phone[spec.fallbackKey as keyof Phone];
    }
    
    // Format the value
    if (value === undefined || value === null) {
      return "N/A";
    }
    
    // Add prefix and suffix if provided
    return `${spec.prefix || ""}${value}${spec.suffix || ""}`;
  };
  
  // Helper function to determine if a value should be highlighted
  const shouldHighlight = (phones: Phone[], spec: { key: string; fallbackKey?: string }) => {
    // Get all values for this spec
    const values = phones.map(phone => {
      let value = phone[spec.key as keyof Phone];
      if ((!value || value === "N/A") && spec.fallbackKey) {
        value = phone[spec.fallbackKey as keyof Phone];
      }
      return value;
    });
    
    // If all values are the same, don't highlight any
    if (values.every(v => v === values[0])) {
      return values.map(() => false);
    }
    
    // For numeric values, highlight the highest
    if (values.every(v => !isNaN(Number(v)))) {
      const numValues = values.map(v => Number(v));
      const maxValue = Math.max(...numValues);
      return numValues.map(v => v === maxValue);
    }
    
    // For non-numeric values, don't highlight any
    return values.map(() => false);
  };
  
  return (
    <div className={themeClasses.chartContainer}>
      <div className="font-semibold mb-2 text-[#377D5B]">
        Phone Specifications
      </div>
      
      <div className="overflow-x-auto">
        <table className={themeClasses.table}>
          <thead>
            <tr>
              <th className={`${themeClasses.tableHeader} sticky left-0 z-10`}>Specification</th>
              {phones.map((phone, index) => (
                <th key={index} className={themeClasses.tableHeader}>
                  {phone.name}
                  {onPhoneSelect && phone.id && (
                    <button
                      className="ml-1 inline-flex items-center justify-center opacity-70 hover:opacity-100"
                      onClick={() => onPhoneSelect(String(phone.id!))}
                      aria-label={`View details for ${phone.name}`}
                    >
                      <ExternalLink size={14} />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {specGroups.map((group, groupIndex) => (
              <React.Fragment key={groupIndex}>
                {/* Group header */}
                <tr className={darkMode ? "bg-gray-700" : "bg-gray-100"}>
                  <td
                    colSpan={phones.length + 1}
                    className="px-2 py-1 font-semibold text-sm"
                  >
                    {group.name}
                  </td>
                </tr>
                
                {/* Group specs */}
                {group.specs.map((spec, specIndex) => {
                  const highlights = shouldHighlight(phones, spec);
                  
                  return (
                    <tr
                      key={`${groupIndex}-${specIndex}`}
                      className={specIndex % 2 === 0 ? themeClasses.tableRowEven : themeClasses.tableRowOdd}
                    >
                      <td className="px-2 py-1 font-medium sticky left-0 z-10 bg-inherit">
                        {spec.label}
                      </td>
                      {phones.map((phone, phoneIndex) => (
                        <td
                          key={phoneIndex}
                          className={`px-2 py-1 ${
                            highlights[phoneIndex]
                              ? darkMode
                                ? "text-[#80EF80] font-semibold"
                                : "text-[#377D5B] font-semibold"
                              : ""
                          }`}
                        >
                          {getSpecValue(phone, spec)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Action buttons */}
      <div className="mt-4 flex justify-end gap-2">
        {phones.map((phone, index) => (
          phone.id && onPhoneSelect && (
            <button
              key={index}
              onClick={() => onPhoneSelect(String(phone.id!))}
              className={`text-xs px-3 py-1 rounded-full ${
                darkMode
                  ? "bg-gray-800 hover:bg-gray-700 text-white"
                  : "bg-[#eae4da] hover:bg-[#d4c8b8] text-[#6b4b2b]"
              }`}
            >
              View {phone.name}
            </button>
          )
        ))}
      </div>
    </div>
  );
};

export default ChatSpecTable;