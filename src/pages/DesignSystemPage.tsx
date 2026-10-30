import React, { useState } from 'react';
import {
  Button,
  Card,
  Badge,
  RiskBadge,
  RiskMeter,
  TestBadge,
  DemoBadge,
  SponsoredBadge,
  VerifiedBadge,
  Banner,
  Modal,
  Drawer,
  Tabs,
  Toast,
  Skeleton,
  EmptyState,
  Input,
  Select,
  Switch,
} from '../components/ui';
import { Search, MapPin, AlertTriangle } from 'lucide-react';

export const DesignSystemPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tab1');
  const [switchChecked, setSwitchChecked] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const colorTokens = [
    { name: '--bg', hex: '#FFFFFF', desc: 'Page background', textClass: 'text-text', bgClass: 'bg-white border border-border' },
    { name: '--surface', hex: '#F6F8FB', desc: 'Cards, panels, input fill', textClass: 'text-text', bgClass: 'bg-surface' },
    { name: '--surface-2', hex: '#EDF1F7', desc: 'Hover, table stripes', textClass: 'text-text', bgClass: 'bg-surface-2' },
    { name: '--border', hex: '#DDE3EC', desc: 'Borders, dividers', textClass: 'text-text', bgClass: 'bg-border' },
    { name: '--text', hex: '#0F172A', desc: 'Primary text', textClass: 'text-white', bgClass: 'bg-text' },
    { name: '--text-2', hex: '#475569', desc: 'Secondary text', textClass: 'text-white', bgClass: 'bg-text-2' },
    { name: '--text-3', hex: '#64748B', desc: 'Muted text (min 13px)', textClass: 'text-white', bgClass: 'bg-text-3' },
    { name: '--brand', hex: '#0B3C5D', desc: 'Logo, headers, primary buttons', textClass: 'text-white', bgClass: 'bg-brand' },
    { name: '--brand-hover', hex: '#082C45', desc: 'Primary button hover', textClass: 'text-white', bgClass: 'bg-brand-hover' },
    { name: '--brand-soft', hex: '#E6EEF4', desc: 'Selected states, chips', textClass: 'text-brand', bgClass: 'bg-brand-soft' },
    { name: '--accent', hex: '#1D6FA5', desc: 'Links, focus ring', textClass: 'text-white', bgClass: 'bg-accent' },
    { name: '--risk-low', hex: '#15803D', desc: 'Low (0-24) Safe to proceed', textClass: 'text-white', bgClass: 'bg-risk-low' },
    { name: '--risk-moderate', hex: '#B45309', desc: 'Moderate (25-49) Be careful', textClass: 'text-white', bgClass: 'bg-risk-moderate' },
    { name: '--risk-high', hex: '#C2410C', desc: 'High (50-74) Avoid if possible', textClass: 'text-white', bgClass: 'bg-risk-high' },
    { name: '--risk-severe', hex: '#B91C1C', desc: 'Severe (75-100) Do not travel', textClass: 'text-white', bgClass: 'bg-risk-severe' },
    { name: '--risk-blocked', hex: '#111827', desc: 'Road/trail blocked', textClass: 'text-white', bgClass: 'bg-risk-blocked' },
    { name: '--info', hex: '#0369A1', desc: 'Information, forecasts', textClass: 'text-white', bgClass: 'bg-info' },
    { name: '--verified', hex: '#1D4ED8', desc: 'Community verified', textClass: 'text-white', bgClass: 'bg-verified' },
    { name: '--sponsored', hex: '#6D28D9', desc: 'Sponsored demo partner', textClass: 'text-white', bgClass: 'bg-sponsored' },
    { name: '--test', hex: '#475569', desc: 'TEST data label', textClass: 'text-white', bgClass: 'bg-test' },
    { name: '--sos', hex: '#DC2626', desc: 'SOS emergency button', textClass: 'text-white', bgClass: 'bg-sos' },
  ];

  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-8 space-y-12">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="brand">Dev Only</Badge>
          <span className="text-small text-text-3 font-mono">/design-system</span>
        </div>
        <h1 className="text-h1 font-bold text-brand">RouteX Design System</h1>
        <p className="text-body text-text-2 mt-1">
          Reference components, semantic risk levels, and token palette based on <code>02-ui-ux-design.md</code>.
        </p>
      </div>

      {/* 1. Colour Tokens */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text">1. Colour Tokens</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {colorTokens.map((t) => (
            <div key={t.name} className="p-3 rounded-card border border-border bg-white shadow-sm space-y-2">
              <div className={`h-12 w-full rounded-btn flex items-center justify-center font-mono text-xs font-semibold ${t.bgClass} ${t.textClass}`}>
                {t.hex}
              </div>
              <div>
                <p className="text-small font-semibold font-mono text-text">{t.name}</p>
                <p className="text-xs text-text-3 leading-tight">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Semantic Risk Levels */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text">2. Risk Levels & Meters</h2>
        <Card className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <RiskBadge level="low" score={15} />
            <RiskBadge level="moderate" score={38} />
            <RiskBadge level="high" score={62} />
            <RiskBadge level="severe" score={89} />
            <RiskBadge level="blocked" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <RiskMeter score={18} label="Shimla Bypass Segment 1" />
            <RiskMeter score={45} label="Solan Valley Cut" />
            <RiskMeter score={72} label="Kullu Gorge (High Rain Alert)" />
            <RiskMeter score={92} label="Rohtang Pass (Active Landslide)" />
          </div>
        </Card>
      </section>

      {/* 3. Status Badges */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text">3. Status & Audit Badges</h2>
        <Card className="flex flex-wrap items-center gap-4">
          <TestBadge />
          <DemoBadge />
          <SponsoredBadge />
          <VerifiedBadge count={7} />
          <Badge variant="brand">Brand Soft</Badge>
          <Badge variant="info">Weather Alert</Badge>
        </Card>
      </section>

      {/* 4. Buttons */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text">4. Buttons</h2>
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary Action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Emergency SOS</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="primary" loading>Loading State</Button>
            <Button variant="secondary" disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button size="sm" variant="primary">Small (36px)</Button>
            <Button size="md" variant="primary">Medium (44px)</Button>
            <Button size="lg" variant="primary">Large (48px)</Button>
          </div>
        </Card>
      </section>

      {/* 5. Inputs & Form Controls */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text">5. Form Controls</h2>
        <Card className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input
            label="Origin"
            placeholder="Search place in India..."
            leftIcon={<Search className="w-4 h-4" />}
            defaultValue="Shimla, Himachal Pradesh"
          />
          <Input
            label="Destination"
            placeholder="Search destination..."
            leftIcon={<MapPin className="w-4 h-4" />}
            defaultValue="Manali"
          />
          <Input
            label="Location with Error"
            defaultValue="Invalid coordinates"
            error="Must be within India boundary area"
          />
          <Select
            label="Travel Mode"
            options={[
              { value: 'drive', label: 'Drive (Car / 4x4)' },
              { value: 'walk', label: 'Walk / Trekking' },
            ]}
          />
          <div className="flex flex-col justify-center space-y-2">
            <span className="text-small font-medium text-text">Toggles</span>
            <Switch
              checked={switchChecked}
              onChange={setSwitchChecked}
              label={switchChecked ? 'Demo Mode Active' : 'Real-only Data'}
            />
          </div>
        </Card>
      </section>

      {/* 6. Banners & Notifications */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text">6. Banners & Notifications</h2>
        <div className="space-y-3">
          {!bannerDismissed && (
            <Banner variant="offline" onDismiss={() => setBannerDismissed(true)}>
              You are currently viewing cached map data from 2 hours ago. Some live weather forecasts may be outdated.
            </Banner>
          )}
          <Banner variant="info">
            Heavy rainfall alert issued by IMD for Kinnaur and Mandi districts over the next 24 hours.
          </Banner>
          <Banner variant="disclaimer">
            RouteX gives risk estimates from public data and user reports. It is not an official warning. Follow IMD, NDMA and local administration advisories.
          </Banner>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Toast
              type="success"
              title="Report Submitted"
              message="+5 points awarded. Your report will be verified once 3 travellers confirm."
            />
            <Toast
              type="warning"
              title="Caution: High Risk Route"
              message="2 active landslides reported along NH-5. Consider the recommended alternate route."
            />
          </div>
        </div>
      </section>

      {/* 7. Tabs, Skeletons, & Overlays */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text">7. Tabs, Skeletons & Modals</h2>
        <Card className="space-y-6">
          <Tabs
            tabs={[
              { id: 'tab1', label: 'Fastest Route', badge: <RiskBadge level="high" score={68} size="sm" /> },
              { id: 'tab2', label: 'Safer Alternative', badge: <RiskBadge level="low" score={18} size="sm" /> },
              { id: 'tab3', label: 'Trek Trail' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-surface rounded-card border border-border space-y-3">
              <p className="text-small font-medium text-text">Loading Skeletons</p>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-16 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>

            <div className="p-4 bg-surface rounded-card border border-border flex flex-col justify-center items-center gap-3">
              <p className="text-small font-medium text-text">Modals & Drawers</p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setModalOpen(true)}>
                  Open Sample Modal
                </Button>
                <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
                  Open Sample Drawer
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 8. Empty State */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text">8. Empty State Standard</h2>
        <EmptyState
          icon={AlertTriangle}
          title="No Hazards Reported Nearby"
          description="The route within a 10 km radius currently has no community-reported road blockages or active slides."
          action={<Button variant="secondary">Check Route Weather</Button>}
        />
      </section>

      {/* Modal Demo */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Sample Dialog"
        description="This modal follows RouteX accessibility and token design guidelines."
      >
        <p className="text-body text-text-2 mb-4">
          All interactive elements trap focus and support keyboard navigation (ESC to close).
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => setModalOpen(false)}>Confirm</Button>
        </div>
      </Modal>

      {/* Drawer Demo */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Sample Side Drawer"
      >
        <div className="space-y-4">
          <p className="text-body text-text-2">
            Drawers slide in from the side on desktop and from the bottom on mobile screens.
          </p>
          <Button variant="primary" onClick={() => setDrawerOpen(false)}>Close Drawer</Button>
        </div>
      </Drawer>
    </div>
  );
};

