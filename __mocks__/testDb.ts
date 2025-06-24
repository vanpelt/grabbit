// __mocks__/testDb.ts
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";
import * as schema from "../db/schema";

export type TestDB = LibSQLDatabase<typeof schema>;
/**
 * Creates a new in-memory SQLite database for testing, with Drizzle ORM.
 * Runs all migrations in the drizzle directory.
 */
export async function createTestDb(): Promise<TestDB> {
  const db = drizzle({
    connection: { url: "file::memory:?cache=shared" },
    schema,
  });
  const migrationsPath = path.resolve(__dirname, "../drizzle");
  await migrate(db, { migrationsFolder: migrationsPath });
  return db;
}
