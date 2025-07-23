import React from 'react';

interface HeroSectionProps {
  children?: React.ReactNode;
}

const HeroSection: React.FC<HeroSectionProps> = ({ children }) => (
  <section className="w-full flex flex-col items-center justify-center min-h-[70vh] pt-20 pb-12 px-4 relative overflow-hidden">
    {/* Decorative background elements */}
    <div className="absolute top-20 left-1/4 w-64 h-64 rounded-full bg-brand/10 filter blur-3xl animate-float"></div>
    <div className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full bg-accent/10 filter blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
    
    {/* Decorative shapes */}
    <div className="absolute top-40 right-[15%] w-12 h-12 rounded-full border-4 border-brand opacity-20 animate-float" style={{ animationDelay: '1s' }}></div>
    <div className="absolute bottom-32 left-[20%] w-8 h-8 rounded-md rotate-45 border-4 border-accent/60 opacity-30 animate-float" style={{ animationDelay: '3s' }}></div>
    
    <div className="max-w-3xl w-full text-center relative z-10">
      <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-brand/10 text-brand dark:text-brand font-medium text-sm">
        AI-Powered Smartphone Recommendations
      </div>
      <h1 className="text-4xl md:text-6xl font-bold mb-6 text-epick-darkGray dark:text-epick-offWhite leading-tight">
        Find Your <span className="text-brand">Perfect Device</span> with AI
      </h1>
      <p className="text-lg md:text-xl mb-8 text-epick-darkGray/80 dark:text-epick-offWhite/80 max-w-2xl mx-auto">
        Get personalized smartphone recommendations tailored specifically for your needs and preferences. Just ask our AI assistant.
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
          <div key={idx} className="flex flex-col items-center p-4 rounded-xl bg-white/50 dark:bg-epick-black/20 backdrop-blur-sm border border-epick-lightGray/50 dark:border-epick-darkGray/20">
            <span className="text-2xl mb-2">{feature.icon}</span>
            <span className="text-sm font-medium text-epick-darkGray dark:text-epick-offWhite">{feature.text}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HeroSection;