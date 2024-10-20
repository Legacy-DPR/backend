# Проект: Backend на Express.js с Prisma ORM

## Описание

Этот проект представляет собой серверную часть приложения, разработанного с использованием Express.js и Prisma ORM. Express.js обеспечивает работу API для мониторинга электронной очереди, а Prisma используется для взаимодействия с базой данных.

## Установка

1. Склонируйте репозиторий:

    ```bash
    git clone https://github.com/Legacy-DPR/backend.git
    ```

2. Перейдите в директорию проекта:

    ```bash
    cd backend
    ```

3. Установите зависимости:

    ```bash
    npm install
    ```

4. Сконфигурируйте файл `.env`:
Создайте файл `.env` на основе файла `.env.example` и укажите в нём параметры для подключения к базе данных.

Пример содержимого `.env` файла:
```env
NODE_ENV="development"
PORT="8080"            
HOST="localhost"       
CORS_ORIGIN="http://localhost:*" 
DATABASE_URL="postgresql://backend:backend_password@localhost:5432/postdonbass_db"
```

## Запуск проекта
### С помощью Docker:
```bash
docker compose build
docker compose up
```
### Вручную:
1. Выполните генерацию клиента Prisma, миграции и сидирование базы данных:
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```
2. Запустите в режиме dev
```bash
npm run dev
```

