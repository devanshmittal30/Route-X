
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface border-t border-border mt-auto py-8">
      <div className="max-w-[1200px] mx-auto px-4 space-y-6">
        {/* Safety Disclaimer Box */}
        <div className="flex items-start gap-3 p-4 rounded-card bg-white border border-border">
          <ShieldAlert className="w-5 h-5 text-risk-high shrink-0 mt-0.5" />
          <p className="text-small text-text-2 leading-relaxed">
            <strong className="text-text font-semibold">Safety Disclaimer: </strong>
            RouteX gives risk estimates from public data and user reports. It is not an official warning. Follow IMD, NDMA and local administration advisories.
          </p>
        </div>

        {/* Links & Attributions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2 text-small text-text-3">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 font-medium">
            <Link to="/" className="hover:text-brand transition-colors">Home</Link>
            <Link to="/route" className="hover:text-brand transition-colors">Route Planner</Link>
            <Link to="/map" className="hover:text-brand transition-colors">Hazard Map</Link>
            <Link to="/stays" className="hover:text-brand transition-colors">Safe Stays</Link>
            <Link to="/rewards" className="hover:text-brand transition-colors">Rewards</Link>
            <Link to="/about" className="hover:text-brand transition-colors">About & Methodology</Link>
            <Link to="/design-system" className="hover:text-brand transition-colors">Design System</Link>
          </div>
          <div>RouteX v0.1.0 (Hackathon Edition)</div>
        </div>

        {/* Legal Attributions */}
        <div className="pt-2 border-t border-border/60 text-xs text-text-3 leading-normal text-center md:text-left">
          © OpenStreetMap contributors (ODbL) · Weather data by Open-Meteo.com (CC BY 4.0) · USGS Earthquake Hazards Program · Geological Survey of India (GSI) · Protomaps basemap data · OpenRouteService / OSRM (FOSSGIS).
        </div>
      </div>
    </footer>
  );
};
