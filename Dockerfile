FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=10000 DATABASE_PATH=/var/data/urban.sqlite
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/db ./db
COPY --from=builder /app/package.json ./package.json
RUN mkdir -p /var/data && chown -R node:node /var/data /app/.next
COPY docker-entrypoint.sh /usr/local/bin/urban-entrypoint
RUN chmod +x /usr/local/bin/urban-entrypoint
ENTRYPOINT ["/usr/local/bin/urban-entrypoint"]
EXPOSE 10000
CMD ["npm", "start"]
