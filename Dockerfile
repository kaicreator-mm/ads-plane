FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json tsconfig.base.json vitest.config.ts ./
COPY apps ./apps
COPY packages ./packages
RUN npm install
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/packages ./packages
RUN find packages -type d -name src -prune -exec rm -rf '{}' + || true
RUN mkdir -p /app/.data
EXPOSE 4310
CMD ["node", "apps/server/dist/index.js"]
