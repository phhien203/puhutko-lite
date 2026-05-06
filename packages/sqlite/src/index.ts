import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

const DATABASE_DIRECTORY_NAME = ".puhutko-lite"
const DATABASE_FILE_NAME = "puhutko-lite.sqlite"

export type SqliteDatabase = Database

export function resolveDatabasePath() {
  return join(homedir(), DATABASE_DIRECTORY_NAME, DATABASE_FILE_NAME)
}

export function initializeSchema(database: Database, statements: string[]) {
  for (const statement of statements) {
    database.run(statement)
  }
}

export function openDatabase() {
  const databasePath = resolveDatabasePath()

  mkdirSync(dirname(databasePath), { recursive: true })

  const database = new Database(databasePath, { create: true, strict: true })

  database.run("PRAGMA foreign_keys = ON")
  database.run("PRAGMA journal_mode = WAL")
  database.run("PRAGMA synchronous = NORMAL")

  return database
}
