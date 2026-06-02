import { app } from './app'

const CREATE_JOBS = `CREATE TABLE IF NOT EXISTS jobs (
  id          TEXT PRIMARY KEY,
  poster_id   TEXT NOT NULL,
  poster_email TEXT NOT NULL,
  poster_name TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  location    TEXT NOT NULL,
  lat         REAL,
  lng         REAL,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TEXT NOT NULL
)`

const CREATE_BIDS = `CREATE TABLE IF NOT EXISTS bids (
  id           TEXT PRIMARY KEY,
  job_id       TEXT NOT NULL,
  bidder_id    TEXT NOT NULL,
  bidder_email TEXT NOT NULL,
  bidder_name  TEXT NOT NULL,
  amount       REAL NOT NULL,
  message      TEXT,
  created_at   TEXT NOT NULL
)`

const CREATE_JOB_PHOTOS = `CREATE TABLE IF NOT EXISTS job_photos (
  id      TEXT PRIMARY KEY,
  job_id  TEXT NOT NULL,
  path    TEXT NOT NULL
)`

export async function runMigrations() {
  await app.db.execute(CREATE_JOBS)
  await app.db.execute(CREATE_BIDS)
  await app.db.execute(CREATE_JOB_PHOTOS)
}
