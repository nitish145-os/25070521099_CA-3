import http from 'node:http';
import { URL } from 'node:url';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();
const PORT = Number(process.env.PORT || 3000);
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'game_library';
const STATUSES = ['Want to Play', 'Playing', 'Completed', 'On Hold', 'Dropped'];
const GENRES = ['Action', 'Adventure', 'RPG', 'FPS', 'Horror', 'Simulation', 'Strategy', 'Racing', 'Sports', 'Puzzle', 'Other'];
const PLATFORMS = ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile', 'Other'];
let client;
let games;

function send(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(Object.assign(new Error('Request body is too large.'), { status: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(Object.assign(new Error('Request body must contain valid JSON.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}
function validateGame(input) {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) throw Object.assign(new Error('Game title is required.'), { status: 400 });
  if (title.length > 120) throw Object.assign(new Error('Title must be 120 characters or fewer.'), { status: 400 });
  const genre = GENRES.includes(input.genre) ? input.genre : 'Other';
  const platform = PLATFORMS.includes(input.platform) ? input.platform : 'PC';
  const status = STATUSES.includes(input.status) ? input.status : 'Want to Play';
  let rating = input.rating === '' || input.rating == null ? null : Number(input.rating);
  if (rating !== null && (!Number.isFinite(rating) || rating < 1 || rating > 10)) {
    throw Object.assign(new Error('Rating must be between 1 and 10.'), { status: 400 });
  }
  let releaseYear = input.releaseYear === '' || input.releaseYear == null ? null : Number(input.releaseYear);
  if (releaseYear !== null && (!Number.isInteger(releaseYear) || releaseYear < 1950 || releaseYear > 2100)) {
    throw Object.assign(new Error('Enter a valid release year between 1950 and 2100.'), { status: 400 });
  }
  const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const coverUrl = text(input.coverUrl, 2048);
  if (coverUrl && !/^https?:\/\//i.test(coverUrl)) throw Object.assign(new Error('Cover image URL must start with http:// or https://.'), { status: 400 });
  return {
    title, genre, platform, status, rating, releaseYear,
    description: text(input.description, 2000),
    notes: text(input.notes, 4000),
    coverUrl
  };
}
function parseId(value) {
  if (!ObjectId.isValid(value) || String(new ObjectId(value)) !== value) {
    throw Object.assign(new Error('Invalid game ID.'), { status: 400 });
  }
  return new ObjectId(value);
}
async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  try {
    if (pathname === '/api/health' && req.method === 'GET') {
      await client.db(DB_NAME).command({ ping: 1 });
      return send(res, 200, { ok: true, database: 'connected' });
    }
    if (pathname === '/api/games' && req.method === 'GET') {
      const filter = {};
      const search = (url.searchParams.get('search') || '').trim();
      const status = url.searchParams.get('status');
      if (search) filter.title = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      if (STATUSES.includes(status)) filter.status = status;
      const result = await games.find(filter).sort({ createdAt: -1 }).toArray();
      return send(res, 200, result);
    }
    if (pathname === '/api/stats' && req.method === 'GET') {
      const [total, playing, completed] = await Promise.all([
        games.countDocuments(), games.countDocuments({ status: 'Playing' }), games.countDocuments({ status: 'Completed' })
      ]);
      return send(res, 200, { total, playing, completed });
    }
    const match = pathname.match(/^\/api\/games\/([^/]+)$/);
    if (match) {
      const id = parseId(match[1]);
      if (req.method === 'GET') {
        const game = await games.findOne({ _id: id });
        return game ? send(res, 200, game) : send(res, 404, { error: 'Game not found.' });
      }
      if (req.method === 'PUT') {
        const body = await readBody(req);
        const game = validateGame(body);
        game.updatedAt = new Date();
        const result = await games.findOneAndUpdate({ _id: id }, { $set: game }, { returnDocument: 'after' });
        const updated = result?.value ?? result;
        return updated ? send(res, 200, updated) : send(res, 404, { error: 'Game not found.' });
      }
      if (req.method === 'DELETE') {
        const result = await games.deleteOne({ _id: id });
        return result.deletedCount ? send(res, 200, { success: true }) : send(res, 404, { error: 'Game not found.' });
      }
    }
    if (pathname === '/api/games' && req.method === 'POST') {
      const body = await readBody(req);
      const game = validateGame(body);
      const now = new Date();
      const document = { ...game, createdAt: now, updatedAt: now };
      const result = await games.insertOne(document);
      return send(res, 201, { ...document, _id: result.insertedId });
    }
    return send(res, 404, { error: 'Route not found.' });
  } catch (error) {
    const status = error.status || 500;
    if (status === 500) console.error(error);
    return send(res, status, { error: status === 500 ? 'Server error. Check the server terminal and database connection.' : error.message });
  }
}

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI. Copy server/.env.example to server/.env and configure MongoDB Atlas.');
  process.exit(1);
}
client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  await client.db(DB_NAME).command({ ping: 1 });
  games = client.db(DB_NAME).collection('games');
  await games.createIndex({ title: 1 });
  const server = http.createServer(handler);
  server.listen(PORT, () => console.log(`GameVault API running at http://localhost:${PORT}`));
} catch (error) {
  console.error('Could not connect to MongoDB Atlas. Check server/.env and Atlas network access.');
  console.error(error.message);
  process.exit(1);
}
process.on('SIGINT', async () => { await client?.close(); process.exit(0); });
