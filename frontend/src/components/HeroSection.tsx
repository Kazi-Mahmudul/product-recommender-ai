import React from 'react';

interface HeroSectionProps {
  children?: React.ReactNode;
}

const HeroSection: React.FC<HeroSectionProps> = ({ children }) => (
  <section className="w-full flex flex-col items-center justify-center min-h-[60vh] pt-20 pb-8 px-4">
    <div className="max-w-2xl w-full text-center">
      <h1 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
        Find Your Perfect Device with AI
      </h1>
      <p className="text-lg md:text-xl mb-6 text-gray-700 dark:text-gray-200">
        Smartphone recommendations tailored for your needs. Just ask.
      </p>
      {children}
    </div>
  </section>
);

export default HeroSection;