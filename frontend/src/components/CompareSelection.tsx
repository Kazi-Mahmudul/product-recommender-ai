import React from "react";
import { X } from "lucide-react";
import { getThemeClasses } from "../utils/colorUtils";

import { Phone } from "../types/phone";

interface CompareSelectionProps {
  selectedPhones: Phone[];
  darkMode: boolean;
  onRemovePhone: (phoneId: string) => void;
  onCompareSelected: () => void;
  maxPhones?: number;
}

const CompareSelection: React.FC<CompareSelectionProps> = ({
  selectedPhones,
  darkMode,
  onRemovePhone,
  onCompareSelected,
  maxPhones = 4,
}) => {
  const themeClasses = getThemeClasses(darkMode);
  
  if (selectedPhones.length === 0) {
    return null;
  }
  
  return (
    <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg ${
      darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-[#eae4da]"
    } border`}>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
          Selected for comparison ({selectedPhones.length}/{maxPhones}):
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          {selectedPhones.map((phone) => (
            <div 
              key={phone.id} 
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
                darkMode ? "bg-gray-700 text-white" : "bg-[#f7f3ef] text-gray-800"
              }`}
            >
              <img 
                src={phone.img_url || "/phone.png"} 
                alt={phone.name} 
                className="w-5 h-5 object-contain rounded-full"
              />
              <span className="text-xs font-medium truncate max-w-[100px]">{phone.name}</span>
              <button
                onClick={() => phone.id && onRemovePhone(phone.id)}
                className={`w-4 h-4 flex items-center justify-center rounded-full ${
                  darkMode ? "bg-gray-600 hover:bg-gray-500" : "bg-[#eae4da] hover:bg-[#d4c8b8]"
                }`}
                aria-label={`Remove ${phone.name} from comparison`}
              >
                <X size={10} />
              </button>
            </div>
          ))}
          
          <button
            onClick={onCompareSelected}
            disabled={selectedPhones.length < 2}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedPhones.length < 2
                ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                : "bg-[#377D5B] hover:bg-[#377D5B]/90 text-white"
            }`}
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompareSelection;