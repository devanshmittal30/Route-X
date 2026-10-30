import { createClient } from '@supabase/supabase-js';

// Polyfill minimal WebSocket in Node.js test environments if native WebSocket is absent
if (typeof globalThis.WebSocket === 'undefined') {
  class MockWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;
    readyState = 0;
    onopen = null;
    onclose = null;
    onerror = null;
    onmessage = null;
    constructor() {}
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true;
    }
  }
  // @ts-expect-error Mock WebSocket for Node test runner
  globalThis.WebSocket = MockWebSocket;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    '[RouteX Supabase Client] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined in .env.local. ' +
      'Database and auth features will require valid credentials.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

