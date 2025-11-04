# knk-backend

Minimal Express API backend for KnK.

## Requirements
- Node.js 18+
- npm 9+

## Setup
```bash
cd backend
npm install
```

## Development
```bash
npm run dev
```
- Starts on `http://localhost:4000` by default.
- Set `PORT` in your environment to override.

## Production
```bash
npm start
```

## Endpoints
- `GET /health` → returns `{ status: 'ok', timestamp: ... }`
- `GET /` → service info

## Environment
- `PORT` (optional): server port. Defaults to `4000`.

## Notes
- `dotenv` loads variables from a `.env` file if present (create one at project root).
- Example:
  ```
  PORT=5000
  ```


