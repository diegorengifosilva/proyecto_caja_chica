// boleta_project/frontend/vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Carga las variables del archivo .env.local
  const env = loadEnv(mode, process.cwd(), '');

  // Usa la variable VITE_API_URL o un valor por defecto
  const apiUrl = env.VITE_API_URL || 'http://localhost:8000/api';

  // Limpia la URL base para el proxy (quita "/api" si está presente)
  const proxyTarget = apiUrl.replace(/\/api\/?$/, '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: "0.0.0.0", // escucha en todas las interfaces de red
      port: 5173,
      strictPort: false,
      open: false,
      fs: {
        strict: false,
      },
      proxy: {
        '/api': {
          target: proxyTarget, // backend Django dinámico desde .env
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) return 'vendor';
          },
        },
      },
    },
    base: './',
  };
});
