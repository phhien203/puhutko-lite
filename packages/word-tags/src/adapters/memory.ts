import type { WordTagsRepository } from "../repository"
import type { Tag, WordTagLink } from "../types"

function cloneTag(tag: Tag): Tag {
  return { ...tag }
}

export function createMemoryWordTagsRepository(): WordTagsRepository {
  const tags = new Map<string, Tag>()
  const wordLinks = new Map<string, Map<string, WordTagLink>>()
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
    async listWordTagLinksForTagIds(tagIds) {
      if (tagIds.length === 0) {
        return []
      }

      const tagIdsSet = new Set(tagIds)
      const links: WordTagLink[] = []

      for (const assignedLinks of wordLinks.values()) {
        for (const link of assignedLinks.values()) {
          if (tagIdsSet.has(link.tagId)) {
            links.push({ ...link })
          }
        }
      }

      return links
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

      for (const [wordId, assignedLinks] of wordLinks.entries()) {
        assignedLinks.delete(id)

        if (assignedLinks.size === 0) {
          wordLinks.delete(wordId)
        }
      }
    },
    async listTagIdsForWord(wordId) {
      const assignedLinks = wordLinks.get(wordId)
      return assignedLinks ? Array.from(assignedLinks.keys()) : []
    },
    async assignTagToWord(wordId, tagId) {
      const assignedLinks = wordLinks.get(wordId) ?? new Map<string, WordTagLink>()

      assignedLinks.set(tagId, {
        wordId,
        tagId,
        createdAt: new Date().toISOString(),
      })

      wordLinks.set(wordId, assignedLinks)
    },
    async unassignTagFromWord(wordId, tagId) {
      const assignedLinks = wordLinks.get(wordId)

      if (!assignedLinks) {
        return
      }

      assignedLinks.delete(tagId)

      if (assignedLinks.size === 0) {
        wordLinks.delete(wordId)
      }
    },
  }
}
