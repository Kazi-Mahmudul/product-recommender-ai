import React from 'react';

interface HeroSectionProps {
  children?: React.ReactNode;
}

const HeroSection: React.FC<HeroSectionProps> = ({ children }) => (
  <section className="w-full flex flex-col items-center justify-center min-h-[70vh] pt-20 pb-12 px-4 relative overflow-hidden">

    <div className="max-w-3xl w-full text-center relative z-10">
      <div className="inline-block mb-4 px-4 py-1.5 md:py-4 rounded-full bg-brand/10 text-brand dark:text-brand font-medium text-sm">
        AI-Powered Smartphone Recommendations
      </div>
      <h1 className="text-4xl md:text-6xl font-bold mb-6 text-peyechi-darkGray dark:text-peyechi-offWhite leading-tight">
        Find Your Perfect <span className="text-brand">Smartphone</span> in Bangladesh
      </h1>
      <p className="text-lg md:text-xl mb-8 text-peyechi-darkGray/80 dark:text-peyechi-offWhite/80 max-w-2xl mx-auto">
        Get personalized phone recommendations based on your preferences, budget, and usage patterns. Powered by AI to help you make the smart choice.
      </p>
      {children}

      {/* Feature highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-2xl mx-auto">
        {[
          { icon: "💡", text: "Smart Recommendations" },
          { icon: "🔍", text: "Detailed Comparisons" },
          { icon: "🇧🇩", text: "Local BD Pricing" },
          { icon: "⚡", text: "Instant Results" }
        ].map((feature, idx) => (
          <div key={idx} className="flex flex-col items-center p-4 rounded-xl bg-white/50 dark:bg-peyechi-black/20 backdrop-blur-sm border border-peyechi-lightGray/50 dark:border-peyechi-darkGray/20">
            <span className="text-2xl mb-2">{feature.icon}</span>
            <span className="text-sm font-medium text-peyechi-darkGray dark:text-peyechi-offWhite">{feature.text}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HeroSection;