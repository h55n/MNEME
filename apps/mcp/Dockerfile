# MNEME remote MCP endpoint (Streamable HTTP at /mcp). Build context: repo root.
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/mcp ./apps/mcp
RUN npm ci --ignore-scripts --workspace=packages/shared --workspace=apps/mcp --include-workspace-root \
 && npm run build --workspace=packages/shared \
 && npm run build --workspace=apps/mcp

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/mcp/dist ./apps/mcp/dist
COPY --from=builder /app/apps/mcp/package.json ./apps/mcp/
USER node
EXPOSE 3002
CMD ["node", "apps/mcp/dist/http.js"]
