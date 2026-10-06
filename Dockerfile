# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=2048

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build -- --configuration production

# Angular 17+ output: dist/<name>/browser. Older: dist/<name>
RUN mkdir /out && \
    (cp -r dist/*/browser/. /out/ 2>/dev/null || cp -r dist/*/. /out/)

# ---- Serve stage ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /out /usr/share/nginx/html
EXPOSE 80
