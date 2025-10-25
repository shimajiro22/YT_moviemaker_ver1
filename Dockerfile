# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# 依存関係
COPY package*.json ./
# GitHub上でpackage-lock.jsonが古い場合があるので npm install を使う
RUN npm install

# ソース一式
COPY . .
# フロント（Viteなど）をビルド
RUN npm run build

# ---- run stage ----
FROM node:20-alpine
WORKDIR /app

# ビルド済みの成果物をコピー
COPY --from=builder /app /app

# 本番設定
ENV NODE_ENV=production
EXPOSE 8080

# サーバ起動
CMD ["node", "server.js"]
