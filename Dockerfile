FROM oven/bun:latest AS builder

ENV BODY_SIZE_LIMIT=Infinity

WORKDIR /app

COPY . .

RUN bun i 
RUN bun run build

FROM oven/bun:alpine AS production

WORKDIR /usr/src/app

COPY --from=builder /app/build .

EXPOSE 3000

ENV NODE_ENV=production