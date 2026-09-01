import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // 1. Safe resolution of Supabase Project URL
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || env.SUPABASE_URL || 'https://twpauvrjmaqdzrwteksd.supabase.co').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

  // 2. Safe resolution of PUBLIC / PUBLISHABLE key ONLY (NEVER secrets or service_role)
  const rawKey = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
  const supabaseKey = (rawKey.startsWith('sb_secret_') || rawKey.toLowerCase().includes('service_role') || rawKey.includes('postgres://')) ? '' : rawKey;

  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_'],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabaseKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react', '@supabase/supabase-js'],
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
