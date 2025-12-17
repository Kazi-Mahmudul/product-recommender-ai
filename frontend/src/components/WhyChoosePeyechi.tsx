import React from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { MessageSquare, GitCompare, Sparkles, ListChecks, Zap, Globe } from 'lucide-react';

interface OurFeaturesProps {
  darkMode: boolean;
}

const features = [
  {
    icon: <MessageSquare className="text-brand" size={24} />,
    title: 'AI Chat Assistant',
    titleBn: 'AI Chat সহায়ক',
    description: 'আপনার প্রশ্ন করুন, সাথে সাথে AI থেকে উত্তর পান — ফোন সম্পর্কে যেকোনো তথ্য জানতে চ্যাট করুন'
  },
  {
    icon: <GitCompare className="text-accent" size={24} />,
    title: 'Smart Comparison',
    titleBn: 'Smart তুলনা',
    description: 'একসাথে একাধিক ফোনের Features, Specs এবং Performance compare করুন — Detailed Visual Charts সহ'
  },
  {
    icon: <Sparkles className="text-accent-purple" size={24} />,
    title: 'AI Recommendations',
    titleBn: 'AI সাজেশন',
    description: 'আপনার Budget এবং Requirements অনুযায়ী Perfect ফোন খুঁজে পান — Personalized AI Suggestions'
  },
  {
    icon: <ListChecks className="text-accent-peach" size={24} />,
    title: 'Pros & Cons Analysis',
    titleBn: 'ভালো-খারাপ বিশ্লেষণ',
    description: 'প্রতিটি ফোনের Pros এবং Cons AI দিয়ে Analysis করা — Balanced মূল্যায়ন পান'
  },
  {
    icon: <Globe className="text-brand" size={24} />,
    title: 'BD Market Focused',
    titleBn: 'বাংলাদেশ Market Focused',
    description: 'বাংলাদেশের Market Price, Availability এবং Local Reviews — সব তথ্য এক জায়গায়'
  },
  {
    icon: <Zap className="text-accent" size={24} />,
    titleBn: 'Instant Results',
    title: 'তাৎক্ষণিক ফলাফল',
    description: 'কয়েক সেকেন্ডেই চাহিদা অনুযায়ী Phone খুঁজুন — দ্রুত এবং নির্ভুল Information'
  }
];

const OurFeatures: React.FC<OurFeaturesProps> = ({ darkMode }) => {
  // Slider settings for auto-sliding carousel
  const sliderSettings = {
    dots: true,
    dotsClass: "slick-dots custom-dots",
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3500,
    pauseOnHover: true,
    pauseOnFocus: true,
    swipeToSlide: true,
    draggable: true,
    responsive: [
      { breakpoint: 1280, settings: { slidesToShow: 3, swipeToSlide: true, draggable: true } },
      { breakpoint: 1024, settings: { slidesToShow: 2, swipeToSlide: true, draggable: true } },
      { breakpoint: 640, settings: { slidesToShow: 1, dots: false, swipeToSlide: true, draggable: true } }
    ]
  };

  return (
    <section className="max-w-[300px] md:max-w-5xl mx-auto px-2 md:px-8 py-6 md:py-12 relative">
      {/* Decorative background elements */}
      <div className="absolute top-20 left-10 w-32 md:w-64 h-32 md:h-64 bg-brand/5 rounded-full filter blur-3xl -z-10"></div>
      <div className="absolute bottom-10 right-10 w-32 md:w-64 h-32 md:h-64 bg-accent-purple/5 rounded-full filter blur-3xl -z-10"></div>

      <div className="text-center mb-6 md:mb-10">
        <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1 md:py-2 rounded-full bg-brand/10 text-brand font-medium text-xs md:text-sm mb-3 md:mb-4" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
          <Sparkles size={16} />
          Peyechi Features
        </div>
        <h2 className="text-2xl md:text-4xl font-bold text-neutral-800 dark:text-white mb-2 md:mb-3" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
          কেন <span className="text-brand">Peyechi</span> ব্যবহার করবেন?
        </h2>
        <p className="text-sm md:text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
          বাংলাদেশের সবচেয়ে Advanced AI-powered ফোন খোঁজার Platform — যেখানে সব Feature একসাথে পাবেন
        </p>
      </div>

      <div className="feature-slider-container relative">
        <Slider {...sliderSettings} className="feature-slider">
          {features.map((feature, idx) => (
            <div key={idx} className="px-2 py-2">
              <div
                className="flex flex-col items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700/30 rounded-2xl p-5 md:p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group h-full"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-brand/5 dark:bg-brand/10 flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-brand/10">
                  {React.cloneElement(feature.icon as React.ReactElement, { size: 24 })}
                </div>

                <h3 className="text-base md:text-lg font-bold text-neutral-800 dark:text-white mb-2" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
                  {feature.titleBn}
                </h3>

                <p className="text-center text-neutral-600 dark:text-neutral-400 text-sm md:text-base leading-relaxed" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </Slider>
      </div>

      {/* Call to action */}
      <div className="mt-8 md:mt-12 text-center">
        <a
          href="/chat"
          className="inline-flex items-center justify-center text-sm md:text-base px-6 md:px-8 py-3 bg-brand hover:bg-brand-dark text-white font-semibold rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          style={{ fontFamily: "'Hind Siliguri', sans-serif" }}
        >
          <MessageSquare size={18} className="mr-2" />
          AI Assistant চালু করুন
        </a>
      </div>

      {/* Custom styling for slider dots */}
      <style>{`
        .custom-dots {
          bottom: -25px;
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
        .feature-slider .slick-track {
          display: flex !important;
        }
        .feature-slider .slick-slide {
          height: inherit !important;
          display: flex !important;
        }
        .feature-slider .slick-slide > div {
          display: flex;
          height: 100%;
          width: 100%;
        }
      `}</style>
    </section>
  );
};

export default OurFeatures;
