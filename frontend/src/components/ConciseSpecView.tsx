import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Star, Battery, Camera, Zap } from 'lucide-react';

interface PhoneInfo {
  id: number;
  name: string;
  brand: string;
  price: number | string;
  img_url: string;
  score: number;
  // Add some key specs for the concise view
  primary_camera_mp?: number;
  battery_capacity?: number;
  ram_gb?: number;
  has_fast_charging?: boolean;
}

interface ConciseSpecViewProps {
  phones: PhoneInfo[];
  darkMode: boolean;
  message: string;
}

const ConciseSpecView: React.FC<ConciseSpecViewProps> = ({ 
  phones, 
  darkMode,
  message
}) => {
  const navigate = useNavigate();

  // Generate slug from phone name (e.g., "Samsung Galaxy A55" -> "samsung-galaxy-a55")
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  };

  const handlePhoneClick = (phoneName: string) => {
    const slug = generateSlug(phoneName);
    navigate(`/phones/${slug}`);
  };

  const formatPrice = (price: number | string) => {
    const numericPrice = typeof price === 'string' ? parseInt(price, 10) : price;
    return new Intl.NumberFormat('en-US').format(numericPrice);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-yellow-500';
    if (score >= 4) return 'text-orange-500';
    return 'text-red-500';
  };

  // Remove duplicate phones
  const uniquePhones = phones.filter((phone, index, self) => 
    index === self.findIndex(p => p.id === phone.id)
  );

  return (
    <div className={`max-w-4xl mx-auto p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-[#eae4da]'} border shadow-xl`}>
      <div className="mb-6">
        <h3 className={`text-2xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <span className="text-2xl">📋</span>
          {message}
        </h3>
        <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Tap on any phone to view complete specifications and detailed comparison
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {uniquePhones.map((phone) => (
          <div 
            key={phone.id}
            className={`rounded-2xl p-5 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-2xl ${
              darkMode 
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border-gray-700' 
                : 'bg-gradient-to-br from-white to-gray-50 hover:from-gray-50 hover:to-white border-gray-200'
            } border flex flex-col h-full relative overflow-hidden`}
            onClick={() => handlePhoneClick(phone.name)}
          >
            {/* Score badge */}
            <div className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
              getScoreColor(phone.score)
            } ${darkMode ? 'bg-gray-900/80' : 'bg-white/80'} backdrop-blur-sm`}>
              <Star size={12} />
              {phone.score.toFixed(1)}
            </div>
            
            <div className="flex items-start gap-4 flex-1">
              {phone.img_url ? (
                <div className="flex-shrink-0">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <img 
                      src={phone.img_url} 
                      alt={phone.name}
                      className="w-14 h-14 object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <span className="text-2xl">📱</span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className={`font-bold text-lg truncate ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                  {phone.name}
                </h4>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                  {phone.brand}
                </p>
                
                {/* Key specs */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {phone.primary_camera_mp && (
                    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                      darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}>
                      <Camera size={12} />
                      {phone.primary_camera_mp}MP
                    </div>
                  )}
                  {phone.battery_capacity && (
                    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                      darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}>
                      <Battery size={12} />
                      {phone.battery_capacity}mAh
                    </div>
                  )}
                  {phone.ram_gb && (
                    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                      darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}>
                      <Zap size={12} />
                      {phone.ram_gb}GB RAM
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-auto">
                  <span className={`font-extrabold text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    ৳{formatPrice(phone.price)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end">
              <div className="flex items-center gap-1 text-brand font-semibold text-sm">
                <span>View Details</span>
                <ExternalLink size={14} />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className={`mt-6 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        🔍 Tap on any phone to view complete specifications and detailed comparison
      </div>
    </div>
  );
};

export default ConciseSpecView;