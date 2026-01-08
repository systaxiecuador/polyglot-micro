FROM php:8.2-cli-alpine

WORKDIR /app

# 1. Instalamos dependencias del sistema necesarias (git y unzip para Composer, bcmath para cálculos)
RUN apk add --no-cache git unzip linux-headers \
    && docker-php-ext-install sockets bcmath

# 2. Instalamos Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# 3. Copiamos solo el composer.json primero para aprovechar la caché de Docker
COPY composer.json .

# 4. Instalamos las librerías
RUN composer install --no-dev --optimize-autoloader

# 5. Copiamos el resto del código
COPY . .

# 6. Ejecutamos el worker
CMD ["php", "index.php"]