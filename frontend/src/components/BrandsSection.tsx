import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchBrands } from "../api/phones";

// Define the popular brands in the required order with proper casing
const POPULAR_BRANDS = [
  "Samsung",
  "Apple",
  "Xiaomi",
  "Redmi",
  "Realme",
  "Oppo",
  "Vivo",
  "OnePlus",
  "Google",
  "Infinix",
  "Tecno",
  "Motorola",
  "Huawei",
  "Nokia",
  "Symphony",
  "IQOO",
  "Sony",
  "LG"
];

const BrandsSection: React.FC = () => {
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadBrands = async () => {
      try {
        // Fetch brands from API
        const fetchedBrands = await fetchBrands();

        // If we have brands from API, use them, otherwise use the predefined list
        if (fetchedBrands && fetchedBrands.length > 0) {
          // Filter to only include popular brands and maintain the order
          const orderedBrands = POPULAR_BRANDS.filter(brand =>
            fetchedBrands.some((b: string) => b.toLowerCase() === brand.toLowerCase())
          );
          setBrands(orderedBrands);
        } else {
          // Fallback to predefined list
          setBrands(POPULAR_BRANDS);
        }
      } catch (error) {
        console.error("Error fetching brands:", error);
        // Fallback to predefined list
        setBrands(POPULAR_BRANDS);
      } finally {
        setLoading(false);
      }
    };

    loadBrands();
  }, []);

  const handleBrandClick = (brand: string) => {
    navigate(`/phones?brand=${encodeURIComponent(brand)}`);
  };

  const handleViewAllClick = () => {
    navigate("/phones");
  };

  if (loading) {
    return (
      <section className="w-full rounded-2xl md:rounded-3xl bg-white dark:bg-card shadow-soft-lg p-2 md:p-6">
        <div className="flex items-center justify-between mb-1 md:mb-4">
          <h2 className="text-sm md:text-xl font-bold text-neutral-700 dark:text-white">
            Popular Brands
          </h2>
        </div>
        <div className="flex justify-center items-center py-3">
          <div className="w-5 h-5 rounded-full border-4 border-t-brand border-brand/30 animate-spin"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[250px] md:max-w-full mx-auto rounded-2xl md:rounded-3xl bg-white dark:bg-card shadow-soft-lg p-3 md:p-6 h-fit">
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <h2 className="text-base md:text-xl font-bold text-neutral-700 dark:text-white">
          Popular Brands
        </h2>
        <button
          onClick={handleViewAllClick}
          className="flex items-center gap-1 text-brand hover:text-brand-darkGreen transition-colors duration-300 font-medium text-xs md:text-sm"
        >
          View all
        </button>
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-2 gap-2">
        {brands.map((brand, index) => (
          <motion.div
            key={brand}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.02 }}
            whileHover={{ y: -3 }}
            className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-2 md:p-3 flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-sm"
            onClick={() => handleBrandClick(brand)}
          >
            <h3 className="font-medium text-neutral-700 dark:text-neutral-300 text-xs md:text-sm text-center">
              {brand}
            </h3>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default BrandsSection;