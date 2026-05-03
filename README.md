# GeoOnline demo

A compact full stack EdTech prototype for UNT style prep with a geography focus: multi page frontend, REST API, MongoDB, student dashboard, and admin UI.

## Stack

- **Frontend:** HTML, CSS, JavaScript in `script.js`. Optional **React + Vite** widget in `react-widget/` (build outputs to `assets/geo-react.js`).
- **Backend:** Node.js, Express, Mongoose, JWT, bcrypt.
- **Tests:** run `npm test` inside `server/` for API utility unit tests.

## Run the API and site

1. Install [MongoDB](https://www.mongodb.com/) locally or use a cloud URI.
2. In `server/`, copy `server/.env.example` to `server/.env` and set `MONGODB_URI`, `JWT_SECRET`, and if needed `PORT` and `CORS_ORIGIN`.
3. Commands:

```bash
cd server
npm install
npm start
```

The server serves the project static files and the API. Open the printed port in your browser (default `http://localhost:3000/`).

## Extras

- Admin UI: `/admin.html` (admin role required in the database).
- Seeds: `npm run seed:admin` and `npm run seed:promos` from `server/`.
- Test report: `npm run test:report` writes `server/reports/TEST_REPORT.md`.

## Repo

Public mirror: [Geonline-Demo-Front](https://github.com/kozqarashigi/Geonline-Demo-Front). The real `.env` file is not committed.
