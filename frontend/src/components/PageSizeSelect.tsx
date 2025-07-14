import React from "react";

interface PageSizeSelectProps {
  value: number;
  onChange: (value: number) => void;
}

const PageSizeSelect: React.FC<PageSizeSelectProps> = ({ value, onChange }) => (
  <select
    className="rounded-lg border px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
    value={value}
    onChange={e => onChange(Number(e.target.value))}
  >
    <option value={10}>10</option>
    <option value={20}>20</option>
    <option value={50}>50</option>
    <option value={100}>100</option>
  </select>
);

export default PageSizeSelect; 