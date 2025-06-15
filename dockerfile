# ---- Build Stage ----
FROM oven/bun:1.2.2 AS build
WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

# ---- Run Stage ----
FROM oven/bun:1.2.2 AS run

WORKDIR /app

COPY --from=build /app/public ./public
COPY --from=build /app/.next .next
COPY --from=build /app/package.json .
COPY --from=build /app/bun.lock .

RUN bun install --frozen-lockfile --production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# and
ENTRYPOINT ["bun", "next", "start"]