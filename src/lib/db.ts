import { app } from './app'

// NEVER edit or delete existing migrations.
// Append new { name, sql } entries to add columns/tables.
const migrations = [
  {
    name: '0001_init',
    sql: `CREATE TABLE IF NOT EXISTS jobs (
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
)`,
  },
  {
    name: '0002_bids',
    sql: `CREATE TABLE IF NOT EXISTS bids (
  id           TEXT PRIMARY KEY,
  job_id       TEXT NOT NULL,
  bidder_id    TEXT NOT NULL,
  bidder_email TEXT NOT NULL,
  bidder_name  TEXT NOT NULL,
  amount       REAL NOT NULL,
  message      TEXT,
  created_at   TEXT NOT NULL
)`,
  },
  {
    name: '0003_job_photos',
    sql: `CREATE TABLE IF NOT EXISTS job_photos (
  id      TEXT PRIMARY KEY,
  job_id  TEXT NOT NULL,
  path    TEXT NOT NULL
)`,
  },
  {
    name: '0005_jobs_winner_bid_id',
    sql: 'ALTER TABLE jobs ADD COLUMN winner_bid_id TEXT',
  },
  {
    name: '0006_bids_accepted_flag',
    sql: 'ALTER TABLE bids ADD COLUMN accepted INTEGER DEFAULT 0',
  },
]

export async function runMigrations() {
  await app.db.migrate(migrations)
}
