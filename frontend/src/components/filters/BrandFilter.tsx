import React, { useState, useEffect } from "react";
import { fetchBrands } from "../../api/phones";

interface BrandFilterProps {
  selectedBrand: string | null;
  onChange: (brand: string | null) => void;
  brands: string[];
}

const BrandFilter: React.FC<BrandFilterProps> = ({
  selectedBrand,
  onChange,
  brands: propBrands,
}) => {
  const [brands, setBrands] = useState<string[]>(propBrands);
  const [loading, setLoading] = useState<boolean>(propBrands.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Fetch brands from API if not provided in props
  useEffect(() => {
    if (propBrands.length === 0) {
      setLoading(true);
      fetchBrands()
        .then((fetchedBrands) => {
          setBrands(fetchedBrands);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch brands:", err);
          setError("Failed to load brands. Please try again later.");
          setLoading(false);
        });
    } else {
      setBrands(propBrands);
    }
  }, [propBrands]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange(value === "" ? null : value);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Brand
      </label>
      <select
        value={selectedBrand || ""}
        onChange={handleChange}
        disabled={loading}
        className={`w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30 ${
          loading ? "opacity-70 cursor-not-allowed" : ""
        }`}
      >
        <option value="">All Brands</option>
        {loading ? (
          <option value="" disabled>
            Loading brands...
          </option>
        ) : brands.length > 0 ? (
          brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))
        ) : (
          <option value="" disabled>
            No brands available
          </option>
        )}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export default BrandFilter;
