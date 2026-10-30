import { create } from 'zustand';

interface DemoState {
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  toggleDemoMode: () => void;
}

const STORAGE_KEY = 'routex_demo_mode';

export const isDemoConfigured = (): boolean => {
  if (typeof import.meta === 'undefined' || !import.meta.env) return false;
  const envVal = String(import.meta.env.VITE_DEMO_MODE || '').trim().toLowerCase();
  return envVal === 'true';
};

const getInitialDemoMode = (): boolean => {
  // If production environment explicitly set to false or anything other than true, strictly disable demo mode
  if (!isDemoConfigured()) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
    return false;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // Fallback if localStorage access is blocked
    }
  }

  return true;
};

export const useDemoStore = create<DemoState>((set) => ({
  demoMode: getInitialDemoMode(),
  setDemoMode: (enabled: boolean) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(enabled));
      } catch {
        // Ignore
      }
    }
    set({ demoMode: enabled });
  },
  toggleDemoMode: () => {
    set((state) => {
      const next = !state.demoMode;
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(STORAGE_KEY, String(next));
        } catch {
          // Ignore
        }
      }
      return { demoMode: next };
    });
  },
}));
