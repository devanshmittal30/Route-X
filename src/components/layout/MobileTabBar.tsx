
import { Link, useLocation } from 'react-router-dom';
import { Home, Navigation, Map, Gift, User } from 'lucide-react';

export const MobileTabBar: React.FC = () => {
  const location = useLocation();

  const tabs = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/route', label: 'Route', icon: Navigation },
    { to: '/map', label: 'Map', icon: Map },
    { to: '/rewards', label: 'Rewards', icon: Gift },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border flex items-center justify-around h-16 px-2 shadow-lg"
      aria-label="Mobile Bottom Navigation"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = location.pathname === tab.to;

        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isActive ? 'text-brand font-semibold' : 'text-text-3 hover:text-text'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
            <span className="text-[11px] mt-1 leading-none">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
