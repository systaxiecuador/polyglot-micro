# --- Stage 1: Builder ---
FROM golang:alpine AS builder

WORKDIR /app

RUN apk add --no-cache protobuf-dev

# Copiamos dependencias
COPY go.mod go.sum ./
RUN go mod download

# Copiamos el código fuente
COPY . .


RUN CGO_ENABLED=0 GOOS=linux go build -o inventory-srv ./cmd/server/main.go

# --- Stage 2: Runner (Imagen Final) ---
FROM alpine:latest

WORKDIR /root/

# Copiamos solo el binario desde el Stage 1
COPY --from=builder /app/inventory-srv .

# Exponemos el puerto
EXPOSE 50051

# Comando de ejecución
CMD ["./inventory-srv"]