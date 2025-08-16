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

  const handlePhoneClick = (phoneId: number) => {
    navigate(`/phone/${phoneId}`);
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

  return (
    <div className={`max-w-2xl mx-auto p-4 rounded-2xl ${darkMode ? 'bg-[#181818] border-gray-700' : 'bg-[#f7f3ef] border-[#eae4da]'} border`}>
      <div className="mb-4">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          📋 {message}
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {phones.map((phone) => (
          <div 
            key={phone.id}
            className={`rounded-xl p-4 transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-lg ${
              darkMode 
                ? 'bg-gray-800 hover:bg-gray-700 border-gray-600' 
                : 'bg-white hover:bg-gray-50 border-gray-200'
            } border`}
            onClick={() => handlePhoneClick(phone.id)}
          >
            <div className="flex items-start gap-3">
              {phone.img_url ? (
                <img 
                  src={phone.img_url} 
                  alt={phone.name}
                  className="w-16 h-16 object-contain rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  <span className="text-xl">📱</span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className={`font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {phone.name}
                </h4>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {phone.brand}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    ৳{formatPrice(phone.price)}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-semibold ${getScoreColor(phone.score)}`}>
                      {phone.score?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              
              <ExternalLink 
                size={16} 
                className={`flex-shrink-0 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} 
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        🔍 Tap on any phone to view complete specifications
      </div>
    </div>
  );
};

export default ConciseSpecView;