import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, MapPin, Crosshair } from 'lucide-react';
import type { GeocodedPlace } from '../../features/routing/types';
import { geocodePlace } from '../../features/routing/geocoding';

export interface RouteAutocompleteProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  onSelectPlace: (place: GeocodedPlace) => void;
  icon?: React.ReactNode;
  onPickOnMap?: () => void;
  isPickingOnMap?: boolean;
  onUseGps?: () => void;
  isGpsLoading?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const RouteAutocomplete: React.FC<RouteAutocompleteProps> = ({
  label,
  placeholder = 'Search place...',
  value,
  onChange,
  onSelectPlace,
  icon,
  onPickOnMap,
  isPickingOnMap = false,
  onUseGps,
  isGpsLoading = false,
  inputRef,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
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
    if (value.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      const results = await geocodePlace(value);
      setSuggestions(results);
      setIsLoading(false);
      if (results.length > 0) {
        setIsOpen(true);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [value]);

  const handleSelect = (place: GeocodedPlace) => {
    onSelectPlace(place);
    onChange(place.displayName);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between mb-1 gap-2">
        <label className="text-[11px] font-semibold text-text-3 uppercase tracking-wider shrink-0">
          {label}
        </label>

        <div className="flex items-center gap-2">
          {onUseGps && (
            <button
              type="button"
              onClick={onUseGps}
              disabled={isGpsLoading}
              title="Use current GPS location"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:text-brand-dark bg-brand/10 hover:bg-brand/15 px-2 py-0.5 rounded-chip border border-brand/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isGpsLoading ? (
                <Loader2 size={11} className="animate-spin text-brand" />
              ) : (
                <Crosshair size={11} className="text-brand" />
              )}
              <span>{isGpsLoading ? 'Locating...' : 'Use GPS'}</span>
            </button>
          )}

          {onPickOnMap && (
            <button
              type="button"
              onClick={onPickOnMap}
              className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
                isPickingOnMap
                  ? 'text-risk-high font-bold animate-pulse'
                  : 'text-accent hover:underline'
              }`}
            >
              <MapPin size={11} />
              <span>{isPickingOnMap ? 'Click map now' : 'Pick on map'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none">
            {icon}
          </span>
        )}

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full py-2 text-xs rounded-btn bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-accent font-medium ${
            icon ? 'pl-8 pr-8' : 'px-3 pr-8'
          }`}
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && <Loader2 size={13} className="animate-spin text-accent" />}
          {value && !isLoading && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setSuggestions([]);
                setIsOpen(false);
              }}
              className="text-text-3 hover:text-text p-0.5"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-border rounded-card shadow-lg z-50 p-1 text-xs divide-y divide-border/40 animate-fadeIn">
          {suggestions.map((item, idx) => (
            <button
              key={`${item.latitude}-${item.longitude}-${idx}`}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left px-2.5 py-1.5 rounded-btn hover:bg-surface-2 transition-colors flex items-center justify-between gap-2"
            >
              <div className="truncate">
                <span className="font-semibold text-text">{item.name}</span>
                {item.admin1 && (
                  <span className="text-text-3 text-[11px] ml-1.5">({item.admin1})</span>
                )}
              </div>
              <span className="text-[10px] font-mono text-text-3 shrink-0">
                {item.latitude.toFixed(2)}, {item.longitude.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
