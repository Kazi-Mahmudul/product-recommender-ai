import React, { useEffect, useState } from 'react';
import Slider from 'react-slick';
import axios from 'axios';

interface Phone {
  id: string;
  name: string;
  price: number;
  img_url: string;
  overall_device_score: number;
  is_popular_brand: boolean;
  is_new_release: boolean;
  age_in_months: number;
  is_upcoming: boolean;
}

const sliderSettings = {
  dots: false,
  infinite: false,
  speed: 500,
  slidesToShow: 4,
  slidesToScroll: 1,
  responsive: [
    {
      breakpoint: 1536, // 2xl screens
      settings: { slidesToShow: 5 }
    },
    {
      breakpoint: 1280, // xl screens
      settings: { slidesToShow: 4 }
    },
    {
      breakpoint: 1024, // lg screens
      settings: { slidesToShow: 3 }
    },
    {
      breakpoint: 768, // md screens
      settings: { slidesToShow: 2 }
    },
    {
      breakpoint: 480, // sm screens
      settings: { slidesToShow: 1 }
    }
  ]
};

interface TrendingPhonesProps {
  darkMode: boolean;
}

const CustomArrow: React.FC<{ direction: 'next' | 'prev'; darkMode: boolean; onClick?: () => void }> = ({ direction, darkMode, onClick }) => (
  <button
    type="button"
    className={`slick-arrow z-20 w-10 h-10 flex items-center justify-center rounded-full shadow-lg absolute top-1/2 -translate-y-1/2
      ${direction === 'next' ? 'right-1 sm:right-1 md:right-[-36px]' : 'left-1 sm:left-1 md:left-[-36px]'}
      ${darkMode ? 'bg-[#3b2a1a] text-white' : 'bg-[#f4e2d4] text-[#7c4a1e]'}
      hover:scale-110 transition-all border border-[#eabf9f]'}`
    }
    style={{ outline: 'none' }}
    onClick={onClick}
    aria-label={direction === 'next' ? 'Next' : 'Previous'}
  >
    {direction === 'next' ? (
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M7 15l5-5-5-5v10z" /></svg>
    ) : (
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M13 5l-5 5 5 5V5z" /></svg>
    )}
  </button>
);

const TrendingPhones: React.FC<TrendingPhonesProps> = ({ darkMode }) => {
  const [phones, setPhones] = useState<Phone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhones = async () => {
      try {
        const res = await axios.get('https://pickbd-ai.onrender.com/api/v1/phones/');
        const items = res.data.items || [];
        const filtered = items.filter((phone: Phone) =>
          phone.is_popular_brand === true &&
          phone.is_new_release === true &&
          phone.age_in_months <= 1 &&
          phone.is_upcoming === false
        );
        filtered.sort((a: Phone, b: Phone) => b.overall_device_score - a.overall_device_score);
        setPhones(filtered.slice(0, 5));
      } catch (err) {
        setPhones([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPhones();
  }, []);

  if (loading) return <div className={`py-10 text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>Loading...</div>;
  if (!phones.length) return <div className={`py-10 text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>No trending phones found.</div>;

  return (
    <section className="w-full max-w-5xl mx-auto px-2 md:px-6 py-10 overflow-x-hidden">
      <h2 className={`text-2xl md:text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Trending Phones</h2>
      <Slider
        {...sliderSettings}
        nextArrow={<CustomArrow direction="next" darkMode={darkMode} />}
        prevArrow={<CustomArrow direction="prev" darkMode={darkMode} />}
      >
        {phones.map(phone => (
          <div key={phone.id} className="px-4">
            <div className={`rounded-2xl shadow flex flex-col items-center p-4 h-full min-w-[200px] max-w-[220px] mx-auto transition-all border border-[#eabf9f] ${darkMode ? ' text-white' : ' text-gray-900'}`}>
              <img
                src={phone.img_url}
                alt={phone.name}
                className="w-28 h-40 object-contain mb-3 rounded-lg bg-gray-50"
                loading="lazy"
              />
              <div className={`font-semibold text-base truncate w-full text-center mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{phone.name}</div>
              <div className="text-brand text-lg font-bold w-full text-center">{phone.price.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </Slider>
    </section>
  );
};

export default TrendingPhones;
