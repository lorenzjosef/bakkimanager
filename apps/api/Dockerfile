FROM node:22-bookworm-slim

WORKDIR /app

RUN corepack enable

ENV NODE_ENV=production

COPY package.json yarn.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/domain/package.json packages/domain/package.json

RUN yarn install --frozen-lockfile --production=true

COPY apps/api apps/api
COPY docs/seeds docs/seeds
COPY packages/domain packages/domain

EXPOSE 4175

CMD ["yarn", "workspace", "@bakki/api", "start"]
