FROM node:20-slim
WORKDIR /app
COPY --chown=node:node package.json server.js broker.js ./
USER node
ENV NODE_ENV=production
CMD ["node", "server.js"]
