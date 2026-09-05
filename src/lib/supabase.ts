import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Universal environment variable accessor supporting Vite (import.meta.env)
 * and runtime fallbacks.
 */
function getEnv(key: string): string {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return String(import.meta.env[key]).trim();
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return String(process.env[key]).trim();
  }
  return '';
}

// 1. Official N-NEPEF Production Supabase Project URL
export const DEFAULT_SUPABASE_PROJECT_URL = 'https://twpauvrjmaqdzrwteksd.supabase.co';

/**
 * Validates that a string is a legitimate HTTP/HTTPS URL
 */
function isValidHttpUrl(stringToTest: string): boolean {
  if (!stringToTest || typeof stringToTest !== 'string') return false;
  if (!/^https?:\/\//i.test(stringToTest.trim())) return false;
  if (stringToTest.includes('your-project') || stringToTest.includes('placeholder')) return false;
  let cleanUrl = stringToTest.trim();
  if (cleanUrl.endsWith('/rest/v1') || cleanUrl.endsWith('/rest/v1/')) {
    cleanUrl = cleanUrl.replace(/\/rest\/v1\/?$/, '');
  }
  try {
    const parsed = new URL(cleanUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalizes Supabase URL to ensure it is the project root, not /rest/v1
 */
function normalizeSupabaseUrl(url: string): string {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

/**
 * Validates that a string is a legitimate Supabase publishable or anon key
 */
function isValidSupabaseKey(keyToTest: string): boolean {
  if (!keyToTest || typeof keyToTest !== 'string') return false;
  const trimmed = keyToTest.trim();
  if (trimmed === 'Saved' || trimmed.toLowerCase().includes('placeholder') || trimmed.length < 20) {
    return false;
  }
  return true;
}

/**
 * Universal environment variable accessor supporting Vite (import.meta.env)
 * for public client credentials.
 */
function resolveSupabaseUrl(): string {
  const envUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
  if (envUrl && typeof envUrl === 'string' && isValidHttpUrl(envUrl.trim())) {
    return normalizeSupabaseUrl(envUrl);
  }
  return DEFAULT_SUPABASE_PROJECT_URL;
}

/**
 * Resolve Supabase Public / Publishable Anon key across Vite client bundle.
 */
function resolveSupabaseKey(): string {
  const envKey = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnv('SUPABASE_KEY') || getEnv('SUPABASE_ANON_KEY');
  if (envKey && typeof envKey === 'string' && isValidSupabaseKey(envKey.trim())) {
    return envKey.trim();
  }
  return '';
}

export const SUPABASE_URL: string = resolveSupabaseUrl();
export const SUPABASE_PUBLISHABLE_KEY: string = resolveSupabaseKey();

/**
 * Checks whether Supabase is fully configured with live credentials
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
};

/**
 * Returns a diagnostic error message if configuration is missing or incomplete
 */
export const getSupabaseConfigError = (): string | null => {
  if (isSupabaseConfigured()) return null;
  const missing: string[] = [];
  if (!SUPABASE_URL) {
    missing.push('VITE_SUPABASE_URL');
  }
  if (!SUPABASE_PUBLISHABLE_KEY) {
    missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  }
  return `Supabase configuration incomplete: Missing ${missing.join(' and ')}. Please provide VITE_SUPABASE_PUBLISHABLE_KEY in your deployment environment variables.`;
};

// Storage Bucket Constants
export const SUPABASE_BUCKETS = {
  PASSPORTS: 'passports',
  RECEIPTS: 'receipts',
  DOCUMENTS: 'documents',
  CMS: 'cms_files',
  GALLERY: 'gallery_photos'
} as const;

// Create centralized singleton client
let clientInstance: SupabaseClient | null = null;

/**
 * Creates an unconfigured client proxy that gracefully reports errors on queries
 * instead of throwing fatal unhandled runtime exceptions.
 */
function createUnconfiguredClient(): SupabaseClient {
  const errorMessage = getSupabaseConfigError() || 'Supabase is not configured.';
  
  const errorResult = {
    data: null,
    error: { message: errorMessage, code: 'SUPABASE_NOT_CONFIGURED' },
    count: 0,
    status: 500,
    statusText: 'Unconfigured'
  };

  const chainHandler: any = {
    get(_target: any, prop: string) {
      if (prop === 'then') {
        return (resolve: any) => resolve(errorResult);
      }
      return () => new Proxy({}, chainHandler);
    }
  };

  const unconfiguredProxy: any = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: { message: errorMessage } }),
      getUser: async () => ({ data: { user: null }, error: { message: errorMessage } }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: errorMessage } }),
      signUp: async () => ({ data: { user: null, session: null }, error: { message: errorMessage } }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      resetPasswordForEmail: async () => ({ data: null, error: { message: errorMessage } }),
      updateUser: async () => ({ data: { user: null }, error: { message: errorMessage } }),
    },
    from: () => new Proxy({}, chainHandler),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message: errorMessage } }),
        download: async () => ({ data: null, error: { message: errorMessage } }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        list: async () => ({ data: [], error: { message: errorMessage } }),
        remove: async () => ({ data: [], error: { message: errorMessage } }),
      }),
      listBuckets: async () => ({ data: [], error: { message: errorMessage } }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      subscribe: () => ({ unsubscribe: () => {} }),
    }),
    removeChannel: () => {},
  };

  return unconfiguredProxy as SupabaseClient;
}

export function getSupabaseClient(): SupabaseClient {
  if (!clientInstance) {
    if (isSupabaseConfigured()) {
      clientInstance = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } else {
      const configErr = getSupabaseConfigError();
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`[Supabase Configuration Notice] ${configErr}`);
      }
      clientInstance = createUnconfiguredClient();
    }
  }
  return clientInstance;
}

export const supabase: SupabaseClient = getSupabaseClient();

