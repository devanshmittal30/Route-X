import { create } from 'zustand';

interface DemoState {
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  toggleDemoMode: () => void;
}

const STORAGE_KEY = 'routex_demo_mode';

const getInitialDemoMode = (): boolean => {
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

  // Default from environment (defaulting to true for demo build per project requirements)
  return typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEMO_MODE !== undefined
    ? String(import.meta.env.VITE_DEMO_MODE).toLowerCase() !== 'false'
    : true;
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
