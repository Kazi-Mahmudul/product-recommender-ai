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
    value: 'support@epick.com',
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
    <footer className="w-full bg-epick-offWhite dark:bg-epick-black border-t border-epick-lightGray dark:border-epick-darkGray/30 pt-16 pb-8 mt-16">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Footer Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
          {/* Brand Column */}
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
                ePick
              </h2>
            </div>
            <p className="text-epick-mediumGray dark:text-epick-mediumGray/80 text-sm mb-6 max-w-xs">
              Your AI-powered smartphone recommendation platform. Find the perfect device tailored to your needs in Bangladesh.
            </p>
            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className="w-9 h-9 rounded-full bg-brand/10 dark:bg-brand/5 flex items-center justify-center text-brand hover:bg-brand hover:text-white transition-colors duration-200"
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>
          
          {/* Quick Links Column */}
          <div>
            <h3 className="text-lg font-semibold text-epick-darkGray dark:text-epick-offWhite mb-6">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {footerLinks.map(link => (
                <li key={link.label}>
                  <a 
                    href={link.href} 
                    className="text-epick-mediumGray dark:text-epick-mediumGray/80 hover:text-brand dark:hover:text-brand transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Contact Column */}
          <div>
            <h3 className="text-lg font-semibold text-epick-darkGray dark:text-epick-offWhite mb-6">
              Contact Us
            </h3>
            <ul className="space-y-4">
              {contactInfo.map(item => (
                <li key={item.label} className="flex items-start gap-3">
                  <span className="text-brand mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-epick-darkGray dark:text-epick-offWhite">
                      {item.label}
                    </p>
                    <p className="text-sm text-epick-mediumGray dark:text-epick-mediumGray/80">
                      {item.value}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-epick-lightGray/70 dark:bg-epick-darkGray/30 my-8"></div>
        
        {/* Footer Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-epick-mediumGray dark:text-epick-mediumGray/80">
            &copy; {currentYear} ePick. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <a href="/privacy-policy" className="text-sm text-epick-mediumGray dark:text-epick-mediumGray/80 hover:text-brand dark:hover:text-brand transition-colors duration-200">
              Privacy Policy
            </a>
            <a href="/terms" className="text-sm text-epick-mediumGray dark:text-epick-mediumGray/80 hover:text-brand dark:hover:text-brand transition-colors duration-200">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
