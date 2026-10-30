import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LifeBuoy, User, Menu, X, MessageSquareWarning } from 'lucide-react';
import { Switch } from '../ui/Switch';

export interface HeaderProps {
  demoMode?: boolean;
  onToggleDemoMode?: (enabled: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  demoMode = true,
  onToggleDemoMode,
}) => {
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [internalDemoMode, setInternalDemoMode] = useState(demoMode);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleDemoToggle = (checked: boolean) => {
    setInternalDemoMode(checked);
    onToggleDemoMode?.(checked);
  };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/route', label: 'Plan Route' },
    { to: '/map', label: 'Hazard Map' },
    { to: '/stays', label: 'Stays' },
    { to: '/rewards', label: 'Rewards' },
    { to: '/offline', label: 'Offline' },
    { to: '/about', label: 'About' },
  ];

  return (
    <header className="sticky top-0 z-40 h-16 w-full bg-white border-b border-border shadow-sm">
      <div className="max-w-[1200px] h-full mx-auto px-4 flex items-center justify-between gap-4">
        {/* Brand Logo with Mountain-Route Glyph */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-btn"
          aria-label="RouteX Home"
        >
          {/* Mountain-Route Glyph SVG */}
          <svg
            className="w-8 h-8 text-brand"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M4 24L12 10L18 19L23 12L28 24H4Z"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Route path curve through the mountains */}
            <path
              d="M3 24C8 22 13 25 17 21C21 17 25 21 29 19"
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="17" cy="21" r="2" fill="var(--risk-high)" />
          </svg>
          <span className="text-h2 font-bold tracking-tight text-brand">RouteX</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-btn text-small font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isActive
                    ? 'bg-brand-soft text-brand font-semibold'
                    : 'text-text-2 hover:text-text hover:bg-surface'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Header Right Controls */}
        <div className="flex items-center gap-3">
          {/* Demo Mode Switch (desktop) */}
          <div className="hidden sm:flex items-center">
            <Switch
              checked={internalDemoMode}
              onChange={handleDemoToggle}
              label="Demo"
              id="header-demo-switch"
            />
          </div>

          {/* Online/Offline status dot */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-chip bg-surface text-small text-text-2 border border-border"
            title={isOnline ? 'Online (Realtime connected)' : 'Offline (Cached data mode)'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-risk-low shadow-[0_0_6px_rgba(21,128,61,0.5)]' : 'bg-text-3'
              }`}
            />
            <span className="hidden sm:inline text-xs font-medium">
              {isOnline ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* Persistent SOS Button */}
          <Link
            to="/sos"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sos text-white rounded-btn text-small font-bold hover:opacity-95 shadow-sm active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Emergency SOS"
          >
            <LifeBuoy className="w-4 h-4 animate-pulse" />
            <span>SOS</span>
          </Link>

          {/* Profile / Login */}
          <Link
            to="/profile"
            className="p-2 rounded-btn text-text-2 hover:text-brand hover:bg-surface transition-colors border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="User Profile"
          >
            <User className="w-4 h-4" />
          </Link>

          {/* Mobile hamburger menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-btn text-text-2 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-border px-4 py-3 space-y-2 shadow-card animate-fadeIn">
          <div className="py-2 border-b border-border flex items-center justify-between">
            <span className="text-small font-medium text-text-2">Demo mode</span>
            <Switch
              checked={internalDemoMode}
              onChange={handleDemoToggle}
              id="mobile-demo-switch"
            />
          </div>
          <div className="grid grid-cols-2 gap-1 pt-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-btn text-small font-medium ${
                    isActive
                      ? 'bg-brand-soft text-brand font-semibold'
                      : 'text-text-2 hover:bg-surface'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="pt-2 border-t border-border flex gap-2">
            <Link
              to="/alerts"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-small text-text-2 border border-border rounded-btn"
            >
              <MessageSquareWarning className="w-4 h-4 text-risk-moderate" />
              <span>Alerts</span>
            </Link>
            <Link
              to="/design-system"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 flex items-center justify-center py-2 text-small text-text-3 border border-border rounded-btn"
            >
              Design System
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
