import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitCompare, MessageSquare, TrendingUp, Zap } from 'lucide-react';
import Slider from 'react-slick';

interface Phone {
    slug: string;
    name: string;
    brand: string;
    model: string;
    img_url: string;
    price: string;
}

interface ComparisonPair {
    phone1: Phone;
    phone2: Phone;
    comparison_count: number;
}

// Slider settings for mobile swipe functionality
const sliderSettings = {
    dots: true,
    dotsClass: "slick-dots custom-dots hidden sm:block", // Hide dots on mobile
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: false,
    pauseOnHover: true,
    swipeToSlide: true, // Enable swiping to slide
    draggable: true, // Enable dragging
    responsive: [
        {
            breakpoint: 1024, // lg screens
            settings: { 
                slidesToShow: 2,
                swipeToSlide: true,
                draggable: true
            },
        },
        {
            breakpoint: 768, // md screens - show 1 card on mobile
            settings: { 
                slidesToShow: 1, 
                slidesToScroll: 1,
                dots: false, // Explicitly hide dots on mobile
                swipeToSlide: true,
                draggable: true
            },
        },
    ],
};

const PopularComparisons: React.FC = () => {
    const [pairs, setPairs] = useState<ComparisonPair[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchPopularComparisons();
    }, []);

    const fetchPopularComparisons = async () => {
        try {
            const API_BASE = process.env.REACT_APP_API_BASE || '';
            const response = await fetch(`${API_BASE}/api/v1/comparison/popular?limit=3`);
            const data = await response.json();
            setPairs(data);
        } catch (error) {
            console.error('Error fetching popular comparisons:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAskAI = (pair: ComparisonPair) => {
        const message = `Compare ${pair.phone1.name} vs ${pair.phone2.name}`;
        navigate('/chat', { state: { initialMessage: message } });
    };

    if (loading || pairs.length === 0) {
        return null; // Don't show section if no data
    }

    return (
        <section className="w-full max-w-7xl mx-auto px-1 md:px-6 py-3 md:py-8">
            <div className="mb-2 md:mb-8 text-center">
                <div className="inline-flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium text-[10px] md:text-sm mb-1 md:mb-4">
                    <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                    Most Popular
                </div>
                <h2 className="text-lg md:text-4xl font-bold text-gray-900 dark:text-white mb-1 md:mb-3">
                    Trending Phone Comparisons
                </h2>
                <p className="text-[10px] md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    See what phones users are comparing. Get instant AI-powered comparison insights.
                </p>
            </div>

            <Slider {...sliderSettings} className="popular-comparisons-slider">
                {pairs.map((pair, index) => (
                    <div key={`${pair.phone1.slug}-${pair.phone2.slug}`} className="px-1">
                        <div className="h-full">
                            <div
                                className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                            >
                                {/* Rank Badge */}
                                <div className="absolute top-1 md:top-4 left-1 md:left-4 z-10 w-5 h-5 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-[8px] md:text-lg shadow-lg">
                                    #{index + 1}
                                </div>

                                {/* Comparison Count Badge */}
                                <div className="absolute top-1 md:top-4 right-1 md:right-4 z-10 flex items-center gap-0.5 md:gap-1 px-1 md:px-3 py-0.5 md:py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[8px] md:text-xs font-medium">
                                    <GitCompare className="w-2 h-2 md:w-3 md:h-3" />
                                    {pair.comparison_count}x
                                </div>

                                {/* Phone Images - Side by Side */}
                                <div className="relative h-20 md:h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center gap-1 md:gap-4 p-1 md:p-4">
                                    {/* Phone 1 */}
                                    <div className="flex-1 flex items-center justify-center">
                                        <img
                                            src={pair.phone1.img_url || 'https://via.placeholder.com/120'}
                                            alt={pair.phone1.name}
                                            className="h-14 md:h-32 w-auto object-contain group-hover:scale-110 transition-transform duration-300"
                                        />
                                    </div>

                                    {/* VS Badge */}
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                                        <div className="w-6 h-6 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white font-bold text-[8px] md:text-sm shadow-lg border-2 md:border-4 border-white dark:border-gray-800">
                                            VS
                                        </div>
                                    </div>

                                    {/* Phone 2 */}
                                    <div className="flex-1 flex items-center justify-center">
                                        <img
                                            src={pair.phone2.img_url || 'https://via.placeholder.com/120'}
                                            alt={pair.phone2.name}
                                            className="h-14 md:h-32 w-auto object-contain group-hover:scale-110 transition-transform duration-300"
                                        />
                                    </div>
                                </div>

                                {/* Phone Details */}
                                <div className="p-3 md:p-6">
                                    {/* Phone 1 Details */}
                                    <div className="mb-2 md:mb-3 pb-2 md:pb-3 border-b border-gray-200 dark:border-gray-700">
                                        <div className="flex justify-between items-center">
                                            <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                {pair.phone1.brand}
                                            </p>
                                            <p className="text-[10px] md:text-sm font-bold text-brand">
                                                {pair.phone1.price}
                                            </p>
                                        </div>
                                        <h3 className="text-xs md:text-sm font-bold text-gray-900 dark:text-white mt-1 line-clamp-1">
                                            {pair.phone1.name}
                                        </h3>
                                    </div>

                                    {/* Phone 2 Details */}
                                    <div className="mb-3 md:mb-4">
                                        <div className="flex justify-between items-center">
                                            <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                {pair.phone2.brand}
                                            </p>
                                            <p className="text-[10px] md:text-sm font-bold text-brand">
                                                {pair.phone2.price}
                                            </p>
                                        </div>
                                        <h3 className="text-xs md:text-sm font-bold text-gray-900 dark:text-white mt-1 line-clamp-1">
                                            {pair.phone2.name}
                                        </h3>
                                    </div>

                                    {/* Ask AI Button */}
                                    <button
                                        onClick={() => handleAskAI(pair)}
                                        className="mx-auto flex items-center justify-center gap-1 px-3 py-2 bg-brand/10 hover:bg-brand/20 text-brand dark:text-brand dark:hover:text-hover-light font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-xs"
                                    >
                                        <Zap size={14} />
                                        <span className="hidden xs:inline">Ask AI to Compare</span>
                                        <span className="xs:hidden">Ask AI</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </Slider>

            <p className="text-center mt-4 md:mt-8">
                <button
                    onClick={() => navigate('/phones')}
                    className="text-brand hover:text-brand-dark font-medium underline text-sm md:text-base"
                >
                    Browse all phones
                </button>
            </p>

            {/* Custom styling for slider dots */}
            <style>{`
                .custom-dots {
                    bottom: -30px;
                }
                .custom-dots li button:before {
                    font-size: 8px;
                    color: rgba(255, 107, 0, 0.3);
                    opacity: 1;
                }
                .custom-dots li.slick-active button:before {
                    color: rgba(255, 107, 0, 1);
                    opacity: 1;
                }
                .popular-comparisons-slider .slick-track {
                    display: flex !important;
                }
                .popular-comparisons-slider .slick-slide {
                    height: inherit !important;
                    display: flex !important;
                }
                .popular-comparisons-slider .slick-slide > div {
                    display: flex;
                    height: 100%;
                    width: 100%;
                }
            `}</style>
        </section>
    );
};

export default PopularComparisons;
