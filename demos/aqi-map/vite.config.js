import { defineConfig } from 'vite';

// BASE_PATH lets the gateway container mount this app at /aqi-map/
// while local `npm run build` still defaults to '/'.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
});
