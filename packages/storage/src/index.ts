import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { ProjectSummary, VersionSnapshot } from '@ads-plane/contracts';

export interface RepositoryConfig {
  repository: string;
  versionHint?: string;
}

export class SnapshotStore {
  private readonly db: DatabaseSync;

  constructor(path = ':memory:') {
    if (path !== ':memory:') mkdirSync(dirname(path), {recursive: true});
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS repositories (
        repository TEXT PRIMARY KEY,
        version_hint TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS snapshots (
        repository TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        FOREIGN KEY(repository) REFERENCES repositories(repository)
      );
    `);
  }

  register(config: RepositoryConfig): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO repositories(repository, version_hint, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(repository) DO UPDATE SET version_hint=excluded.version_hint, updated_at=excluded.updated_at
    `).run(config.repository, config.versionHint ?? null, now);
  }

  listConfigs(): RepositoryConfig[] {
    const rows = this.db.prepare('SELECT repository, version_hint FROM repositories ORDER BY repository').all() as Array<{repository: string; version_hint: string | null}>;
    return rows.map((row) => ({repository: row.repository, ...(row.version_hint ? {versionHint: row.version_hint} : {})}));
  }

  save(snapshot: VersionSnapshot): void {
    this.register({repository: snapshot.repository, versionHint: snapshot.version});
    this.db.prepare(`
      INSERT INTO snapshots(repository, version, generated_at, payload_json)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(repository) DO UPDATE SET version=excluded.version, generated_at=excluded.generated_at, payload_json=excluded.payload_json
    `).run(snapshot.repository, snapshot.version, snapshot.generatedAt, JSON.stringify(snapshot));
  }

  get(repository: string): VersionSnapshot | undefined {
    const row = this.db.prepare('SELECT payload_json FROM snapshots WHERE repository = ?').get(repository) as {payload_json: string} | undefined;
    return row ? JSON.parse(row.payload_json) as VersionSnapshot : undefined;
  }

  listSummaries(): ProjectSummary[] {
    const rows = this.db.prepare('SELECT payload_json FROM snapshots ORDER BY repository').all() as Array<{payload_json: string}>;
    return rows.map(({payload_json}) => {
      const snapshot = JSON.parse(payload_json) as VersionSnapshot;
      return {
        repository: snapshot.repository,
        version: snapshot.version,
        generatedAt: snapshot.generatedAt,
        total: snapshot.progress.total,
        done: snapshot.progress.done,
        running: snapshot.progress.running,
        blocked: snapshot.progress.blocked,
        candidateState: snapshot.candidateState,
        releaseState: snapshot.releaseState
      };
    });
  }

  close(): void { this.db.close(); }
}
