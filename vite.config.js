import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    open: false
  },
  preview: {
    port: 3000,
    host: true
  }
});
