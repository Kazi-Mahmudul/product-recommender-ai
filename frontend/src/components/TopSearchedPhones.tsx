import React, { useEffect, useState } from "react";
import Slider from "react-slick";
import axios from "axios";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Phone } from '../api/phones';
import { generatePhoneDetailUrl } from "../utils/slugUtils";

const sliderSettings = {
  dots: true,
  dotsClass: "slick-dots custom-dots hidden sm:block", // Hide dots on mobile
  infinite: true,
  speed: 500,
  slidesToShow: 3,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 4000,
  pauseOnHover: true,
  pauseOnFocus: true,
  arrows: true, // Show arrows on desktop
  swipeToSlide: true, // Enable swiping to slide
  draggable: true, // Enable dragging
  responsive: [
    {
      breakpoint: 1536, // 2xl screens
      settings: {
        slidesToShow: 4,
        swipeToSlide: true,
        draggable: true
      },
    },
    {
      breakpoint: 1280, // xl screens
      settings: {
        slidesToShow: 3,
        swipeToSlide: true,
        draggable: true
      },
    },
    {
      breakpoint: 1024, // lg screens
      settings: {
        slidesToShow: 2,
        swipeToSlide: true,
        draggable: true
      },
    },
    {
      breakpoint: 640, // sm screens - mobile settings
      settings: {
        slidesToShow: 2, // Show 2 cards on mobile for better alignment
        slidesToScroll: 1,
        arrows: false, // Hide arrows on mobile
        autoplay: true,
        autoplaySpeed: 3000,
        dots: false, // Explicitly hide dots on mobile
        swipeToSlide: true,
        draggable: true
      },
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
      <section className="w-full max-w-6xl mx-auto px-1 py-1 md:px-8 md:py-8">
        <div className="flex items-center justify-between mb-2 md:mb-8">
          <h2 className="text-base md:text-3xl font-bold text-neutral-700 dark:text-white">
            Top Searched Phones
          </h2>
        </div>
        <div className="flex justify-center items-center py-3 md:py-20">
          <div className="w-6 md:w-12 h-6 md:h-12 rounded-full border-4 border-t-brand border-brand/30 animate-spin"></div>
        </div>
      </section>
    );
  }

  if (!phones.length) {
    return (
      <section className="w-full max-w-6xl mx-auto px-1 py-1 md:px-8 md:py-8">
        <div className="flex items-center justify-between mb-2 md:mb-8">
          <h2 className="text-base md:text-3xl font-bold text-neutral-700 dark:text-white">
            Top Searched Phones
          </h2>
        </div>
        <div className="text-center py-6 md:py-16 text-neutral-500 dark:text-neutral-400 text-sm md:text-base">
          No top searched phones data available.
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-7xl rounded-2xl md:rounded-3xl mx-auto px-1 md:px-8 py-6 md:py-12 relative shadow-soft-lg">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 md:w-64 h-32 md:h-64 bg-brand/5 rounded-full filter blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-32 md:w-64 h-32 md:h-64 bg-brand-darkGreen/5 rounded-full filter blur-3xl -z-10"></div>

      <div className="flex items-center justify-between mb-4 md:mb-8">
        <h2 className="text-lg md:text-3xl font-bold text-neutral-700 dark:text-white">
          Top Searched
        </h2>
        <a
          href="/phones"
          className="flex items-center gap-1 md:gap-2 text-brand hover:text-brand-darkGreen transition-colors duration-300 font-medium text-xs md:text-base"
        >
          <span className="hidden sm:inline">View all</span> <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
        </a>
      </div>

      <div className="phone-slider-container relative">
        <Slider {...sliderSettings} className="phone-slider">
          {phones.map((phone, index) => (
            <div key={phone.id} className="px-1 py-2">
              <div
                className="rounded-3xl bg-white dark:bg-card overflow-hidden transition-all duration-300 hover:shadow-soft-lg group cursor-pointer"
                onClick={() => phone.slug && navigate(generatePhoneDetailUrl(phone.slug))}
              >
                {/* Card Header with Rank Badge */}
                <div className="relative">
                  {/* Image Container with Gradient Background */}
                  <div className="relative h-20 md:h-48 bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center p-1 md:p-4">
                    <img
                      src={phone.img_url || "/no-image-placeholder.svg"}
                      alt={phone.name}
                      className="h-16 md:h-40 object-contain transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = "/no-image-placeholder.svg";
                      }}
                      loading="lazy"
                    />

                    {/* Brand Badge */}
                    <div className="absolute top-1 md:top-4 left-1 md:left-4 px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-full bg-white/90 dark:bg-card/90 shadow-sm backdrop-blur-sm text-[8px] md:text-xs font-medium text-brand dark:text-white">
                      {phone.brand || "Brand"}
                    </div>

                    {/* Rank Badge */}
                    <div className="absolute top-1 md:top-4 right-1 md:right-4">
                      <span className="inline-flex items-center px-1.5 md:px-2.5 py-0.5 md:py-1 bg-brand/10 text-brand text-[8px] md:text-xs font-bold rounded-full">
                        #{index + 1}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-3 md:p-5">
                  {/* Phone Name */}
                  <h3 className="font-medium text-xs md:text-base text-neutral-800 dark:text-white mb-1 md:mb-1.5 line-clamp-2 h-8 md:h-12" title={phone.name}>
                    {phone.name}
                  </h3>

                  {/* Key Specs */}
                  <div className="hidden md:grid grid-cols-2 gap-x-4 gap-y-1.5 mb-4">
                    {[
                      { label: "RAM", value: phone.ram || "N/A" },
                      { label: "Storage", value: phone.internal_storage || "N/A" },
                      { label: "Display", value: phone.screen_size_numeric ? `${phone.screen_size_numeric} inches` : "N/A" },
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
                    <div className="font-bold text-[10px] md:text-base text-brand dark:text-white">
                      <span className="text-brand-darkGreen dark:text-brand-darkGreen font-normal text-[8px] md:text-xs mr-0.5 md:mr-1">৳</span> {phone.price.toLocaleString()}
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
          bottom: -20px;
        }
        .custom-dots li button:before {
          font-size: 6px;
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