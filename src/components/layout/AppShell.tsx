import React, { useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileTabBar } from './MobileTabBar';
import { MessageSquare, LifeBuoy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Drawer } from '../ui/Drawer';
import { EmptyState } from '../ui/EmptyState';

export interface AppShellProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ children, hideFooter = false }) => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white text-text font-sans antialiased selection:bg-brand-soft selection:text-brand">
      {/* Top Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 flex flex-col pb-16 lg:pb-0">{children}</main>

      {/* Global Safety Chat Drawer */}
      <Drawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        title="RouteX Safety Assistant"
      >
        <div className="space-y-4">
          <div className="p-3 bg-surface rounded-btn border border-border text-small text-text-2">
            Safety-first assistant for mountain roads and treks in India.
          </div>
          <EmptyState
            icon={MessageSquare}
            title="Chat Assistant"
            description="AI assistant (Gemini online / rule-based offline) will be connected in Phase 6."
          />
        </div>
      </Drawer>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-20 lg:bottom-6 right-4 z-40 flex flex-col items-end gap-2.5">
        {/* Chat FAB */}
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          aria-label="Open RouteX Safety Assistant"
          className="flex items-center gap-2 px-3.5 py-2.5 bg-brand text-white rounded-btn shadow-card hover:bg-brand-hover active:scale-95 transition-all text-small font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="hidden sm:inline">Safety Assistant</span>
        </button>

        {/* Mobile SOS FAB */}
        <Link
          to="/sos"
          aria-label="Emergency SOS"
          className="lg:hidden flex items-center justify-center w-12 h-12 bg-sos text-white rounded-full shadow-lg hover:opacity-95 active:scale-95 transition-all"
        >
          <LifeBuoy className="w-6 h-6 animate-pulse" />
        </Link>
      </div>

      {/* Bottom Footer */}
      {!hideFooter && <Footer />}

      {/* Mobile Bottom Navigation */}
      <MobileTabBar />
    </div>
  );
};

