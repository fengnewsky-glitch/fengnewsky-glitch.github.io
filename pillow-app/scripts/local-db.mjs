import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
export async function localDatabase(directory) {
  const pg = new PGlite(directory);
  await pg.waitReady;
  await pg.exec('CREATE TABLE IF NOT EXISTS local_migrations(version TEXT PRIMARY KEY)');
  const version = '202611050001';
  const applied = await pg.query('SELECT version FROM local_migrations WHERE version=$1', [version]);
  if (!applied.rows.length) {
    const sql = await readFile(new URL('../netlify/database/migrations/202611050001_initial.sql', import.meta.url), 'utf8');
    await pg.transaction(async tx => { await tx.exec(sql); await tx.query('INSERT INTO local_migrations(version) VALUES($1)', [version]); });
  }
  // PGlite serializes transactions using a single embedded Postgres engine.
  return { query: (sql, values = []) => pg.query(sql, values), transaction: fn => pg.transaction(fn), close: () => pg.close() };
}
