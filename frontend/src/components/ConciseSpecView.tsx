import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

interface PhoneInfo {
  id: number;
  name: string;
  brand: string;
  price: number;
  img_url: string;
  score: number;
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US').format(price);
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
    <div className={`max-w-4xl mx-auto p-6 rounded-2xl ${darkMode ? 'bg-[#181818] border-gray-700' : 'bg-[#f7f3ef] border-[#eae4da]'} border shadow-lg`}>
      <div className="mb-6">
        <h3 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <span>📋</span>
          {message}
        </h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {uniquePhones.map((phone) => (
          <div 
            key={phone.id}
            className={`rounded-xl p-5 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-xl ${
              darkMode 
                ? 'bg-gray-800 hover:bg-gray-700 border-gray-600' 
                : 'bg-white hover:bg-gray-50 border-gray-200'
            } border flex flex-col h-full`}
            onClick={() => handlePhoneClick(phone.name)}
          >
            <div className="flex items-start gap-4 flex-1">
              {phone.img_url ? (
                <div className="flex-shrink-0">
                  <img 
                    src={phone.img_url} 
                    alt={phone.name}
                    className="w-16 h-16 object-contain rounded-lg bg-white dark:bg-gray-700 p-1"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-200'
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
                <div className="flex items-center justify-between mt-auto">
                  <span className={`font-extrabold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    ৳{formatPrice(phone.price)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end">
              <div className="flex items-center gap-1 text-brand font-medium text-sm">
                <span>View Details</span>
                <ExternalLink size={14} />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className={`mt-6 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        🔍 Tap on any phone to view complete specifications
      </div>
    </div>
  );
};

export default ConciseSpecView;