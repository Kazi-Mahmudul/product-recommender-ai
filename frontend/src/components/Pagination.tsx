import React from "react";

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
    <div className="flex items-center justify-center gap-2 py-6 text-xs md:text-sm lg:text-base overflow-x-auto whitespace-nowrap scrollbar-hide">
      <div className="flex items-center gap-2">
        <button
          className="px-2 md:px-3 py-1 md:py-2 rounded-full bg-brand/10 text-brand border border-brand font-semibold disabled:opacity-50 hover:bg-brand hover:text-white transition"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          &lt; Previous
        </button>
        {getPages().map((page, idx) =>
          typeof page === "number" ? (
            <button
              key={page}
              className={`w-7 h-7 md:w-10 md:h-10 rounded-full mx-1 font-semibold transition border-2 ${
                page === currentPage
                  ? "bg-brand text-white border-brand shadow-md"
                  : "bg-brand/10 text-brand border-brand hover:bg-brand hover:text-white"
              }`}
              onClick={() => onPageChange(page)}
              disabled={page === currentPage}
            >
              {page}
            </button>
          ) : (
            <span key={"ellipsis-" + idx} className="mx-1 text-brand/60">...</span>
          )
        )}
        <button
          className="px-2 md:px-3 py-1 md:py-2 rounded-full bg-brand/10 text-brand border border-brand font-semibold disabled:opacity-50 hover:bg-brand hover:text-white transition"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next &gt;
        </button>
      </div>
    </div>
  );
};

export default Pagination; 