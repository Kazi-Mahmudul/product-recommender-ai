import React from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Sparkles, BarChart3, Globe, Smartphone, MessageSquare, HelpCircle, ThumbsUp, FileText, ListChecks } from 'lucide-react';

interface WhyChoosePeyechiProps {
  darkMode: boolean;
}

const features = [
  {
    icon: <Sparkles className="text-brand" size={28} />,
    title: 'AI-Powered Recommendations',
    description: 'Get personalized phone suggestions based on your specific needs and preferences.'
  },
  {
    icon: <BarChart3 className="text-accent" size={28} />,
    title: 'Smart Device Comparisons',
    description: 'Compare phones side-by-side with detailed specs and performance metrics.'
  },
  {
    icon: <Globe className="text-accent-purple" size={28} />,
    title: 'Localized for Bangladesh',
    description: 'Accurate pricing and availability information for the Bangladesh market.'
  },
  {
    icon: <Smartphone className="text-accent-peach" size={28} />,
    title: 'Extensive Phone Database',
    description: 'Access detailed information on hundreds of smartphone models.'
  },
  {
    icon: <MessageSquare className="text-brand" size={28} />,
    title: 'Chat Based Comparisons',
    description: 'Compare multiple phones through our intuitive chat interface for easy decision making.'
  },
  {
    icon: <HelpCircle className="text-accent" size={28} />,
    title: 'Q&A Support',
    description: 'Get answers to all your smartphone-related questions from our AI assistant.'
  },
  {
    icon: <ThumbsUp className="text-accent-purple" size={28} />,
    title: 'Personalized Recommendations',
    description: 'Receive tailored phone suggestions that match your unique requirements and budget.'
  },
  {
    icon: <FileText className="text-accent-peach" size={28} />,
    title: 'AI Summary',
    description: 'Get concise summaries of phone features and reviews to make informed decisions quickly.'
  },
  {
    icon: <ListChecks className="text-brand" size={28} />,
    title: 'AI-generated Pros & Cons',
    description: 'View balanced assessments of each phone with automatically generated pros and cons.'
  }
];

const WhyChoosePeyechi: React.FC<WhyChoosePeyechiProps> = ({ darkMode }) => {
  // Slider settings for auto-sliding carousel
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
      { breakpoint: 1536, settings: { slidesToShow: 4 } },
      { breakpoint: 1280, settings: { slidesToShow: 3 } },
      { breakpoint: 1024, settings: { slidesToShow: 2 } },
      { breakpoint: 640, settings: { slidesToShow: 1 } }
    ]
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-8 py-20 relative">
      {/* Decorative background elements */}
      <div className="absolute top-40 left-20 w-72 h-72 bg-brand/5 rounded-full filter blur-3xl -z-10"></div>
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-accent-purple/5 rounded-full filter blur-3xl -z-10"></div>
      
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 dark:text-white mb-4">
          Why Choose <span className="text-brand">Peyechi</span>?
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
          We're revolutionizing how you find and compare smartphones in Bangladesh with our cutting-edge AI technology.
        </p>
      </div>
      
      <div className="feature-slider-container relative mt-12">
        <Slider {...sliderSettings} className="feature-slider">
          {features.map((feature, idx) => (
            <div key={idx} className="px-3 py-2">
              <div 
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700/30 rounded-3xl p-6 shadow-sm transition-all duration-300 hover:shadow-md group h-full"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand/5 dark:bg-brand/10 flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110">
                  {feature.icon}
                </div>
                
                <h3 className="text-xl font-semibold text-neutral-800 dark:text-white mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </Slider>
      </div>
      
      {/* Call to action */}
      <div className="mt-16 text-center">
        <a 
          href="/chat" 
          className="inline-flex items-center justify-center px-8 py-3.5 bg-brand/10 hover:bg-brand/20 text-brand dark:text-brand dark:hover:text-hover-light font-medium rounded-full transition-all duration-300 shadow-sm hover:shadow-md"
        >
          Try Our AI Assistant
        </a>
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

export default WhyChoosePeyechi;
