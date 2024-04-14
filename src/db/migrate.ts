import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

async function main() {
  const sqlite = new Database("./src/db/sqlite.db");
  const db = drizzle(sqlite);

  await migrate(db, { migrationsFolder: "./src/db/drizzle" });
}

main();
