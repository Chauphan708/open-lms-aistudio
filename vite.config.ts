import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load các biến môi trường
  // Fix: Cast process to any to avoid TS error regarding missing cwd property in some environments
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Inject API_KEY và Supabase keys vào process.env để code client có thể đọc được
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  };
});