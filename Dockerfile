# syntax=docker/dockerfile:1
# The manifest-driven builder makes every workspace lab part of the image
# without adding another hand-written Docker stage. Trusted deploys stage
# checksum-verified private artifacts in .labs-artifacts before this build.
FROM node:20-slim AS apps-builder
ARG VITE_GMP_API_KEY
ARG VITE_ISOCHRONES_GMP_API_KEY
ARG VITE_STRAVA_CLIENT_ID
ARG ANALYTICS_MEASUREMENT_ID
ARG ALLOW_MISSING_ARTIFACTS=0
ENV VITE_GMP_API_KEY=$VITE_GMP_API_KEY
ENV VITE_ISOCHRONES_GMP_API_KEY=$VITE_ISOCHRONES_GMP_API_KEY
ENV VITE_STRAVA_CLIENT_ID=$VITE_STRAVA_CLIENT_ID
ENV ANALYTICS_MEASUREMENT_ID=$ANALYTICS_MEASUREMENT_ID
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
WORKDIR /src
COPY . .
RUN if [ "$ALLOW_MISSING_ARTIFACTS" = "1" ]; then \
      node scripts/build-local.mjs --force-install --allow-missing-artifacts; \
    else \
      node scripts/build-local.mjs --force-install; \
    fi

FROM node:20-slim AS runtime
WORKDIR /app
COPY --chown=node:node gateway/ ./gateway/
COPY --chown=node:node apps.json ./apps.json
COPY --chown=node:node --from=apps-builder /src/apps ./apps
ENV NODE_ENV=production
ENV APPS_ROOT=/app/apps
EXPOSE 8080
USER node
CMD ["node", "gateway/server.js"]
