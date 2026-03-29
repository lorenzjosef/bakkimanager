FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock tsconfig.base.json ./
COPY apps/admin-web/package.json apps/admin-web/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/map/package.json packages/map/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN yarn install --frozen-lockfile

COPY apps/admin-web apps/admin-web
COPY packages/domain packages/domain
COPY packages/map packages/map
COPY packages/ui packages/ui

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN yarn workspace @bakki/admin-web build

FROM nginx:1.27-alpine

COPY apps/admin-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin-web/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
