import React, { useState, useEffect, useRef } from 'react';
import { Phone, fetchPhones } from '../../api/phones';

interface PhonePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhone: (phone: Phone) => void;
  excludePhoneSlugs?: string[];
  suggestedPhones?: Phone[];
  title?: string;
}

const PhonePickerModal: React.FC<PhonePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectPhone,
  excludePhoneSlugs = [],
  suggestedPhones = [],
  title = "Select a Phone"
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [phones, setPhones] = useState<Phone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch phones when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPhonesData();
      setSelectedIndex(-1);
      // Focus search input when modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery]);

  const fetchPhonesData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetchPhones({ pageSize: 100 });
      setPhones(response.items);
    } catch (error) {
      console.error('Error fetching phones:', error);
      setError('Failed to load phones. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate suggested phones based on current comparison context
  const getSuggestedPhones = (): Phone[] => {
    if (suggestedPhones.length > 0) {
      return suggestedPhones;
    }

    // If no explicit suggestions, generate based on popular phones or similar price range
    const availablePhones = phones.filter(phone => 
      !excludePhoneSlugs.includes(phone.slug!)
    );
    
    // Sort by popularity/score and return top phones
    return availablePhones
      .sort((a, b) => {
        const scoreA = a.overall_device_score || 0;
        const scoreB = b.overall_device_score || 0;
        return scoreB - scoreA;
      })
      .slice(0, 4);
  };

  // Filter phones based on search query and exclusions
  const filteredPhones = phones.filter(phone => {
    if (excludePhoneSlugs.includes(phone.slug!)) return false;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        phone.name.toLowerCase().includes(query) ||
        phone.brand.toLowerCase().includes(query) ||
        phone.model.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const handlePhoneSelect = (phone: Phone) => {
    onSelectPhone(phone);
    onClose();
    setSearchQuery('');
  };

  const handleClose = () => {
    onClose();
    setSearchQuery('');
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const availablePhones = [...(getSuggestedPhones().length > 0 && !searchQuery ? getSuggestedPhones().slice(0, 4) : []), ...filteredPhones.slice(0, 20)];
    const validPhones = availablePhones.filter(phone => 
      !excludePhoneSlugs.includes(phone.slug!)
    );

    switch (e.key) {
      case 'Escape':
        handleClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < validPhones.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < validPhones.length) {
          handlePhoneSelect(validPhones[selectedIndex]);
        }
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          ref={modalRef}
          className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
          onKeyDown={handleKeyDown}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 id="modal-title" className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search phones by name, brand, or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#2d5016] focus:border-transparent"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-96">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-gray-500 bg-gray-100 dark:bg-gray-700">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading phones...
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
                <button
                  onClick={fetchPhonesData}
                  className="px-4 py-2 bg-[#2d5016] hover:bg-[#3d6b1f] text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Suggested Phones */}
                {getSuggestedPhones().length > 0 && !searchQuery && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Suggested for Comparison
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                      {getSuggestedPhones().slice(0, 4).map((phone, index) => (
                        <PhoneCard
                          key={phone.slug}
                          phone={phone}
                          onSelect={handlePhoneSelect}
                          isExcluded={excludePhoneSlugs.includes(phone.slug!)}
                          isSelected={selectedIndex === index}
                          index={index}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* All Phones */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    {searchQuery ? `Search Results (${filteredPhones.length})` : 'All Phones'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredPhones.slice(0, 20).map((phone, index) => {
                      const adjustedIndex = getSuggestedPhones().length > 0 && !searchQuery ? index + 4 : index;
                      return (
                        <PhoneCard
                          key={phone.slug}
                          phone={phone}
                          onSelect={handlePhoneSelect}
                          isExcluded={false}
                          isSelected={selectedIndex === adjustedIndex}
                          index={adjustedIndex}
                        />
                      );
                    })}
                  </div>
                  
                  {filteredPhones.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No phones found matching your search.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Phone card component for the modal
interface PhoneCardProps {
  phone: Phone;
  onSelect: (phone: Phone) => void;
  isExcluded: boolean;
  isSelected?: boolean;
  index: number;
}

const PhoneCard: React.FC<PhoneCardProps> = ({ phone, onSelect, isExcluded, isSelected = false, index }) => {
  return (
    <button
      onClick={() => !isExcluded && onSelect(phone)}
      disabled={isExcluded}
      tabIndex={isExcluded ? -1 : 0}
      className={`
        p-3 rounded-lg border text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2d5016] focus:ring-offset-2
        ${isExcluded 
          ? 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-50 cursor-not-allowed'
          : isSelected
            ? 'bg-[#2d5016]/10 dark:bg-[#4ade80]/10 border-[#2d5016] dark:border-[#4ade80] shadow-md'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-[#2d5016] dark:hover:border-[#4ade80] hover:shadow-md'
        }
      `}
      data-index={index}
    >
      <div className="flex items-center gap-3">
        <img
          src={phone.img_url || "/no-image-placeholder.svg"}
          alt={phone.name}
          className="w-12 h-16 object-contain rounded bg-gray-50 dark:bg-gray-600"
          onError={(e) => {
            e.currentTarget.src = "/no-image-placeholder.svg";
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {phone.brand}
          </div>
          <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {phone.name}
          </div>
          <div className="text-sm font-semibold text-[#2d5016] dark:text-[#4ade80]">
            Tk. {phone.price}
          </div>
          {isExcluded && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Already in comparison
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

export default PhonePickerModal;