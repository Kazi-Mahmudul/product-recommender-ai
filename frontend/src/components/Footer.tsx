import React from 'react';

const currentYear = new Date().getFullYear();

const footerLinks = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms' },
];

const socialLinks = [
  {
    label: 'Twitter',
    href: 'https://twitter.com/',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 5.92a8.15 8.15 0 01-2.36.65A4.1 4.1 0 0021.4 4.1a8.18 8.18 0 01-2.6.99A4.1 4.1 0 0012 8.09c0 .32.04.63.1.93A11.65 11.65 0 013 4.79a4.1 4.1 0 001.27 5.47A4.07 4.07 0 012.8 9.1v.05a4.1 4.1 0 003.29 4.02c-.29.08-.6.12-.92.12-.22 0-.44-.02-.65-.06a4.11 4.11 0 003.83 2.85A8.23 8.23 0 012 19.54a11.6 11.6 0 006.29 1.84c7.55 0 11.69-6.26 11.69-11.69 0-.18 0-.37-.01-.55A8.18 8.18 0 0022 5.92z" fill="currentColor"/></svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://facebook.com/',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 5 3.66 9.12 8.44 9.88v-6.99h-2.54v-2.89h2.54V9.41c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.25c-1.23 0-1.61.77-1.61 1.56v1.87h2.74l-.44 2.89h-2.3v6.99C18.34 21.12 22 17 22 12z" fill="currentColor"/></svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com/',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="5" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="w-full bg-[#fdf6f0] dark:bg-[#232323] text-[#a48e7a] dark:text-[#bca58a] pt-8 pb-4 px-2 mt-12 text-sm select-none">
      <div className="max-w-5xl mx-auto flex flex-col gap-4 items-center justify-center">
        {/* Top Row */}
        <div className="w-full flex justify-between mb-2 text-base font-normal">
          <a href={footerLinks[0].href} className="hover:underline" tabIndex={0}>{footerLinks[0].label}</a>
          <a href={footerLinks[1].href} className="hover:underline" tabIndex={0}>{footerLinks[1].label}</a>
        </div>
        {/* Social Icons */}
        <div className="flex flex-row gap-6 mb-2">
          {socialLinks.map(link => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              className="hover:text-brand focus:outline-none focus:text-brand transition-colors"
            >
              {link.icon}
            </a>
          ))}
        </div>
        {/* Contact Us (optional) */}
        <div className="mb-1 text-xs">
          <a href="mailto:support@epick.com" className="hover:underline">Contact Us</a>
        </div>
        {/* Copyright */}
        <div className="text-center text-xs opacity-90 mt-1">
          &copy;{currentYear} ePick. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
