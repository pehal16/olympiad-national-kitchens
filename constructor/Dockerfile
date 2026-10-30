FROM node:24-bookworm-slim
ENV NODE_ENV=production PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 CONSTRUCTOR_HOST=0.0.0.0 CONSTRUCTOR_PORT=3210 CONSTRUCTOR_STORAGE=/data CONSTRUCTOR_ASSET_ROOT=/app/dist/client CONSTRUCTOR_CHROMIUM=/usr/bin/chromium CONSTRUCTOR_MODE=online
RUN apt-get update && apt-get install -y --no-install-recommends chromium ca-certificates tini && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force
COPY dist ./dist
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3210
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3210/api/constructor/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["node","dist/server.cjs"]
