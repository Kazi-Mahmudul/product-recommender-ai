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
    <div className="flex items-center justify-center gap-2 md:gap-3 py-4 md:py-8 text-[10px] md:text-sm overflow-x-auto whitespace-nowrap">
      <div className="flex items-center gap-2 md:gap-3">
        <button
          className="px-3 py-2 md:px-4 md:py-2.5 rounded-full bg-brand/10 hover:bg-brand/20 text-brand dark:text-brand dark:hover:text-hover-light border border-brand/20 font-medium disabled:opacity-40 transition-all duration-200 shadow-sm disabled:hover:bg-brand/10 flex items-center gap-1 md:gap-2"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={14} className="md:w-4 md:h-4" />
          <span className="hidden xs:inline">Previous</span>
        </button>

        <div className="flex items-center">
          {getPages().map((page, idx) =>
            typeof page === "number" ? (
              <button
                key={page}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full mx-0.5 md:mx-1 font-medium transition-all duration-200 ${page === currentPage
                  ? "bg-brand text-white shadow-sm"
                  : "bg-brand/10 hover:bg-brand/20 text-brand dark:text-brand dark:hover:text-hover-light border border-brand/20 hover:border-brand/40"
                  }`}
                onClick={() => onPageChange(page)}
                disabled={page === currentPage}
              >
                {page}
              </button>
            ) : (
              <span key={"ellipsis-" + idx} className="mx-0.5 md:mx-1 text-neutral-500 dark:text-neutral-400 font-medium">...</span>
            )
          )}
        </div>

        <button
          className="px-3 py-2 md:px-4 md:py-2.5 rounded-full bg-brand/10 hover:bg-brand/20 text-brand dark:text-brand dark:hover:text-hover-light border border-brand/20 font-medium disabled:opacity-40 transition-all duration-200 shadow-sm disabled:hover:bg-brand/10 flex items-center gap-1 md:gap-2"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <span className="hidden xs:inline">Next</span>
          <ChevronRight size={14} className="md:w-4 md:h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination; 