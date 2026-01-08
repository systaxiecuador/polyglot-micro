# api-gateway/Dockerfile

# Build Stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist

# IMPORTANTE: Copiamos la carpeta protos al contenedor para que NestJS pueda leer el archivo .proto
# Como el Dockerfile está dentro de api-gateway/, 'protos' está un nivel arriba.
# Pero el contexto de Docker (en docker-compose) es la raíz, así que esto se maneja con cuidado.
# Ver nota abajo.

CMD ["node", "dist/main"]