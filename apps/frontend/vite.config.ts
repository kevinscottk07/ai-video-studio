import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/stores': path.resolve(__dirname, './src/stores'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@ai-video-studio/types': path.resolve(__dirname, '../../packages/types/src'),
      '@ai-video-studio/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@ai-video-studio/config': path.resolve(__dirname, '../../packages/config/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: true,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          
          // Routing
          'router': ['react-router-dom'],
          
          // UI libraries
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-select',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-progress',
            'framer-motion'
          ],
          
          // Authentication
          'auth': ['@auth0/auth0-react'],
          
          // API and data fetching
          'api': ['axios', '@tanstack/react-query', 'socket.io-client'],
          
          // Forms and validation
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          
          // Internationalization
          'i18n': ['react-i18next', 'i18next', 'i18next-browser-languagedetector'],
          
          // Charts and visualization
          'charts': ['recharts'],
          
          // Media and file handling
          'media': ['react-dropzone', 'react-player'],
          
          // Utilities
          'utils': ['clsx', 'tailwind-merge', 'date-fns', 'lucide-react'],
          
          // Performance monitoring
          'monitoring': ['web-vitals'],
        },
        // Optimize chunk names for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.[^.]*$/, '')
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Increase chunk size warning limit for better optimization
    chunkSizeWarningLimit: 1000,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'framer-motion',
      'socket.io-client',
    ],
    exclude: ['web-vitals'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});