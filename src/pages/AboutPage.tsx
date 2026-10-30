
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-[1000px] w-full mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-h1 font-bold text-brand mb-2">About RouteX & Risk Methodology</h1>
        <p className="text-body text-text-2">
          RouteX is a disaster-aware navigation system designed for the Himalayan states and Northeast India.
        </p>
      </div>

      <Banner variant="disclaimer">
        RouteX gives risk estimates from public data and user reports. It is not an official warning. Follow IMD, NDMA and local administration advisories.
      </Banner>

      <Card className="space-y-4">
        <h2 className="text-h2 font-semibold text-text">How Risk Scoring Works</h2>
        <p className="text-body text-text-2">
          Every route segment is evaluated across six weighted environmental and crowdsourced factors (0–100 total score):
        </p>
        <ul className="list-disc list-inside text-body text-text-2 space-y-1.5 ml-2">
          <li><strong>Rainfall (30%):</strong> Past 72 h accumulation + next 48 h forecast and max hourly intensity (Open-Meteo).</li>
          <li><strong>Terrain Slope (20%):</strong> Elevation differential from sampling neighbours (Open-Meteo Elevation).</li>
          <li><strong>Community Reports (20%):</strong> Active verified hazard reports within 500 m.</li>
          <li><strong>Historical Records (15%):</strong> Geological Survey of India (GSI) landslide inventory.</li>
          <li><strong>Soil Wetness (10%):</strong> Surface soil moisture (0–1 cm).</li>
          <li><strong>Seismic Activity (5%):</strong> USGS M4.5+ events within 150 km in the last 72 h.</li>
        </ul>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-h2 font-semibold text-text">Data Attributions</h2>
        <p className="text-small text-text-2 leading-relaxed">
          © OpenStreetMap contributors (ODbL) · Weather data by Open-Meteo.com (CC BY 4.0) · USGS Earthquake Hazards Program · Geological Survey of India (GSI) · Protomaps basemap data · OpenRouteService / OSRM (FOSSGIS).
        </p>
      </Card>
    </div>
  );
};
