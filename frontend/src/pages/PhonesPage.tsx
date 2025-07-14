import React, { useEffect, useState } from "react";
import { fetchPhones, Phone, SortOrder } from "../api/phones";
import PhoneCard from "../components/PhoneCard";
import Pagination from "../components/Pagination";
import SortSelect from "../components/SortSelect";
import PageSizeSelect from "../components/PageSizeSelect";
import { useNavigate } from "react-router-dom";

const PhonesPage: React.FC = () => {
  const [phones, setPhones] = useState<Phone[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortOrder>("default");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetchPhones({ page, pageSize, sort })
      .then(({ items, total }) => {
        setPhones(items);
        setTotal(total);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, sort]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand/10 via-white to-brand/5 dark:from-brand/20 dark:via-gray-900 dark:to-brand/10 pt-24 pb-8 px-2 sm:px-4 max-w-4xl mx-auto">
      <div className="sticky top-16 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl shadow-md mb-8 px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-extrabold text-brand tracking-tight drop-shadow-sm">All Phones</h1>
        <div className="flex gap-3 items-center flex-wrap">
          <span className="text-brand font-semibold">Sort by:</span>
          <SortSelect value={sort} onChange={setSort} />
          <span className="text-brand font-semibold ml-4">Show:</span>
          <PageSizeSelect value={pageSize} onChange={v => { setPageSize(v); setPage(1); }} />
        </div>
      </div>
      {loading ? (
        <div className="text-center py-20 text-lg text-brand animate-pulse">Loading phones...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {phones.map(phone => (
            <PhoneCard
              key={phone.id}
              phone={phone}
              onFullSpecs={() => navigate(`/phones/${phone.id}`)}
              onCompare={() => navigate(`/compare?phone=${phone.id}`)}
            />
          ))}
        </div>
      )}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
      <div className="text-center text-brand font-medium mt-2">
        Showing {phones.length} of {total} results
      </div>
    </div>
  );
};

export default PhonesPage; 