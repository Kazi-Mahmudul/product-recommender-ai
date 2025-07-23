import React, { useEffect, useState } from "react";
import Slider from "react-slick";
import axios from "axios";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Phone {
  id: string;
  name: string;
  price: number;
  img_url: string;
  overall_device_score: number;
  is_popular_brand: boolean;
  is_new_release: boolean;
  age_in_months: number;
  screen_size_inches: string;
  capacity: string;
  is_upcoming: boolean;
  brand?: string;
  ram?: string;
  internal_storage?: string;
}

const sliderSettings = {
  dots: true,
  dotsClass: "slick-dots custom-dots",
  infinite: true,
  speed: 500,
  slidesToShow: 4,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 3000,
  pauseOnHover: true,
  pauseOnFocus: true,
  responsive: [
    {
      breakpoint: 1536, // 2xl screens
      settings: { slidesToShow: 4 },
    },
    {
      breakpoint: 1280, // xl screens
      settings: { slidesToShow: 3 },
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

interface TrendingPhonesProps {
  darkMode: boolean;
}

const TrendingPhones: React.FC<TrendingPhonesProps> = ({ darkMode }) => {
  const [phones, setPhones] = useState<Phone[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPhones = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_BASE}/api/v1/phones/`
        );
        const items = res.data.items || [];
        const filtered = items.filter(
          (phone: Phone) =>
            phone.is_popular_brand === true &&
            phone.is_new_release === true &&
            phone.age_in_months <= 1 &&
            phone.is_upcoming === false
        );
        filtered.sort(
          (a: Phone, b: Phone) =>
            b.overall_device_score - a.overall_device_score
        );
        setPhones(filtered.slice(0, 8));
      } catch (err) {
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
            Trending Phones
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
            Trending Phones
          </h2>
        </div>
        <div className="text-center py-16 text-neutral-500 dark:text-neutral-400">
          No trending phones found.
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
          Trending Phones
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
          {phones.map((phone) => (
            <div key={phone.id} className="px-3 py-2">
              <div 
                className="rounded-3xl bg-white dark:bg-card overflow-hidden transition-all duration-300 hover:shadow-soft-lg group cursor-pointer"
                onClick={() => navigate(`/phones/${phone.id}`)}
              >
                {/* Card Header with Brand Badge */}
                <div className="relative">
                  {/* Image Container with Gradient Background */}
                  <div className="relative h-48 bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center p-4">
                    <img
                      src={phone.img_url || "/phone.png"}
                      alt={phone.name}
                      className="h-40 object-contain transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    
                    {/* Brand Badge */}
                    <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/90 dark:bg-card/90 shadow-sm backdrop-blur-sm text-xs font-medium text-brand dark:text-white">
                      {phone.brand || "Brand"}
                    </div>
                    
                    {/* New Badge */}
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center px-2.5 py-1 bg-brand/10 text-brand text-xs font-medium rounded-full">
                        New
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Card Content */}
                <div className="p-5">
                  {/* Phone Name */}
                  <h3 className="font-medium text-base text-neutral-800 dark:text-white mb-1.5 line-clamp-2 h-12" title={phone.name}>
                    {phone.name}
                  </h3>
                  
                  {/* Key Specs */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-4">
                    {[
                      { label: "RAM", value: phone.ram || "N/A" },
                      { label: "Storage", value: phone.internal_storage || "N/A" },
                      { label: "Display", value: phone.screen_size_inches ? `${phone.screen_size_inches}"` : "N/A" },
                      { label: "Battery", value: phone.capacity || "N/A" }
                    ].map((spec, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="text-neutral-500 dark:text-neutral-400">{spec.label}: </span>
                        <span className="text-neutral-800 dark:text-neutral-200 font-medium">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Price and Action */}
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm md:text-base text-brand dark:text-white">
                      <span className="text-brand-darkGreen dark:text-brand-darkGreen font-normal text-xs mr-1">৳</span> {phone.price.toLocaleString()}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/phones/${phone.id}`);
                      }}
                      className="bg-brand hover:bg-brand-darkGreen hover:text-hover-light text-white rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 shadow-sm"
                    >
                      Details
                    </button>
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

export default TrendingPhones;
