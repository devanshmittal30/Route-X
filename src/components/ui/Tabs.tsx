import type React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'chips' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'chips',
  className = '',
}) => {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar ${
        variant === 'underline' ? 'border-b border-border' : 'p-1 bg-surface-2 rounded-btn'
      } ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 text-small font-medium transition-all shrink-0 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              variant === 'chips'
                ? isActive
                  ? 'bg-white text-brand shadow-sm rounded-btn font-semibold'
                  : 'text-text-2 hover:text-text rounded-btn hover:bg-white/50'
                : isActive
                  ? 'text-brand border-b-2 border-brand -mb-[1px] font-semibold'
                  : 'text-text-2 hover:text-text hover:border-b-2 hover:border-border -mb-[1px]'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && <span>{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
};
