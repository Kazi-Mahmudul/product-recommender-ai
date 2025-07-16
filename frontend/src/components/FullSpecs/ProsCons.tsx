import React from "react";

interface ProsConsProps {
  pros: string[];
  cons: string[];
  loading: boolean;
  onGenerate: () => void;
}

const ProsCons: React.FC<ProsConsProps> = ({ pros, cons, loading, onGenerate }) => (
  <div className="rounded-2xl shadow p-4 border bg-white border-brand dark:bg-gray-900 dark:border-gray-700">
    <div className="font-semibold mb-2 text-brand">Pros & Cons
      <button onClick={onGenerate} className="ml-2 px-3 py-1 bg-brand text-white rounded-full text-xs font-semibold hover:opacity-90 transition">
        {loading ? "Generating..." : "Regenerate"}
      </button>
    </div>
    <div className="flex gap-8">
      <ul className="text-green-700 dark:text-green-400 text-sm list-disc ml-5 flex-1">{pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
      <ul className="text-red-600 dark:text-red-400 text-sm list-disc ml-5 flex-1">{cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
    </div>
  </div>
);

export default ProsCons;
