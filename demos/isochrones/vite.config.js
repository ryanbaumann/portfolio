import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // BASE_PATH lets the gateway container mount this app at /isochrones/
  // while local `npm run build` still defaults to '/'.
  base: process.env.BASE_PATH || '/',
});
