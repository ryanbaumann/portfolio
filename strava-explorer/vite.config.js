import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // BASE_PATH lets the gateway container mount this app at /strava-explorer/
    // while local `npm run build`/`npm run preview` still default to '/'.
    base: process.env.BASE_PATH || '/',
    build: {
      // Output directory is 'dist' by default, which is fine
      // outDir: 'dist',
    },
    plugins: [
      tailwindcss(),
      {
        name: 'vite-plugin-strava-broker',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            // parse with URL using req.url and headers.host
            const host = req.headers.host || 'localhost';
            const url = new URL(req.url, `http://${host}`);
            
            // Check if it's one of our API endpoints
            if (url.pathname === '/api/strava/token' ||
                url.pathname === '/api/strava/refresh' ||
                url.pathname === '/api/strava/deauthorize' ||
                url.pathname === '/api/photo-proxy') {
              
              try {
                // Dynamically import the broker.js file to avoid start-up crashes if not present yet
                const broker = await import('./server/broker.js');
                
                const exchangeFn = broker.handleExchangeCode || broker.exchangeCode;
                const refreshFn = broker.handleRefreshToken || broker.refreshToken;
                const deauthFn = broker.handleDeauthorize || broker.deauthorize;
                const proxyFn = broker.handlePhotoProxy || broker.handlePhotoProxy || broker.proxyPhoto;

                const clientId = env.STRAVA_CLIENT_ID || env.VITE_STRAVA_CLIENT_ID;
                const clientSecret = env.STRAVA_CLIENT_SECRET || env.VITE_STRAVA_CLIENT_SECRET;
                const tokenUrl = 'https://www.strava.com/oauth/token';
                const deauthorizeUrl = 'https://www.strava.com/oauth/deauthorize';

                // CORS headers
                const origin = req.headers.origin || '*';
                res.setHeader('Access-Control-Allow-Origin', origin);
                res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
                res.setHeader('Vary', 'Origin');

                if (req.method === 'OPTIONS') {
                  res.statusCode = 204;
                  res.end();
                  return;
                }

                if (req.method === 'GET' && url.pathname === '/api/photo-proxy') {
                  const photoUrl = url.searchParams.get('url');
                  const maxPhotoBytes = Number(env.MAX_PHOTO_PROXY_BYTES || 8 * 1024 * 1024);
                  
                  const result = await proxyFn(photoUrl, {
                    fetch,
                    maxPhotoBytes
                  });
                  
                  res.setHeader('Content-Type', result.contentType);
                  res.setHeader('Content-Length', result.body.byteLength);
                  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
                  res.setHeader('X-Content-Type-Options', 'nosniff');
                  res.setHeader('Content-Security-Policy', 'sandbox');
                  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                  
                  res.end(Buffer.from(result.body));
                  return;
                }

                if (req.method === 'POST') {
                  // Read JSON body
                  let bodyStr = '';
                  for await (const chunk of req) {
                    bodyStr += chunk;
                  }
                  const body = bodyStr ? JSON.parse(bodyStr) : {};

                  let data;
                  if (url.pathname === '/api/strava/token') {
                    data = await exchangeFn(body, { clientId, clientSecret, fetch, tokenUrl });
                  } else if (url.pathname === '/api/strava/refresh') {
                    data = await refreshFn(body, { clientId, clientSecret, fetch, tokenUrl });
                  } else if (url.pathname === '/api/strava/deauthorize') {
                    const authHeader = req.headers.authorization || '';
                    data = await deauthFn(body, authHeader, { fetch, deauthorizeUrl });
                  }

                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                  res.setHeader('Cache-Control', 'no-store');
                  res.end(JSON.stringify(data));
                  return;
                }

                res.statusCode = 405;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Method not allowed' }));

              } catch (err) {
                console.error('Broker middleware error:', err);
                res.statusCode = err.statusCode || 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
              }
            } else {
              next();
            }
          });
        }
      }
    ],
  };
});