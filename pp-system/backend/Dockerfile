# Plant Protection System — Laravel 12 API
FROM php:8.4-cli

RUN apt-get update && apt-get install -y \
    libpq-dev libzip-dev zip unzip git \
 && docker-php-ext-install pdo pdo_pgsql zip \
 && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY composer.json composer.lock ./
RUN COMPOSER_ALLOW_SUPERUSER=1 composer install --no-interaction --no-dev --no-scripts --prefer-dist
COPY . .
RUN COMPOSER_ALLOW_SUPERUSER=1 composer dump-autoload --optimize

EXPOSE 8000

# .env тайёрлаш, калит яратиш, миграция + сидер + сервер (демо/локал учун)
CMD ["sh", "-c", "[ -f .env ] || cp .env.example .env; php artisan key:generate --force; php artisan migrate --force; php artisan db:seed --force || true; php artisan serve --host=0.0.0.0 --port=8000"]
