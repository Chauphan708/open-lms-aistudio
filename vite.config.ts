import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load các biến môi trường (bao gồm API_KEY từ file .env hoặc Vercel Settings)
  // Tham số thứ 3 là '' để load tất cả các biến, không chỉ biến bắt đầu bằng VITE_
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Thay thế process.env.API_KEY trong code bằng giá trị thực khi build
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY)
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  };
});