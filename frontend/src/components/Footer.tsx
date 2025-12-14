import React from 'react';
import { Twitter, Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';

const currentYear = new Date().getFullYear();

const footerLinks = [
  { label: 'About Us', href: '/about' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'FAQ', href: '/faq' },
];

const socialLinks = [
  {
    label: 'Twitter',
    href: 'https://twitter.com/',
    icon: <Twitter size={20} />,
  },
  {
    label: 'Facebook',
    href: 'https://facebook.com/',
    icon: <Facebook size={20} />,
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com/',
    icon: <Instagram size={20} />,
  },
];

const contactInfo = [
  {
    label: 'Email',
    value: 'support@peyechi.com',
    icon: <Mail size={16} />,
  },
  {
    label: 'Phone',
    value: '+880 1234-567890',
    icon: <Phone size={16} />,
  },
  {
    label: 'Address',
    value: 'Dhaka, Bangladesh',
    icon: <MapPin size={16} />,
  },
];

export default function Footer() {
  return (
    <footer className="w-full bg-peyechi-offWhite dark:bg-peyechi-black border-t border-peyechi-lightGray dark:border-peyechi-darkGray/30 pt-6 sm:pt-8 md:pt-12 pb-4 sm:pb-6 md:pb-8 mt-6 sm:mt-8 md:mt-12">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
        {/* Footer Top Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-10">
          {/* Brand Column */}
          <div className="sm:col-span-2 md:col-span-1">
            <div className="mb-2 sm:mb-3">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
                Peyechi
              </h2>
            </div>
            <p className="text-peyechi-mediumGray dark:text-peyechi-mediumGray/80 text-xs sm:text-sm md:text-base mb-3 sm:mb-4 md:mb-6 max-w-xs leading-relaxed">
              Your trusted companion for discovering the perfect smartphone in Bangladesh. Get personalized recommendations based on your needs and budget.
            </p>
            {/* Social Links */}
            <div className="flex space-x-2 sm:space-x-3">
              {socialLinks.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-brand/10 dark:bg-brand/5 flex items-center justify-center text-brand hover:bg-brand hover:text-white transition-colors duration-200 touch-manipulation"
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>
          
          {/* Quick Links Column */}
          <div>
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-peyechi-darkGray dark:text-peyechi-offWhite mb-3 sm:mb-4 md:mb-6">
              Quick Links
            </h3>
            <ul className="space-y-1 sm:space-y-2">
              {footerLinks.map(link => (
                <li key={link.label}>
                  <a 
                    href={link.href} 
                    className="text-xs sm:text-sm md:text-base text-peyechi-mediumGray dark:text-peyechi-mediumGray/80 hover:text-brand dark:hover:text-brand transition-colors duration-200 py-1 block touch-manipulation"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Contact Column */}
          <div>
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-peyechi-darkGray dark:text-peyechi-offWhite mb-3 sm:mb-4 md:mb-6">
              Contact Us
            </h3>
            <ul className="space-y-2 sm:space-y-3">
              {contactInfo.map(item => (
                <li key={item.label} className="flex items-start gap-1.5 sm:gap-2">
                  <span className="text-brand mt-0.5 flex-shrink-0">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs md:text-sm font-medium text-peyechi-darkGray dark:text-peyechi-offWhite">
                      {item.label}
                    </p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-peyechi-mediumGray dark:text-peyechi-mediumGray/80 break-words">
                      {item.value}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-peyechi-lightGray/70 dark:bg-peyechi-darkGray/30 my-4 sm:my-6"></div>
        
        {/* Footer Bottom */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3">
          <div className="text-[10px] sm:text-xs md:text-sm text-peyechi-mediumGray dark:text-peyechi-mediumGray/80 text-center sm:text-left">
            &copy; {currentYear} Peyechi. All rights reserved.
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <a href="/privacy-policy" className="text-[10px] sm:text-xs md:text-sm text-peyechi-mediumGray dark:text-peyechi-mediumGray/80 hover:text-brand dark:hover:text-brand transition-colors duration-200 py-1 touch-manipulation">
              Privacy Policy
            </a>
            <a href="/terms" className="text-[10px] sm:text-xs md:text-sm text-peyechi-mediumGray dark:text-peyechi-mediumGray/80 hover:text-brand dark:hover:text-brand transition-colors duration-200 py-1 touch-manipulation">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
