# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/playwright:v1.64.1-noble

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .

RUN test -f demo-site/index.html \
  && test -f demo-site/index.repaired.html \
  && npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "exec npm run start -- -H 0.0.0.0 -p ${PORT:-3000}"]
