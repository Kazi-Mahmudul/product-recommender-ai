import React, { useEffect, useState } from "react";
import Slider from "react-slick";
import axios from "axios";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Phone } from '../api/phones';
import { generatePhoneDetailUrl } from "../utils/slugUtils";

const sliderSettings = {
  dots: true,
  dotsClass: "slick-dots custom-dots",
  infinite: true,
  speed: 500,
  slidesToShow: 3,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 4000,
  pauseOnHover: true,
  pauseOnFocus: true,
  responsive: [
    {
      breakpoint: 1536, // 2xl screens
      settings: { slidesToShow: 3 },
    },
    {
      breakpoint: 1280, // xl screens
      settings: { slidesToShow: 2 },
    },
    {
      breakpoint: 1024, // lg screens
      settings: { slidesToShow: 2 },
    },
    {
      breakpoint: 640, // sm screens
      settings: { slidesToShow: 1 },
    },
  ],
};

interface TopSearchedPhonesProps {
  darkMode: boolean;
}

const TopSearchedPhones: React.FC<TopSearchedPhonesProps> = ({ darkMode }) => {
  const [phones, setPhones] = useState<Phone[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPhones = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_BASE}/api/v1/top-searched/`
        );
        setPhones(res.data || []);
      } catch (err) {
        console.error("Error fetching top searched phones:", err);
        setPhones([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPhones();
  }, []);

  if (loading) {
    return (
      <section className="w-full max-w-6xl mx-auto px-4 md:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-700 dark:text-white">
            Top Searched Phones in Bangladesh
          </h2>
        </div>
        <div className="flex justify-center items-center py-20">
          <div className="w-12 h-12 rounded-full border-4 border-t-brand border-brand/30 animate-spin"></div>
        </div>
      </section>
    );
  }

  if (!phones.length) {
    return (
      <section className="w-full max-w-6xl mx-auto px-4 md:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-700 dark:text-white">
            Top Searched Phones in Bangladesh
          </h2>
        </div>
        <div className="text-center py-16 text-neutral-500 dark:text-neutral-400">
          No top searched phones data available.
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-7xl rounded-3xl mx-auto px-4 md:px-8 py-16 relative shadow-soft-lg">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full filter blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-darkGreen/5 rounded-full filter blur-3xl -z-10"></div>

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-neutral-700 dark:text-white">
          Top Searched Phones in Bangladesh
        </h2>
        <a
          href="/phones"
          className="flex items-center gap-2 text-brand hover:text-brand-darkGreen transition-colors duration-300 font-medium"
        >
          View all <ArrowRight size={16} />
        </a>
      </div>

      <div className="phone-slider-container relative">
        <Slider {...sliderSettings} className="phone-slider">
          {phones.map((phone, index) => (
            <div key={phone.id} className="px-2 py-1">
              <div 
                className="rounded-2xl bg-white dark:bg-card overflow-hidden transition-all duration-300 hover:shadow-soft-lg group cursor-pointer h-full"
                onClick={() => phone.slug && navigate(generatePhoneDetailUrl(phone.slug))}
              >
                {/* Card Header with Rank Badge */}
                <div className="relative">
                  {/* Image Container with Gradient Background */}
                  <div className="relative h-40 bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center p-4">
                    <img
                      src={phone.img_url || "/no-image-placeholder.svg"}
                      alt={phone.name}
                      className="h-32 object-contain transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = "/no-image-placeholder.svg";
                      }}
                      loading="lazy"
                    />
                    
                    {/* Brand Badge */}
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-white/90 dark:bg-card/90 shadow-sm backdrop-blur-sm text-xs font-medium text-brand dark:text-white">
                      {phone.brand || "Brand"}
                    </div>
                    
                    {/* Rank Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center px-2 py-1 bg-brand/10 text-brand text-xs font-bold rounded-full">
                        #{index + 1}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Card Content - Simplified */}
                <div className="p-4">
                  {/* Phone Name */}
                  <h3 className="font-medium text-sm text-neutral-800 dark:text-white mb-2 line-clamp-2 h-10" title={phone.name}>
                    {phone.name}
                  </h3>
                  
                  {/* Price Only */}
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-base text-brand dark:text-white">
                      <span className="text-brand-darkGreen dark:text-brand-darkGreen font-normal text-xs mr-1">৳</span> {phone.price.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>

      {/* Custom styling for slider dots */}
      <style>{`
        .custom-dots {
          bottom: -30px;
        }
        .custom-dots li button:before {
          font-size: 8px;
          color: ${darkMode ? "rgba(55, 125, 91, 0.3)" : "rgba(55, 125, 91, 0.3)"};
          opacity: 1;
        }
        .custom-dots li.slick-active button:before {
          color: ${darkMode ? "#377D5B" : "#377D5B"};
          opacity: 1;
        }
        .phone-slider .slick-track {
          display: flex !important;
        }
        .phone-slider .slick-slide {
          height: inherit !important;
          display: flex !important;
        }
        .phone-slider .slick-slide > div {
          display: flex;
          height: 100%;
          width: 100%;
        }
      `}</style>
    </section>
  );
};

export default TopSearchedPhones;