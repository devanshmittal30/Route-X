import { z } from 'zod';

export const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .min(1, 'VITE_SUPABASE_URL is required')
    .url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'VITE_SUPABASE_ANON_KEY is required'),
  VITE_ORS_API_KEY: z
    .string()
    .min(1, 'VITE_ORS_API_KEY is required'),
  VITE_DEMO_MODE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true'),
  VITE_MAP_API_KEY: z.string().optional(),
  VITE_MAP_TILES_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(rawEnv: Record<string, unknown> = import.meta.env): Env {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'variable'}: ${issue.message}`)
      .join('\n');

    const devErrorMessage =
      `\n========================================================\n` +
      `[RouteX Configuration Error]\n` +
      `Missing or invalid required environment variable(s):\n\n` +
      `${errorDetails}\n\n` +
      `Please create or update your .env.local file based on .env.example.\n` +
      `Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ORS_API_KEY, VITE_DEMO_MODE.\n` +
      `========================================================\n`;

    console.error(devErrorMessage);
    throw new Error(devErrorMessage);
  }
  return result.data;
}

let cachedEnv: Env | null = null;

export const getEnv = (customEnv?: Record<string, unknown>): Env => {
  if (customEnv) {
    return validateEnv(customEnv);
  }
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
};

export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string | symbol) {
    return getEnv()[prop as keyof Env];
  },
});

