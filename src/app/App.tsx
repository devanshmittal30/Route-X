
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';

import { HomePage } from '../pages/HomePage';
import { RoutePage } from '../pages/RoutePage';
import { MapPage } from '../pages/MapPage';
import { ReportPage } from '../pages/ReportPage';
import { ReportsPage } from '../pages/ReportsPage';
import { TrekPage } from '../pages/TrekPage';
import { OfflinePage } from '../pages/OfflinePage';
import { SosPage } from '../pages/SosPage';
import { StaysPage } from '../pages/StaysPage';
import { RewardsPage } from '../pages/RewardsPage';
import { AlertsPage } from '../pages/AlertsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { LoginPage } from '../pages/LoginPage';
import { AboutPage } from '../pages/AboutPage';
import { DesignSystemPage } from '../pages/DesignSystemPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/route" element={<RoutePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/trek" element={<TrekPage />} />
          <Route path="/offline" element={<OfflinePage />} />
          <Route path="/sos" element={<SosPage />} />
          <Route path="/stays" element={<StaysPage />} />
          <Route path="/rewards" element={<RewardsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/design-system" element={<DesignSystemPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
