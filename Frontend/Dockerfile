# Build Angular
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Inject GROQ_API_KEY only at build time via BuildKit secret (not persisted in image layers).
RUN --mount=type=secret,id=groq_api_key \
    export GROQ_API_KEY="$(cat /run/secrets/groq_api_key 2>/dev/null || true)" && \
    npm run build -- --configuration docker

# Serve with Nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend /usr/share/nginx/html
EXPOSE 80
