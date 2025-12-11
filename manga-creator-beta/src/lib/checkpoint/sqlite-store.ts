import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { CheckpointStore, ProjectCheckpoint } from "./store";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "manga-creator.db");

function ensureDatabase(): Database.Database {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS checkpoints (
      projectId TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);
  return db;
}

let sqliteStore: CheckpointStore | null = null;

export function getSQLiteCheckpointStore(): CheckpointStore {
  if (sqliteStore) return sqliteStore;

  const db = ensureDatabase();

  sqliteStore = {
    async save(checkpoint: ProjectCheckpoint): Promise<string> {
      const now = new Date().toISOString();
      const existing = await sqliteStore!.load(checkpoint.projectId);
      const payload: ProjectCheckpoint = {
        ...checkpoint,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      const stmt = db.prepare(
        `INSERT INTO checkpoints (projectId, payload, updatedAt, createdAt)
         VALUES (@projectId, @payload, @updatedAt, @createdAt)
         ON CONFLICT(projectId) DO UPDATE SET payload=excluded.payload, updatedAt=excluded.updatedAt`
      );
      stmt.run({
        projectId: payload.projectId,
        payload: JSON.stringify(payload),
        updatedAt: payload.updatedAt,
        createdAt: payload.createdAt,
      });
      return payload.projectId;
    },

    async load(projectId: string): Promise<ProjectCheckpoint | null> {
      const row = db
        .prepare("SELECT payload FROM checkpoints WHERE projectId = ?")
        .get(projectId) as { payload: string } | undefined;
      return row ? (JSON.parse(row.payload) as ProjectCheckpoint) : null;
    },

    async list(): Promise<ProjectCheckpoint[]> {
      const rows = db
        .prepare("SELECT payload FROM checkpoints ORDER BY updatedAt DESC")
        .all() as Array<{ payload: string }>;
      return rows.map((r) => JSON.parse(r.payload) as ProjectCheckpoint);
    },

    async delete(projectId: string): Promise<void> {
      db.prepare("DELETE FROM checkpoints WHERE projectId = ?").run(projectId);
    },
  };

  return sqliteStore;
}
