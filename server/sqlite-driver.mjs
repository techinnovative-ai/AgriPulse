/**
 * SQLite driver adapter.
 *
 * The API code is written against the small, synchronous `better-sqlite3`
 * surface (`prepare().run/get/all`, `exec`, `pragma`, `transaction`, `close`).
 * `better-sqlite3` is a native addon and is therefore an *optional* dependency:
 * when it cannot be installed (no C++ toolchain, restricted network, unsupported
 * Node ABI) the API falls back to Node's built-in `node:sqlite` module (Node 22.5+)
 * wrapped with the same helpers. Behaviour is identical for the queries used here.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function loadBetterSqlite() {
  try {
    return require('better-sqlite3');
  } catch {
    return null;
  }
}

function loadNodeSqlite() {
  try {
    return require('node:sqlite');
  } catch {
    return null;
  }
}

class NodeSqliteStatement {
  constructor(statement) {
    this.statement = statement;
  }

  run(...params) {
    return this.statement.run(...params);
  }

  get(...params) {
    const row = this.statement.get(...params);
    return row === undefined ? undefined : { ...row };
  }

  all(...params) {
    return this.statement.all(...params).map((row) => ({ ...row }));
  }
}

class NodeSqliteDatabase {
  constructor(filename) {
    const { DatabaseSync } = loadNodeSqlite();
    this.raw = new DatabaseSync(filename);
    this.depth = 0;
    this.open = true;
  }

  prepare(sql) {
    return new NodeSqliteStatement(this.raw.prepare(sql));
  }

  exec(sql) {
    this.raw.exec(sql);
    return this;
  }

  pragma(text) {
    const [name] = text.split('=');
    this.raw.exec(`PRAGMA ${text}`);
    const row = this.raw.prepare(`PRAGMA ${name.trim()}`).get();
    return row ? Object.values(row)[0] : undefined;
  }

  /** Mirrors better-sqlite3: returns a function that runs `fn` atomically. Nested calls use savepoints. */
  transaction(fn) {
    return (...args) => {
      const nested = this.depth > 0;
      const savepoint = `agripulse_sp_${this.depth}`;
      this.raw.exec(nested ? `SAVEPOINT ${savepoint}` : 'BEGIN');
      this.depth += 1;
      try {
        const result = fn(...args);
        this.depth -= 1;
        this.raw.exec(nested ? `RELEASE ${savepoint}` : 'COMMIT');
        return result;
      } catch (error) {
        this.depth -= 1;
        this.raw.exec(nested ? `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}` : 'ROLLBACK');
        throw error;
      }
    };
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.raw.close();
  }
}

export function describeSqliteDriver() {
  if (loadBetterSqlite()) return 'better-sqlite3';
  if (loadNodeSqlite()) return 'node:sqlite';
  return 'unavailable';
}

export function createSqliteDatabase(filename) {
  const BetterSqlite = loadBetterSqlite();
  if (BetterSqlite) return new BetterSqlite(filename);
  if (loadNodeSqlite()) return new NodeSqliteDatabase(filename);
  throw new Error(
    'No SQLite driver is available. Install the optional better-sqlite3 dependency or run the API with Node.js 22.5 or newer (built-in node:sqlite).'
  );
}
