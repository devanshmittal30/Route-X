import { create } from 'zustand';

interface DemoState {
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  toggleDemoMode: () => void;
}

// Default from environment (defaulting to true for demo build per project requirements)
const initialDemoMode =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEMO_MODE !== undefined
    ? String(import.meta.env.VITE_DEMO_MODE).toLowerCase() !== 'false'
    : true;

export const useDemoStore = create<DemoState>((set) => ({
  demoMode: initialDemoMode,
  setDemoMode: (enabled: boolean) => set({ demoMode: enabled }),
  toggleDemoMode: () => set((state) => ({ demoMode: !state.demoMode })),
}));
