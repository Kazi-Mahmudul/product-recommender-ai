import React, { useState, useRef, useEffect, useCallback } from "react";
import { Moon, Sun, Menu, Search, X, Loader2, Smartphone } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import UserDropdown from "./UserDropdown";
import { useAuth } from "../context/AuthContext";
import { fuzzySearchPhones, SearchResult } from "../api/search";
import { generatePhoneDetailUrl } from "../utils/slugUtils";

interface NavbarProps {
  onMenuClick?: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = ({
  onMenuClick,
  darkMode,
  setDarkMode,
}) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Define handleSearch with useCallback to prevent unnecessary re-renders
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await fuzzySearchPhones(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchFocused(false);
      }
    }
    if (dropdownOpen || searchOpen)
      document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen, searchOpen]);

  // Handle search functionality
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [handleSearch, searchQuery]);

  // Focus search input when search is opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/phones?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleResultClick = (phoneId: string) => {
    // For search results, we use the ID and let the backend handle the redirect to slug-based URL
    navigate(`/phones/${phoneId}`);
    setSearchOpen(false);
    setSearchQuery("");
  };

  // Helper to determine if a route is active
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="w-full flex items-center justify-between px-4 sm:px-6 py-4 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-soft fixed top-0 left-0 z-30 border-b border-neutral-200/30 dark:border-neutral-700/30">
      <div className="flex items-center space-x-4">
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800/30 text-neutral-700 dark:text-neutral-100"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <Link to="/" className="flex items-center">
          <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
            ePick
          </span>
        </Link>
      </div>

      <ul className="hidden md:flex space-x-10 font-medium">
        {[
          { path: "/", label: "Home" },
          { path: "/chat", label: "Chat" },
          { path: "/phones", label: "Phones" },
          { path: "/compare", label: "Compare" },
        ].map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={
                isActive(item.path)
                  ? 'text-brand font-medium relative after:content-[""] after:absolute after:bottom-[-8px] after:left-0 after:w-full after:h-1 after:bg-brand after:rounded-full'
                  : "text-neutral-700 dark:text-neutral-100 hover:text-brand dark:hover:text-brand transition-colors duration-200"
              }
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex items-center space-x-5 relative">
        {/* Search Button */}
        <div className="relative" ref={searchRef}>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800/30 text-neutral-700 dark:text-neutral-100 hover:bg-brand/10 dark:hover:bg-brand/10 hover:text-brand dark:hover:text-brand transition-all duration-200"
            aria-label="Search"
          >
            <Search size={20} />
          </button>

          {searchOpen && (
            <div className="fixed sm:absolute left-0 sm:left-auto right-0 sm:right-0 top-16 sm:top-auto sm:mt-2 mx-4 sm:mx-0 w-auto sm:w-80 bg-white dark:bg-neutral-900 rounded-2xl shadow-soft-lg z-50 border border-neutral-200 dark:border-neutral-700/30 p-3">
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search phones..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-neutral-100 dark:bg-neutral-800/30 text-neutral-700 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand/30"
                    autoComplete="off"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      <X size={16} />
                    </button>
                  ) : (
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    />
                  )}

                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 size={16} className="animate-spin text-brand" />
                    </div>
                  )}
                </div>
              </form>

              {/* Search Results */}
              {searchFocused && searchQuery.trim().length >= 2 && (
                <div className="mt-3 max-h-[50vh] sm:max-h-60 overflow-y-auto rounded-xl">
                  {searchResults.length > 0 ? (
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {searchResults.map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center gap-3 p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors duration-150"
                          onClick={() => handleResultClick(result.id)}
                        >
                          <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                            {result.img_url ? (
                              <img
                                src={result.img_url}
                                alt={result.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Smartphone
                                size={16}
                                className="text-neutral-400"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                              {result.brand} {result.name}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {result.ram && `${result.ram} • `}
                              {result.internal_storage &&
                                `${result.internal_storage} • `}
                              <span className="text-brand font-medium">
                                ৳ {result.price}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !isSearching && (
                      <div className="py-3 px-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
                        No phones found matching "{searchQuery}"
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2.5 rounded-full transition-all duration-200 ${
            darkMode
              ? "bg-neutral-800/30 text-neutral-100 hover:bg-brand/10 hover:text-brand"
              : "bg-neutral-100 text-neutral-700 hover:bg-brand/10 hover:text-brand"
          }`}
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* User Profile or Login */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="focus:outline-none flex items-center justify-center w-10 h-10 rounded-full bg-brand/10 hover:bg-brand/20 transition-colors duration-200"
            >
              <img
                src="https://i.ibb.co/JRrdjsrv/profile-circle.png"
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
              />
            </button>
            {dropdownOpen && (
              <UserDropdown user={user} onLogout={logout} darkMode={darkMode} />
            )}
          </div>
        ) : (
          <div className="hidden md:block relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="rounded-full px-6 py-2.5 font-medium text-white text-sm bg-brand hover:bg-brand-darkGreen hover:text-hover-light transition-colors duration-200 shadow-soft"
            >
              Login / Signup
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-neutral-900 rounded-2xl shadow-soft-lg z-50 border border-neutral-200 dark:border-neutral-700/30 overflow-hidden">
                {[
                  { path: "/login", label: "Login" },
                  { path: "/signup", label: "Signup" },
                ].map((item) => (
                  <button
                    key={item.path}
                    className={`block w-full text-left px-5 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800/30 transition-colors duration-200 ${
                      location.pathname === item.path
                        ? "font-medium text-brand"
                        : "text-neutral-700 dark:text-neutral-100"
                    }`}
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate(item.path);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
