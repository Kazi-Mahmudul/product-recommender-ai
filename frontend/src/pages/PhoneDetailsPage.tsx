import React from "react";
import { useParams } from "react-router-dom";

const PhoneDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Phone Details</h1>
      <p className="text-lg text-gray-700 dark:text-gray-300">Full specs for phone ID: <span className="font-mono font-semibold">{id}</span> will be shown here.</p>
    </div>
  );
};

export default PhoneDetailsPage; 