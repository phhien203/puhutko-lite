import type { Database } from "bun:sqlite"
import { initializeSchema } from "@puhutko/sqlite"
import type { RecentSearchesRepository } from "../repository"
import type { RecentSearch, RecentSearchInput } from "../types"

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS recent_searches (
    word_value TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT,
    url TEXT,
    last_searched_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS recent_searches_last_searched_at_idx
    ON recent_searches (last_searched_at DESC)`,
]

type RecentSearchRow = {
  word_value: string
  label: string
  description: string | null
  url: string | null
  last_searched_at: string
}

function mapRecentSearchRow(row: RecentSearchRow): RecentSearch {
  return {
    value: row.word_value,
    label: row.label,
    description: row.description ?? undefined,
    url: row.url ?? undefined,
    lastSearchedAt: row.last_searched_at,
  }
}

export function createSqliteRecentSearchesRepository(database: Database): RecentSearchesRepository {
  initializeSchema(database, SCHEMA_STATEMENTS)

  const listRecentSearches = database.prepare<RecentSearchRow, [number]>(
    `SELECT word_value, label, description, url, last_searched_at
      FROM recent_searches
      ORDER BY last_searched_at DESC
      LIMIT ?`,
  )
  const listAllRecentSearches = database.prepare<RecentSearchRow, []>(
    `SELECT word_value, label, description, url, last_searched_at
      FROM recent_searches
      ORDER BY last_searched_at DESC`,
  )
  const saveRecentSearch = database.prepare(
    `INSERT INTO recent_searches (word_value, label, description, url, last_searched_at)
      VALUES ($wordValue, $label, $description, $url, $lastSearchedAt)
      ON CONFLICT(word_value) DO UPDATE SET
        label = excluded.label,
        description = excluded.description,
        url = excluded.url,
        last_searched_at = excluded.last_searched_at`,
  )
  const clearRecentSearches = database.prepare("DELETE FROM recent_searches")

  return {
    async listRecentSearches(limit) {
      const rows =
        typeof limit === "number"
          ? listRecentSearches.all(limit)
          : listAllRecentSearches.all()

      return rows.map(mapRecentSearchRow)
    },
    async saveRecentSearch(item: RecentSearchInput) {
      const lastSearchedAt = new Date().toISOString()

      saveRecentSearch.run({
        wordValue: item.value,
        label: item.label,
        description: item.description ?? null,
        url: item.url ?? null,
        lastSearchedAt: lastSearchedAt,
      })

      return {
        ...item,
        lastSearchedAt,
      }
    },
    async clearRecentSearches() {
      clearRecentSearches.run()
    },
  }
}
