# GeoOnline — демо платформы

Краткий full-stack прототип EdTech-сайта (ҰБТ / география): многостраничный фронт, REST API, MongoDB, личный кабинет и админка.

## Стек

- **Фронт:** HTML, CSS, JavaScript (`script.js`), опционально виджет **React + Vite** в `react-widget/` (сборка в `assets/geo-react.js`).
- **Бэкенд:** Node.js, Express, Mongoose, JWT, bcrypt.
- **Тесты API-утилит:** `npm test` в каталоге `server/`.

## Запуск API и сайта

1. Установить [MongoDB](https://www.mongodb.com/) локально или использовать облачный URI.
2. В каталоге `server/` скопировать `server/.env.example` → `server/.env` и заполнить `MONGODB_URI`, `JWT_SECRET`, при необходимости `PORT` и `CORS_ORIGIN`.
3. Команды:

```bash
cd server
npm install
npm start
```

Сервер отдаёт статику проекта и API: откройте в браузере указанный порт (по умолчанию `http://localhost:3000/`).

## Полезное

- Админка: `/admin.html` (нужна роль администратора в БД).
- Сиды: `npm run seed:admin`, `npm run seed:promos` (из `server/`).
- Отчёт по тестам: `npm run test:report` → `server/reports/TEST_REPORT.md`.

## Репозиторий

Публичная копия: [Geonline-Demo-Front](https://github.com/kozqarashigi/Geonline-Demo-Front). Файл `.env` в Git не коммитится.
