import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { ApiError } from './server-http';

class Prepared {
  constructor(private statement: StatementSync, private values: SQLInputValue[] = []) {}
  bind(...values: SQLInputValue[]) { return new Prepared(this.statement, values); }
  first<T = Record<string, unknown>>() { return (this.statement.get(...this.values) as T | undefined) ?? null; }
  all<T = Record<string, unknown>>() { return {results: this.statement.all(...this.values) as T[]}; }
  run() { return this.statement.run(...this.values); }
}

class Store {
  constructor(private connection: DatabaseSync) {}
  prepare(sql: string) { return new Prepared(this.connection.prepare(sql)); }
  batch(statements: Prepared[]) {
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      const results = statements.map(statement => statement.all());
      this.connection.exec('COMMIT');
      return results;
    } catch (error) {
      this.connection.exec('ROLLBACK');
      throw error;
    }
  }
}

let instance: Store | undefined;

export function database(): Store {
  if (instance) return instance;
  const path = process.env.DATABASE_PATH;
  if (!path || !isAbsolute(path)) throw new ApiError(503, 'Lagringen er ikke konfigurert.');
  if (process.env.RENDER === 'true') {
    const mounts = readFileSync('/proc/self/mountinfo', 'utf8').split('\n');
    const mounted = mounts.some(line => line.split(' ')[4] === dirname(path));
    if (!mounted) throw new ApiError(503, 'Lagringen krever en tilkoblet disk.');
  }
  const connection = new DatabaseSync(path);
  try {
    connection.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; BEGIN IMMEDIATE');
    const version = connection.prepare('PRAGMA user_version').get()?.user_version;
    if (version === 0) {
      connection.exec(readFileSync(join(process.cwd(), 'db/schema.sql'), 'utf8'));
      connection.exec('PRAGMA user_version=1');
    } else if (version !== 1) throw new Error('Unsupported database schema version');
    connection.exec('COMMIT');
    instance = new Store(connection);
    return instance;
  } catch (error) {
    connection.close();
    throw error;
  }
}
