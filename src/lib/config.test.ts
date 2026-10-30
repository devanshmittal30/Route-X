import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateEnv } from './config';

describe('Configuration & Environment Variables', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('validates a correct set of environment variables', () => {
    const validConfig = {
      VITE_SUPABASE_URL: 'https://xyzcompany.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key-12345',
      VITE_ORS_API_KEY: 'ors-test-key-abcde',
      VITE_DEMO_MODE: 'true',
    };

    const parsed = validateEnv(validConfig);
    expect(parsed.VITE_SUPABASE_URL).toBe('https://xyzcompany.supabase.co');
    expect(parsed.VITE_SUPABASE_ANON_KEY).toBe('test-anon-key-12345');
    expect(parsed.VITE_ORS_API_KEY).toBe('ors-test-key-abcde');
    expect(parsed.VITE_DEMO_MODE).toBe(true);
  });

  it('transforms VITE_DEMO_MODE=false to boolean false', () => {
    const validConfig = {
      VITE_SUPABASE_URL: 'https://xyzcompany.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key-12345',
      VITE_ORS_API_KEY: 'ors-test-key-abcde',
      VITE_DEMO_MODE: 'false',
    };

    const parsed = validateEnv(validConfig);
    expect(parsed.VITE_DEMO_MODE).toBe(false);
  });

  it('throws a detailed error when required variables are missing', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => validateEnv({})).toThrow(/RouteX Configuration Error/);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('throws an error when VITE_SUPABASE_URL is not a valid URL', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      validateEnv({
        VITE_SUPABASE_URL: 'not-a-valid-url',
        VITE_SUPABASE_ANON_KEY: 'key',
        VITE_ORS_API_KEY: 'key',
        VITE_DEMO_MODE: 'true',
      })
    ).toThrow(/must be a valid URL/);
  });
});

