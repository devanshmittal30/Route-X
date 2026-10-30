import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, X, Loader2 } from 'lucide-react';
import type { SelectedLocation } from './types';
import { searchPlaces } from './geocodingClient';

export interface LocationPickerProps {
  currentLocation: SelectedLocation;
  onSelectLocation: (loc: SelectedLocation) => void;
  onUseDeviceLocation?: () => void;
  isLocatingDevice?: boolean;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  currentLocation,
  onSelectLocation,
  onUseDeviceLocation,
  isLocatingDevice = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SelectedLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchPlaces(query);
      setResults(res);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (loc: SelectedLocation) => {
    onSelectLocation(loc);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-surface hover:bg-surface-2 border border-border text-text font-medium text-xs sm:text-sm transition-colors shadow-xs"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MapPin size={14} className="text-brand shrink-0" />
        <span className="font-semibold text-brand truncate max-w-[200px] sm:max-w-[280px]">
          {currentLocation.name}
        </span>
        <span className="text-text-3 text-[11px]">▾</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-72 sm:w-80 bg-white border border-border rounded-card shadow-lg z-50 p-2 text-xs text-text animate-fadeIn">
          {/* Search Input Box */}
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city or hill station (e.g. Manali)..."
              className="w-full pl-8 pr-7 py-1.5 rounded-btn bg-surface border border-border text-text text-xs focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-3 hover:text-text"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Device GPS Location Action */}
          {onUseDeviceLocation && (
            <button
              type="button"
              disabled={isLocatingDevice}
              onClick={() => {
                onUseDeviceLocation();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 mb-1.5 rounded-btn bg-brand-soft text-brand hover:bg-brand-soft/80 text-left transition-colors font-medium text-xs disabled:opacity-50"
            >
              {isLocatingDevice ? (
                <Loader2 size={13} className="animate-spin text-brand shrink-0" />
              ) : (
                <Navigation size={13} className="text-brand shrink-0" />
              )}
              <span>Use my device GPS location</span>
            </button>
          )}

          {/* Search State / Results List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-border/40">
            {isSearching ? (
              <div className="py-4 text-center text-text-3 flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin text-accent" />
                <span>Searching places...</span>
              </div>
            ) : results.length > 0 ? (
              results.map((loc, idx) => (
                <button
                  key={`${loc.latitude}-${loc.longitude}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(loc)}
                  className="w-full text-left px-2.5 py-1.5 rounded-btn hover:bg-surface-2 transition-colors flex items-center justify-between gap-2"
                >
                  <span className="font-medium text-text truncate">{loc.name}</span>
                  <span className="text-[10px] font-mono text-text-3 shrink-0">
                    {loc.latitude.toFixed(2)}, {loc.longitude.toFixed(2)}
                  </span>
                </button>
              ))
            ) : query.length >= 2 ? (
              <div className="py-3 text-center text-text-3">No places found</div>
            ) : (
              <div className="py-2 px-2 text-[11px] text-text-3 italic">
                Type place name to search Himalayan & Northeast locations...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
