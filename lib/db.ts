import "server-only";

import mysql from "mysql2/promise";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and fill in the database credentials.`
    );
  }
  return value;
}

export const dbConfig = {
  host: required("DB_HOST"),
  port: Number(process.env.DB_PORT ?? 3306),
  user: required("DB_USER"),
  password: process.env.DB_PASSWORD ?? "",
  database: required("DB_NAME"),
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
};

/**
 * Next dev reloads modules on every edit. Caching the pool on globalThis stops
 * us leaking a new pool (and its sockets) per reload.
 */
const globalForDb = globalThis as unknown as { scoraPool?: mysql.Pool };

export const pool: mysql.Pool =
  globalForDb.scoraPool ??
  mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    queueLimit: 0,
    charset: "utf8mb4_general_ci",
    timezone: "Z",
    decimalNumbers: false,
    supportBigNumbers: true,
    bigNumberStrings: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 15_000),
  });

if (process.env.NODE_ENV !== "production") globalForDb.scoraPool = pool;

/** Values accepted as prepared-statement parameters. */
export type SqlParam = string | number | boolean | Date | Buffer | null;

/**
 * Errors are rethrown rather than swallowed on purpose.
 *
 * The previous version returned `[]` / `null` / `affectedRows: 0` on failure,
 * which made a dead connection look exactly like an empty table — pages
 * rendered "no results" while writes silently discarded the user's input.
 * Callers that genuinely have a fallback should catch it themselves.
 */
function fail(kind: string, sql: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  // First line of the statement is enough to locate it without dumping params.
  console.error(`[db:${kind}] ${sql.trim().split("\n")[0]} — ${message}`);
  throw error instanceof Error ? error : new Error(message);
}

/** Run a SELECT and get typed rows back. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: SqlParam[] = []
): Promise<T[]> {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows as T[];
  } catch (error) {
    fail("query", sql, error);
  }
}

/** Run a SELECT expecting at most one row. */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: SqlParam[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Run an INSERT/UPDATE/DELETE. */
export async function execute(
  sql: string,
  params: SqlParam[] = []
): Promise<mysql.ResultSetHeader> {
  try {
    const [result] = await pool.execute(sql, params);
    return result as mysql.ResultSetHeader;
  } catch (error) {
    fail("execute", sql, error);
  }
}

/**
 * Run several statements atomically inside a transaction.
 */
export async function transaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/** Cheap liveness probe for the admin panel's system-health card. */
export async function pingDb(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const started = performance.now();
  try {
    await pool.query("SELECT 1");
    return { ok: true, latencyMs: Math.round(performance.now() - started) };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
