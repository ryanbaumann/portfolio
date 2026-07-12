# syntax=docker/dockerfile:1
#
# Multi-stage build for the trails.ninja single-container portfolio.
# One builder stage per app (each gets its own npm install + npm run build,
# including whatever devDependencies its build needs), then a slim runtime
# stage that only contains the zero-dependency gateway and each app's
# static output.
#
# scripts/build-local.mjs performs the equivalent arrangement without Docker
# (useful in environments where Docker isn't available, and used by CI) —
# keep the two in sync if app build commands change.

FROM node:20-slim AS strava-explorer-builder
ARG VITE_GMP_API_KEY
ARG VITE_STRAVA_CLIENT_ID
ENV VITE_GMP_API_KEY=$VITE_GMP_API_KEY
ENV VITE_STRAVA_CLIENT_ID=$VITE_STRAVA_CLIENT_ID
WORKDIR /src/strava-explorer
COPY strava-explorer/package.json strava-explorer/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY strava-explorer/ ./
ENV BASE_PATH=/strava-explorer/
RUN npm run build

FROM node:20-slim AS aqi-map-builder
ARG VITE_GMP_API_KEY
ENV VITE_GMP_API_KEY=$VITE_GMP_API_KEY
WORKDIR /src/aqi-map
COPY aqi-map/package.json aqi-map/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY aqi-map/ ./
ENV BASE_PATH=/aqi-map/
RUN npm run build

# The portfolio's build is dependency-free (node build.mjs), so no npm ci.
# It is mounted at the site root ("/") and reads ../apps.json to render the
# demos section + nav, so the manifest is copied in alongside it.
FROM node:20-slim AS portfolio-builder
WORKDIR /src/portfolio
COPY portfolio/ ./
COPY apps.json /src/apps.json
ENV BASE_PATH=/
RUN node build.mjs

FROM node:20-slim AS isochrones-builder
ARG VITE_GMP_API_KEY
ENV VITE_GMP_API_KEY=$VITE_GMP_API_KEY
WORKDIR /src/isochrones
COPY isochrones/package.json isochrones/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY isochrones/ ./
ENV BASE_PATH=/isochrones/
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app

COPY --chown=node:node gateway/ ./gateway/
COPY --chown=node:node apps.json ./apps.json
COPY --chown=node:node --from=strava-explorer-builder /src/strava-explorer/dist ./apps/strava-explorer
COPY --chown=node:node --from=aqi-map-builder /src/aqi-map/dist ./apps/aqi-map
COPY --chown=node:node --from=isochrones-builder /src/isochrones/dist ./apps/isochrones
COPY --chown=node:node --from=portfolio-builder /src/portfolio/dist ./apps/portfolio

ENV NODE_ENV=production
ENV APPS_ROOT=/app/apps
EXPOSE 8080

# node:20-slim ships a non-root "node" user (uid 1000) out of the box.
# Cloud Run does its own container health/readiness probing, so no
# HEALTHCHECK instruction is needed here.
USER node

CMD ["node", "gateway/server.js"]
