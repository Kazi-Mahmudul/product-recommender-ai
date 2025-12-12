import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  // Helper to generate page numbers with ellipsis
  const getPages = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 4) pages.push("...");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 3) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-3 py-8 text-xs md:text-sm overflow-x-auto whitespace-nowrap">
      <div className="flex items-center gap-3">
        <button
          className="px-4 py-2.5 rounded-full bg-brand/10 hover:bg-brand/20 text-brand dark:text-brand dark:hover:text-hover-light border border-brand/20 font-medium disabled:opacity-40 transition-all duration-200 shadow-sm disabled:hover:bg-brand/10 flex items-center gap-2"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>
        
        <div className="flex items-center">
          {getPages().map((page, idx) =>
            typeof page === "number" ? (
              <button
                key={page}
                className={`w-10 h-10 rounded-full mx-1 font-medium transition-all duration-200 ${
                  page === currentPage
                    ? "bg-brand text-white shadow-sm"
                    : "bg-brand/10 hover:bg-brand/20 text-brand dark:text-brand dark:hover:text-hover-light border border-brand/20 hover:border-brand/40"
                }`}
                onClick={() => onPageChange(page)}
                disabled={page === currentPage}
              >
                {page}
              </button>
            ) : (
              <span key={"ellipsis-" + idx} className="mx-1 text-neutral-500 dark:text-neutral-400 font-medium">...</span>
            )
          )}
        </div>
        
        <button
          className="px-4 py-2.5 rounded-full bg-brand/10 hover:bg-brand/20 text-brand dark:text-brand dark:hover:text-hover-light border border-brand/20 font-medium disabled:opacity-40 transition-all duration-200 shadow-sm disabled:hover:bg-brand/10 flex items-center gap-2"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination; 