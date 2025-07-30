import React from "react";
import { Phone } from '../../api/phones';

interface SimilarPhonesProps {
  phones: Phone[];
  loading: boolean;
  onRegenerate: () => void;
}

const SimilarPhones: React.FC<SimilarPhonesProps> = ({ phones, loading, onRegenerate }) => (
  <div className="rounded-2xl shadow p-4 border bg-white border-brand dark:bg-gray-900 dark:border-gray-700">
    <div className="font-semibold mb-2 flex justify-between items-center text-brand">
      Similar Phones
      <button onClick={onRegenerate} className="ml-2 px-3 py-1 bg-brand text-white rounded-full text-xs font-semibold hover:opacity-90 transition">
        {loading ? "Generating..." : "Regenerate"}
      </button>
    </div>
    <div className="flex gap-4 overflow-x-auto">
      {phones.map((phone) => (
        <div key={phone.id} className="min-w-[160px] max-w-[180px] bg-brand/5 dark:bg-gray-800 rounded-lg p-2 flex flex-col items-center shadow">
          <img src={phone.img_url || "/phone.png"} alt={phone.name} className="w-16 h-20 object-contain rounded bg-white" />
          <div className="font-bold text-sm mt-2 text-center text-brand">{phone.name}</div>
          <div className="text-xs text-gray-600 dark:text-gray-300">{phone.price}</div>
        </div>
      ))}
      {phones.length === 0 && (
        <div className="text-sm text-gray-400 dark:text-gray-400">No similar phones found.</div>
      )}
    </div>
  </div>
);

export default SimilarPhones;
