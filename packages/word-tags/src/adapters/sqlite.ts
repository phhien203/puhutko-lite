import type { Database } from "bun:sqlite"
import { initializeSchema } from "@puhutko/sqlite"
import type { WordTagsRepository } from "../repository"
import type { Tag, WordTagLink } from "../types"

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS word_tag_links (
    owner_user_id TEXT,
    word_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    PRIMARY KEY (word_id, tag_id),
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS tags_normalized_name_active_idx
    ON tags (normalized_name)
    WHERE deleted_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS word_tag_links_tag_id_idx
    ON word_tag_links (tag_id)`,
  `CREATE INDEX IF NOT EXISTS word_tag_links_owner_user_id_idx
    ON word_tag_links (owner_user_id)`,
]

type TagRow = {
  id: string
  name: string
  normalized_name: string
  created_at: string
  updated_at: string
}

type TagIdRow = {
  tag_id: string
}

type WordTagLinkRow = {
  word_id: string
  tag_id: string
  created_at: string
}

function mapTagRow(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createSqliteWordTagsRepository(database: Database): WordTagsRepository {
  initializeSchema(database, SCHEMA_STATEMENTS)

  const listTags = database.prepare<TagRow, []>(
    `SELECT id, name, normalized_name, created_at, updated_at
      FROM tags
      WHERE deleted_at IS NULL`,
  )
  const getTagById = database.prepare<TagRow, [string]>(
    `SELECT id, name, normalized_name, created_at, updated_at
      FROM tags
      WHERE id = ? AND deleted_at IS NULL`,
  )
  const getTagByNormalizedName = database.prepare<TagRow, [string]>(
    `SELECT id, name, normalized_name, created_at, updated_at
      FROM tags
      WHERE normalized_name = ? AND deleted_at IS NULL`,
  )
  const insertTag = database.prepare(
    `INSERT INTO tags (
      id,
      owner_user_id,
      name,
      normalized_name,
      created_at,
      updated_at,
      deleted_at
    ) VALUES ($id, NULL, $name, $normalizedName, $createdAt, $updatedAt, NULL)`,
  )
  const updateTag = database.prepare(
    `UPDATE tags
      SET name = $name,
          normalized_name = $normalizedName,
          updated_at = $updatedAt
      WHERE id = $id AND deleted_at IS NULL`,
  )
  const listTagIdsForWord = database.prepare<TagIdRow, [string]>(
    `SELECT word_tag_links.tag_id
      FROM word_tag_links
      INNER JOIN tags ON tags.id = word_tag_links.tag_id
      WHERE word_tag_links.word_id = ?
        AND word_tag_links.deleted_at IS NULL
        AND tags.deleted_at IS NULL`,
  )
  const listWordTagLinksForTagIds = database.prepare<WordTagLinkRow, [string]>(
    `SELECT word_tag_links.word_id, word_tag_links.tag_id, word_tag_links.created_at
      FROM word_tag_links
      INNER JOIN tags ON tags.id = word_tag_links.tag_id
      WHERE word_tag_links.deleted_at IS NULL
        AND tags.deleted_at IS NULL
        AND word_tag_links.tag_id IN (SELECT value FROM json_each(?))`,
  )
  const assignTagToWord = database.prepare(
    `INSERT INTO word_tag_links (
      owner_user_id,
      word_id,
      tag_id,
      created_at,
      updated_at,
      deleted_at
    ) VALUES (NULL, $wordId, $tagId, $createdAt, $updatedAt, NULL)
      ON CONFLICT(word_id, tag_id) DO UPDATE SET
        owner_user_id = NULL,
        updated_at = excluded.updated_at,
        deleted_at = NULL`,
  )
  const unassignTagFromWord = database.prepare(
    `UPDATE word_tag_links
      SET updated_at = $updatedAt,
          deleted_at = $deletedAt
      WHERE word_id = $wordId
        AND tag_id = $tagId
        AND deleted_at IS NULL`,
  )
  const softDeleteTag = database.transaction((tagId: string, deletedAt: string) => {
    database
      .prepare(
        `UPDATE tags
          SET updated_at = $updatedAt,
              deleted_at = $deletedAt
          WHERE id = $id AND deleted_at IS NULL`,
      )
      .run({
        id: tagId,
        updatedAt: deletedAt,
        deletedAt: deletedAt,
      })

    database
      .prepare(
        `UPDATE word_tag_links
          SET updated_at = $updatedAt,
              deleted_at = $deletedAt
          WHERE tag_id = $tagId
            AND deleted_at IS NULL`,
      )
      .run({
        tagId: tagId,
        updatedAt: deletedAt,
        deletedAt: deletedAt,
      })
  })

  return {
    async listTags() {
      return listTags.all().map(mapTagRow)
    },
    async getTagById(id) {
      const row = getTagById.get(id)
      return row ? mapTagRow(row) : null
    },
    async getTagByNormalizedName(normalizedName) {
      const row = getTagByNormalizedName.get(normalizedName)
      return row ? mapTagRow(row) : null
    },
    async listWordTagLinksForTagIds(tagIds) {
      if (tagIds.length === 0) {
        return []
      }

      return listWordTagLinksForTagIds
        .all(JSON.stringify(tagIds))
        .map((row): WordTagLink => ({
          wordId: row.word_id,
          tagId: row.tag_id,
          createdAt: row.created_at,
        }))
    },
    async createTag(input) {
      const now = new Date().toISOString()
      const tag: Tag = {
        id: crypto.randomUUID(),
        name: input.name,
        normalizedName: input.normalizedName,
        createdAt: now,
        updatedAt: now,
      }

      insertTag.run({
        id: tag.id,
        name: tag.name,
        normalizedName: tag.normalizedName,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      })

      return tag
    },
    async updateTag(id, input) {
      const updatedAt = new Date().toISOString()

      updateTag.run({
        id: id,
        name: input.name,
        normalizedName: input.normalizedName,
        updatedAt: updatedAt,
      })

      const row = getTagById.get(id)

      if (!row) {
        throw new Error(`Tag not found: ${id}`)
      }

      return mapTagRow(row)
    },
    async deleteTag(id) {
      softDeleteTag(id, new Date().toISOString())
    },
    async listTagIdsForWord(wordId) {
      return listTagIdsForWord.all(wordId).map((row) => row.tag_id)
    },
    async assignTagToWord(wordId, tagId) {
      const now = new Date().toISOString()

      assignTagToWord.run({
        wordId: wordId,
        tagId: tagId,
        createdAt: now,
        updatedAt: now,
      })
    },
    async unassignTagFromWord(wordId, tagId) {
      const now = new Date().toISOString()

      unassignTagFromWord.run({
        wordId: wordId,
        tagId: tagId,
        updatedAt: now,
        deletedAt: now,
      })
    },
  }
}
