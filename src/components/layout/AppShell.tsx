import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileTabBar } from './MobileTabBar';
import { MessageSquare, LifeBuoy, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SafetyChatDrawer } from '../chat/SafetyChatDrawer';
import { getPendingQueueCount } from '../../features/offline/queueService';
import { Toast, type ToastType } from '../ui/Toast';
import type { RouteXAlert } from '../../features/alerts/types';

interface ActiveToast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

export interface AppShellProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ children, hideFooter = false }) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queueCount, setQueueCount] = useState(0);
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  const addToast = (toast: ActiveToast) => {
    setToasts((prev) => [...prev.filter((t) => t.id !== toast.id), toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 6000);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const updateQueue = async () => {
      const count = await getPendingQueueCount();
      setQueueCount(count);
    };

    const handleAlert = (e: Event) => {
      const alert = (e as CustomEvent<RouteXAlert>).detail;
      if (!alert) return;
      const toastType: ToastType =
        alert.severity === 'critical' || alert.severity === 'severe'
          ? 'danger'
          : alert.severity === 'high'
          ? 'warning'
          : 'info';
      addToast({
        id: alert.id,
        type: toastType,
        title: alert.title,
        message: alert.description,
      });
    };

    const handleGenericToast = (e: Event) => {
      const t = (e as CustomEvent<ActiveToast>).detail;
      if (t) addToast(t);
    };

    updateQueue();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('routex-queue-updated', updateQueue);
    window.addEventListener('routex:alert', handleAlert);
    window.addEventListener('routex:toast', handleGenericToast);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('routex-queue-updated', updateQueue);
      window.removeEventListener('routex:alert', handleAlert);
      window.removeEventListener('routex:toast', handleGenericToast);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white text-text font-sans antialiased selection:bg-brand-soft selection:text-brand">
      {/* Top Header */}
      <Header />

      {/* Global Offline Status Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold border-b border-amber-700 shadow-xs animate-fadeIn">
          <div className="max-w-[1200px] w-full mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <WifiOff size={14} className="flex-shrink-0" />
              <span>
                Offline Mode: Using cached regional vector maps, saved route scores, and local emergency guide.
              </span>
            </div>
            {queueCount > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-black/25 px-2 py-0.5 rounded text-[11px] font-mono whitespace-nowrap self-start sm:self-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse" />
                {queueCount} actions queued for auto-sync
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col pb-16 lg:pb-0">{children}</main>

      {/* Global Safety Chat Drawer */}
      <SafetyChatDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />

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

      {/* In-App Toast Container */}
      {toasts.length > 0 && (
        <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-auto">
          {toasts.map((t) => (
            <Toast
              key={t.id}
              type={t.type}
              title={t.title}
              message={t.message}
              onClose={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
            />
          ))}
        </div>
      )}

      {/* Bottom Footer */}
      {!hideFooter && <Footer />}

      {/* Mobile Bottom Navigation */}
      <MobileTabBar />
    </div>
  );
};

