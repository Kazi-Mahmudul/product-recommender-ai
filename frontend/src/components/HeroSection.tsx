import React from 'react';

interface HeroSectionProps {
  children?: React.ReactNode;
  backgroundImage?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({ children, backgroundImage }) => (
  <section
    className="hero-section-bg w-full flex flex-col items-center justify-center min-h-[60vh] pt-20 pb-8 px-4 relative bg-cover bg-center"
    style={{
      backgroundColor: '#f4e2d4',
      backgroundImage: `url('https://i.ibb.co/nqMCWwSt/Hero-bg-mobile.png')`,
    }}
  >
    <style>{`
      @media (min-width: 768px) {
        .hero-section-bg {
          background-image: url('https://i.ibb.co/99jwDtmC/Hero-bg-web.png') !important;
        }
      }
    `}</style>
    <div className="absolute inset-0 w-full h-full z-0">
      <div className="w-full h-full from-black/40 via-black/10 to-black/30"></div>
    </div>
    <div className="max-w-2xl w-full text-center z-10">
      <h1 className="text-3xl md:text-5xl font-bold mb-4 text-white drop-shadow-lg">
        Find Your Perfect Device with AI
      </h1>
      <p className="text-lg md:text-xl mb-6 text-white/90 drop-shadow">
        Smartphone recommendations tailored for your needs. Just ask.
      </p>
      {children}
    </div>
  </section>
);

export default HeroSection;
