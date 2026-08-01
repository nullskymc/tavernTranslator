# 前端构建阶段
FROM node:22-alpine AS frontend-builder

WORKDIR /app/vue-frontend
COPY vue-frontend/package*.json ./
RUN npm ci
COPY vue-frontend/ ./
RUN npm run build

# API 运行阶段
FROM node:22-alpine AS api

WORKDIR /app/api
COPY api/package*.json ./
RUN npm ci
COPY api/ ./

RUN mkdir -p /app/.uploads /app/.outputs

ENV NODE_ENV=production
ENV API_PORT=3001
EXPOSE 3001

CMD ["npm", "run", "start"]

# Nginx 前端运行阶段
FROM nginx:1.27-alpine AS web

COPY --from=frontend-builder /app/vue-frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
