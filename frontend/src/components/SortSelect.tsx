import React from "react";
import { SortOrder } from "../api/phones";

interface SortSelectProps {
  value: SortOrder;
  onChange: (value: SortOrder) => void;
}

const SortSelect: React.FC<SortSelectProps> = ({ value, onChange }) => (
  <select
    className="rounded-lg border px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
    value={value}
    onChange={e => onChange(e.target.value as SortOrder)}
  >
    <option value="default">Default</option>
    <option value="price_high">Price: High to Low</option>
    <option value="price_low">Price: Low to High</option>
  </select>
);

export default SortSelect; 