# GameVault

A dark, responsive personal game-library app built with React + Vite, a native Node.js HTTP API, and MongoDB Atlas. No Express and no mock/localStorage persistence.

## Requirements

- Node.js 20 or newer (npm is included)
- A MongoDB Atlas account and database user

## 1. Configure MongoDB Atlas

1. Sign in at [MongoDB Atlas](https://www.mongodb.com/atlas/database) and create a free cluster if you do not already have one.
2. In **Database Access**, create a database user and save its username and password. This is separate from your Atlas website login.
3. In **Network Access**, add your current public IP address. For a short local test only, Atlas supports `0.0.0.0/0`, which allows connections from any IP; avoid this broad rule when possible and remove it when no longer needed.
4. Open your cluster's **Connect** menu, choose **Drivers**, select Node.js, and copy the connection string.
5. Copy `server/.env.example` to `server/.env` and replace the placeholders:

   ```env
   MONGODB_URI=mongodb+srv://YOUR_DB_USERNAME:YOUR_DB_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB_NAME=game_library
   PORT=3000
   ```

   Replace the username, password, and cluster host with the values from Atlas. URL-encode special characters in the database password (for example, `@` becomes `%40`). Do not put the URI in any frontend file or commit `server/.env`.

MongoDB creates the database and `games` collection automatically when the first game is saved.

## 2. Install dependencies

Run these commands from the project root:

```bash
npm install
npm install --prefix server
npm install --prefix client
```

The root package provides the optional command to run both processes together. You can skip root dependencies and just install the `server` and `client` packages if you prefer.

## 3. Start the app

Open two terminals in the project root.

Terminal 1 — API server:

```bash
npm run dev --prefix server
```

Terminal 2 — React frontend:

```bash
npm run dev --prefix client
```

Open <http://localhost:5173>. The API runs at <http://localhost:3000>.

After the server starts, check <http://localhost:3000/api/health>. A successful response looks like `{"ok":true,"database":"connected"}`.

## Features

- Add, view, edit, and delete games
- MongoDB-backed persistence across refreshes
- Search by title, filter by status, and sort by recent/oldest/title/rating
- Dashboard totals for all games, currently playing, and completed
- Optional rating, release year, description, notes, and cover image URL
- Validation, loading/empty/error states, deletion confirmation, and responsive UI

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check database connectivity |
| GET | `/api/games` | List games; accepts `search` and `status` query parameters |
| GET | `/api/games/:id` | Get one game |
| POST | `/api/games` | Create a game |
| PUT | `/api/games/:id` | Update a game |
| DELETE | `/api/games/:id` | Delete a game |
| GET | `/api/stats` | Get dashboard counts |

## Notes

- This initial version is intended for local, single-user use. It has no authentication or per-user data isolation; do not expose the API publicly as-is.
- CORS is configured for the Vite development origin `http://localhost:5173`.
- Cover images are loaded from URLs you provide. Some image hosts block hotlinking; use a publicly accessible HTTPS image URL.
