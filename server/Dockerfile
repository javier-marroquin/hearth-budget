# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app/server

COPY server/package.json ./
RUN npm install

COPY server/ ./
COPY db /app/db

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npx", "tsx", "src/index.ts"]
