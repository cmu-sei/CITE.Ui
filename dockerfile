FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build --configuration production

### Stage 2: Setup ###

FROM nginxinc/nginx-unprivileged:stable-alpine

USER root
RUN rm -rf /usr/share/nginx/html/*
COPY default.conf /etc/nginx/conf.d/default.conf
COPY nginx-basehref.sh /docker-entrypoint.d/90-basehref.sh
COPY --from=builder /ng-app/dist /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html && \
  chmod +x /docker-entrypoint.d/90-basehref.sh
USER nginx

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
