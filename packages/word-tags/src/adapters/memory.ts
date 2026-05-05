import type { WordTagsRepository } from "../repository"
import type { Tag } from "../types"

function cloneTag(tag: Tag): Tag {
  return { ...tag }
}

export function createMemoryWordTagsRepository(): WordTagsRepository {
  const tags = new Map<string, Tag>()
  const wordLinks = new Map<string, Set<string>>()
  let nextTagId = 1

  return {
    async listTags() {
      return Array.from(tags.values(), cloneTag)
    },
    async getTagById(id) {
      const tag = tags.get(id)
      return tag ? cloneTag(tag) : null
    },
    async getTagByNormalizedName(normalizedName) {
      for (const tag of tags.values()) {
        if (tag.normalizedName === normalizedName) {
          return cloneTag(tag)
        }
      }

      return null
    },
    async createTag(input) {
      const now = new Date().toISOString()
      const tag: Tag = {
        id: `tag-${nextTagId}`,
        name: input.name,
        normalizedName: input.normalizedName,
        createdAt: now,
        updatedAt: now,
      }

      nextTagId += 1
      tags.set(tag.id, tag)

      return cloneTag(tag)
    },
    async updateTag(id, input) {
      const existingTag = tags.get(id)

      if (!existingTag) {
        throw new Error(`Tag not found: ${id}`)
      }

      const updatedTag: Tag = {
        ...existingTag,
        name: input.name,
        normalizedName: input.normalizedName,
        updatedAt: new Date().toISOString(),
      }

      tags.set(id, updatedTag)

      return cloneTag(updatedTag)
    },
    async deleteTag(id) {
      tags.delete(id)

      for (const [wordId, assignedTagIds] of wordLinks.entries()) {
        assignedTagIds.delete(id)

        if (assignedTagIds.size === 0) {
          wordLinks.delete(wordId)
        }
      }
    },
    async listTagIdsForWord(wordId) {
      const assignedTagIds = wordLinks.get(wordId)
      return assignedTagIds ? Array.from(assignedTagIds) : []
    },
    async assignTagToWord(wordId, tagId) {
      const assignedTagIds = wordLinks.get(wordId) ?? new Set<string>()

      assignedTagIds.add(tagId)
      wordLinks.set(wordId, assignedTagIds)
    },
    async unassignTagFromWord(wordId, tagId) {
      const assignedTagIds = wordLinks.get(wordId)

      if (!assignedTagIds) {
        return
      }

      assignedTagIds.delete(tagId)

      if (assignedTagIds.size === 0) {
        wordLinks.delete(wordId)
      }
    },
  }
}
