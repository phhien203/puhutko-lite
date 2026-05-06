import type { Database } from "bun:sqlite"
import { initializeSchema } from "@puhutko/sqlite"
import type { WordExampleRepository } from "../repository"
import type { WordExample } from "../types"

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS word_examples (
    owner_user_id TEXT,
    word_id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS word_examples_owner_user_id_idx
    ON word_examples (owner_user_id)`,
]

type WordExampleRow = {
  word_id: string
  text: string
  created_at: string
  updated_at: string
}

function mapWordExampleRow(row: WordExampleRow): WordExample {
  return {
    wordId: row.word_id,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createSqliteWordExampleRepository(database: Database): WordExampleRepository {
  initializeSchema(database, SCHEMA_STATEMENTS)

  const getWordExample = database.prepare<WordExampleRow, [string]>(
    `SELECT word_id, text, created_at, updated_at
      FROM word_examples
      WHERE word_id = ?`,
  )
  const upsertWordExample = database.prepare(
    `INSERT INTO word_examples (owner_user_id, word_id, text, created_at, updated_at)
      VALUES (NULL, $wordId, $text, $createdAt, $updatedAt)
      ON CONFLICT(word_id) DO UPDATE SET
        owner_user_id = NULL,
        text = excluded.text,
        updated_at = excluded.updated_at`,
  )

  return {
    async getWordExample(wordId) {
      const row = getWordExample.get(wordId)
      return row ? mapWordExampleRow(row) : null
    },
    async upsertWordExample(wordId, text) {
      const existingRow = getWordExample.get(wordId)
      const now = new Date().toISOString()
      const createdAt = existingRow?.created_at ?? now

      upsertWordExample.run({
        wordId: wordId,
        text: text,
        createdAt: createdAt,
        updatedAt: now,
      })

      return {
        wordId,
        text,
        createdAt,
        updatedAt: now,
      }
    },
  }
}
