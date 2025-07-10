import React from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

interface WhyChooseEpickProps {
  darkMode: boolean;
}

const features = [
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path d="M3 21l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M9 15l3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M12 12l9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M16 5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'AI-Powered Recommendations',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path d="M4 18v-2a4 4 0 014-4h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M8 14l3-3 3 3 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Smart Device Comparisons',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    title: 'Localized for Bangladesh',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'More Categories\nComing',
  },
];

const sliderSettings = {
  dots: false,
  infinite: true,
  speed: 500,
  slidesToShow: 3,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 3000,
  pauseOnHover: true,
  pauseOnFocus: true,
  responsive: [
    { breakpoint: 1280, settings: { slidesToShow: 3 } },
    { breakpoint: 768, settings: { slidesToShow: 2 } },
    { breakpoint: 480, settings: { slidesToShow: 1 } },
  ],
};

const WhyChooseEpick: React.FC<WhyChooseEpickProps> = ({ darkMode }) => {
  return (
    <section className="w-full max-w-5xl mx-auto px-2 md:px-6 py-8">
      <h2 className={`text-2xl md:text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'} text-left`}>Why Choose <span className="text-brand">ePick</span>?</h2>
      <Slider {...sliderSettings} className="w-full">
        {features.map((f, i) => (
          <div key={i} className="pr-4">
            <div
              className={`flex items-center rounded-lg border px-6 py-5 min-w-[220px] max-w-[260px] h-[72px] flex-shrink-0 transition-all
                ${darkMode ? 'bg-[#232323] text-white border-[#36312b]' : 'bg-white text-gray-900 border-[#eae4da]'}
              `}
            >
              <span className="mr-4 flex-shrink-0">{f.icon}</span>
              <span className="font-bold text-base md:text-lg leading-tight text-left whitespace-pre-line">{f.title}</span>
            </div>
          </div>
        ))}
      </Slider>
    </section>
  );
};

export default WhyChooseEpick;
