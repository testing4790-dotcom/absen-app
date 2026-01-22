import { pool } from "./index.js";

async function main() {
  // users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // attendance
  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      check_out TIMESTAMPTZ,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Kolom tambahan attendance (GPS + foto check-in sudah ada di sistem kamu sebelumnya,
  // tapi migrate ini tetap aman karena pakai ADD COLUMN + duplicate_column handler)
  await pool.query(`
    DO $$ 
    BEGIN
      BEGIN
        ALTER TABLE attendance ADD COLUMN latitude DOUBLE PRECISION;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END;

      BEGIN
        ALTER TABLE attendance ADD COLUMN longitude DOUBLE PRECISION;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END;

      BEGIN
        ALTER TABLE attendance ADD COLUMN photo TEXT;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END;

      BEGIN
        ALTER TABLE attendance ADD COLUMN check_out_latitude DOUBLE PRECISION;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END;

      BEGIN
        ALTER TABLE attendance ADD COLUMN check_out_longitude DOUBLE PRECISION;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END;

      BEGIN
        ALTER TABLE attendance ADD COLUMN check_out_photo TEXT;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END;
    END $$;
  `);

  // pastikan 1 user hanya punya 1 sesi "open" (belum check-out)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS attendance_one_open_per_user_idx
    ON attendance(user_id)
    WHERE check_out IS NULL;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS attendance_user_id_check_in_idx
    ON attendance(user_id, check_in DESC);
  `);

  // leave / cuti
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL, -- cuti|izin|sakit|dinas|wfh
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected|cancelled
      admin_note TEXT,
      decided_by INTEGER REFERENCES users(id),
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS leave_user_status_idx
    ON leave_requests(user_id, status);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS leave_status_created_idx
    ON leave_requests(status, created_at DESC);
  `);

  console.log("Migration done.");
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch {}
  process.exit(1);
});
