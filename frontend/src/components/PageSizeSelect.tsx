import React from "react";

interface PageSizeSelectProps {
  value: number;
  onChange: (value: number) => void;
}

const PageSizeSelect: React.FC<PageSizeSelectProps> = ({ value, onChange }) => (
  <div className="relative">
    <select
      className="appearance-none rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 pr-10 bg-white dark:bg-card text-neutral-700 dark:text-neutral-300 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200 cursor-pointer"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
    >
      <option value={10}>10</option>
      <option value={20}>20</option>
      <option value={50}>50</option>
      <option value={100}>100</option>
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500 dark:text-neutral-400">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  </div>
);

export default PageSizeSelect; 