import React from "react";

interface ProsConsProps {
  pros: string[];
  cons: string[];
  loading: boolean;
  error?: string;
  onGenerate: () => void;
}

const ProsCons: React.FC<ProsConsProps> = ({ pros, cons, loading, error, onGenerate }) => (
  <section
    className="pros-cons-container rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 transition-colors duration-300"
    aria-labelledby="pros-cons-header"
  >
    {/* Header */}
    <div className="flex items-center justify-between mb-3 md:mb-4">
      <h2 id="pros-cons-header" className="font-bold text-base md:text-lg md:text-xl flex items-center gap-1 md:gap-2 text-gray-900 dark:text-gray-100" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
        <span role="img" aria-label="AI">🤖</span> AI-Generated বিশ্লেষণ
      </h2>
    </div>
    {/* Error State */}
    {error && (
      <div className="mb-3 md:mb-4 p-2 md:p-3 rounded-lg bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 flex items-center gap-1 md:gap-2 animate-shake" role="alert">
        <span role="img" aria-label="Error">❌</span>
        <span>{error}</span>
        <button
          onClick={onGenerate}
          className="ml-auto px-2 py-1 md:px-3 md:py-1 bg-red-600 text-white rounded-full text-[10px] md:text-xs font-semibold hover:bg-red-700 transition"
        >Retry</button>
      </div>
    )}
    {/* Loading State */}
    {loading && !error && (
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 animate-pulse" aria-live="polite">
        <div className="flex-1 space-y-2">
          <div className="h-3 md:h-4 bg-emerald-100 dark:bg-emerald-900 rounded w-3/4"></div>
          <div className="h-3 md:h-4 bg-emerald-100 dark:bg-emerald-900 rounded w-2/3"></div>
          <div className="h-3 md:h-4 bg-emerald-100 dark:bg-emerald-900 rounded w-1/2"></div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3 md:h-4 bg-red-100 dark:bg-red-900 rounded w-3/4"></div>
          <div className="h-3 md:h-4 bg-red-100 dark:bg-red-900 rounded w-2/3"></div>
        </div>
      </div>
    )}
    {/* Content */}
    {!loading && !error && (
      <div className="pros-cons-content flex flex-col md:flex-row gap-4 md:gap-8 transition-all duration-300">
        {/* Pros */}
        <div className="pros-section flex-1 bg-emerald-50 dark:bg-emerald-900 rounded-lg md:rounded-xl p-3 md:p-4 transition-all duration-300">
          <div className="font-semibold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-1" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
            <span role="img" aria-label="Pros">✅</span> ভালো দিক (PROS)
          </div>
          <ul className="text-emerald-800 dark:text-emerald-100 text-[10px] md:text-sm space-y-2 list-disc ml-4 md:ml-5">
            {pros.length > 0 ? pros.map((p, i) => (
              <li key={i} className="pros-cons-item transition-all duration-300 hover:bg-emerald-100 dark:hover:bg-emerald-800 hover:scale-[1.02] rounded px-2 py-1">
                {p}
              </li>
            )) : <li className="italic text-gray-400">No pros available.</li>}
          </ul>
        </div>
        {/* Cons */}
        <div className="cons-section flex-1 bg-red-50 dark:bg-red-900 rounded-lg md:rounded-xl p-3 md:p-4 transition-all duration-300">
          <div className="font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
            <span role="img" aria-label="Cons">❌</span> খারাপ দিক (CONS)
          </div>
          <ul className="text-red-800 dark:text-red-100 text-[10px] md:text-sm space-y-2 list-disc ml-4 md:ml-5">
            {cons.length > 0 ? cons.map((c, i) => (
              <li key={i} className="pros-cons-item transition-all duration-300 hover:bg-red-100 dark:hover:bg-red-800 hover:scale-[1.02] rounded px-2 py-1">
                {c}
              </li>
            )) : <li className="italic text-gray-400">No cons available.</li>}
          </ul>
        </div>
      </div>
    )}
    {/* Footer note */}
    <div className="mt-3 md:mt-4 text-[10px] md:text-xs text-gray-500 dark:text-gray-400 text-center" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
      <span role="img" aria-label="Info">ℹ️</span> এই বিশ্লেষণ AI দ্বারা ফোনের Specifications এবং Market Context-এর উপর ভিত্তি করে তৈরি করা হয়েছে।
    </div>
  </section>
);

export default ProsCons;