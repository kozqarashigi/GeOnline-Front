# Технологии проекта GeoOnline — где используются и зачем

Ниже перечислены **реально подключённые** в репозитории технологии (версии из `package.json`), **файл-доказательство** и **назначение**.

---

## 1. Клиент: разметка и стили

| Технология | Где видно | Зачем |
|------------|-----------|--------|
| **HTML5** | Все страницы (`index.html`, `dashboard.html`, …) | Семантическая структура, формы, навигация, MPA. |
| **CSS3** | `style.css` | Вёрстка, адаптив (`@media`), темы (`html[data-theme="dark"]`), оформление. |
| **Google Fonts (Inter)** | `index.html` — `<link href="https://fonts.googleapis.com/css2?family=Inter:...">` | Единая типографика. |

---

## 2. Клиент: логика без фреймворка

| Технология | Где видно | Зачем |
|------------|-----------|--------|
| **JavaScript (ES-модули не на фронте; один общий бандл)** | `script.js` подключается в HTML (см. `index.html`: `<script src="script.js" defer></script>`) | Навигация, i18n, тема, тест/тренажёр, формы, `localStorage`, вызовы API через **Fetch API** (стандарт браузера, отдельный пакет не нужен). |
| **Fetch API** | Вызовы `fetch(\`${base}/api/...\`)` внутри `script.js` | JSON REST с бэкендом при API-режиме. |

**Почему не React на всём сайте:** основной сайт — классическая **MPA** (много HTML-страниц + один `script.js`), проще поддерживать контент и SEO для лендингов.

---

## 3. Клиент: виджет React + сборка Vite

| Пакет | Версия (из `react-widget/package.json`) | Где видно | Зачем |
|-------|----------------------------------------|-----------|--------|
| **react** | ^19.0.0 | `react-widget/src/*.jsx` | Компонентный UI для небольшого блока на главной. |
| **react-dom** | ^19.0.0 | `react-widget/src/embed.jsx` | Монтирование виджета в DOM. |
| **vite** | ^6.0.3 | `react-widget/vite.config.js`, скрипт `npm run build` | Сборка IIFE-бандла в `assets/geo-react.js`. |
| **@vitejs/plugin-react** | ^4.3.4 | `vite.config.js` → `plugins: [react()]` | Поддержка JSX при сборке. |

**Доказательство подключения на сайте:** `index.html` — контейнер `<div id="geo-react-stats"></div>` и `<script src="assets/geo-react.js" defer></script>`.

**Почему так:** не переводить весь сайт в SPA, а добавить **изолированный** интерактивный блок.

---

## 4. Сервер: runtime и HTTP

| Пакет | Версия (`server/package.json`) | Где видно | Зачем |
|-------|----------------------------------|-----------|--------|
| **Node.js** | engines: `>=18` | Запуск `node src/index.js` | Среда выполнения сервера и скриптов. |
| **express** | ^4.21.0 | `server/src/index.js` — `import express from "express"`, `express.json()`, маршруты, `express.static` | REST API + раздача статики (корень сайта + `server/public`). |

---

## 5. Данные и модели

| Пакет | Версия | Где видно | Зачем |
|-------|--------|-----------|--------|
| **mongoose** | ^8.7.0 | `server/src/models/User.js`, `PromoCode.js`, `LoginLog.js`, `server/src/db.js` | Схемы, индексы, запросы к MongoDB. |
| **MongoDB** | (сервис, не npm) | `MONGODB_URI` в `.env`, `connectDb` в `server/src/db.js` | Хранение пользователей, промокодов, логов и т.д. |

---

## 6. Безопасность и аутентификация

| Пакет | Версия | Где видно | Зачем |
|-------|--------|-----------|--------|
| **jsonwebtoken** | ^9.0.2 | `server/src/routes/auth.js` — `jwt.sign`, `server/src/middleware/auth.js` — `jwt.verify` | Токены после логина, защита `/me`, `/api/admin`, … |
| **bcryptjs** | ^2.4.3 | `server/src/routes/auth.js` — `bcrypt.hash`, `bcrypt.compare`; `seedAdmin.js` | Хеширование паролей. |
| **express-rate-limit** | ^7.4.0 | `server/src/index.js` — лимитер на префикс `/api/auth` | Снижение риска перебора паролей/OTP. |
| **cors** | ^2.8.5 | `server/src/index.js` — `app.use(cors({ origin, credentials }))` | Допустимые источники для браузерных запросов к API. |

---

## 7. Конфигурация и почта

| Пакет | Версия | Где видно | Зачем |
|-------|--------|-----------|--------|
| **dotenv** | ^16.4.5 | `server/src/index.js` — `import "dotenv/config"` | Загрузка `PORT`, `MONGODB_URI`, `JWT_SECRET`, SMTP из `.env`. |
| **nodemailer** | ^6.10.1 | `server/src/lib/mailer.js` — `nodemailer.createTransport` | Отправка кодов/писем при настроенном SMTP. |

---

## 8. Тестирование (сервер)

| Инструмент | Где видно | Зачем |
|------------|-----------|--------|
| **Node.js встроенный test runner** | `node --test` в `server/scripts/run-tests.mjs` и `run-tests-with-report.mjs` | Юнит-тесты без Jest: `server/tests/*.test.js`. |

---

## Краткая сводка одной строкой

**Браузер:** HTML5 + CSS3 + нативный JS + Fetch; шрифт Inter; опционально **React 19** (виджет) через **Vite 6**.  
**Сервер:** **Node.js** + **Express** + **MongoDB/Mongoose** + **JWT** + **bcrypt** + **CORS** + **rate-limit** + **dotenv** + **Nodemailer**.  
**Тесты:** **`node --test`**.

Файлы-источники правды: `server/package.json`, `react-widget/package.json`, `server/src/index.js`, `index.html`, `script.js`, `server/src/routes/auth.js`, `server/src/middleware/auth.js`, `server/src/models/*.js`.
