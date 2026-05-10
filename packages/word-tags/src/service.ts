import type { WordTagsRepository } from "./repository"
import { sortTagsAlphabetically } from "./sorting"
import type { Tag, TagWithWordCount, WordExplorerSortMode, WordExplorerWord, WordTagsService } from "./types"
import { validateTagName } from "./validation"

function assertTagFound(tag: Tag | null, tagId: string): Tag {
  if (!tag) {
    throw new Error(`Tag not found: ${tagId}`)
  }

  return tag
}

export function createWordTagsService(repository: WordTagsRepository): WordTagsService {
  return {
    async listTagsForWord(wordId) {
      const [tags, assignedTagIds] = await Promise.all([repository.listTags(), repository.listTagIdsForWord(wordId)])
      const assignedTagIdsSet = new Set(assignedTagIds)

      return sortTagsAlphabetically(tags).map((tag) => ({
        tag,
        assigned: assignedTagIdsSet.has(tag.id),
      }))
    },
    async createTag(name) {
      const existingTags = await repository.listTags()
      const validation = validateTagName(
        name,
        existingTags.map((tag) => tag.normalizedName),
      )

      if (!validation.ok) {
        throw new Error(validation.message)
      }

      return repository.createTag({
        name: validation.value.displayName,
        normalizedName: validation.value.normalizedName,
      })
    },
    async listTags() {
      const tags = await repository.listTags()
      const sortedTags = sortTagsAlphabetically(tags)
      const links = await repository.listWordTagLinksForTagIds(sortedTags.map((tag) => tag.id))
      const countsByTagId = new Map<string, number>()

      for (const link of links) {
        countsByTagId.set(link.tagId, (countsByTagId.get(link.tagId) ?? 0) + 1)
      }

      return sortedTags.map(
        (tag): TagWithWordCount => ({
          ...tag,
          wordCount: countsByTagId.get(tag.id) ?? 0,
        }),
      )
    },
    async listWordsForTagIntersection(selectedTagIds, sortMode) {
      if (selectedTagIds.length === 0) {
        return []
      }

      const deduplicatedTagIds = Array.from(new Set(selectedTagIds))
      const links = await repository.listWordTagLinksForTagIds(deduplicatedTagIds)
      const linksByWordId = new Map<string, Map<string, string>>()

      for (const link of links) {
        const linksByTagId = linksByWordId.get(link.wordId) ?? new Map<string, string>()
        linksByTagId.set(link.tagId, link.createdAt)
        linksByWordId.set(link.wordId, linksByTagId)
      }

      const words: WordExplorerWord[] = []

      for (const [wordId, linksByTagId] of linksByWordId.entries()) {
        if (!deduplicatedTagIds.every((tagId) => linksByTagId.has(tagId))) {
          continue
        }

        const latestAddedAt = deduplicatedTagIds.reduce((latestTimestamp, tagId) => {
          const createdAt = linksByTagId.get(tagId)

          if (!createdAt) {
            return latestTimestamp
          }

          return latestTimestamp > createdAt ? latestTimestamp : createdAt
        }, "")

        words.push({
          wordId,
          latestAddedAt,
        })
      }

      return words.sort((left, right) => {
        if (sortMode === "added") {
          const byAddedAt = left.latestAddedAt.localeCompare(right.latestAddedAt)

          if (byAddedAt !== 0) {
            return byAddedAt
          }
        }

        return left.wordId.localeCompare(right.wordId, "fi-FI")
      })
    },
    async renameTag(tagId, name) {
      const [tag, existingTags] = await Promise.all([repository.getTagById(tagId), repository.listTags()])
      const currentTag = assertTagFound(tag, tagId)
      const validation = validateTagName(
        name,
        existingTags.filter((existingTag) => existingTag.id !== tagId).map((existingTag) => existingTag.normalizedName),
      )

      if (!validation.ok) {
        throw new Error(validation.message)
      }

      if (
        currentTag.name === validation.value.displayName &&
        currentTag.normalizedName === validation.value.normalizedName
      ) {
        return currentTag
      }

      return repository.updateTag(tagId, {
        name: validation.value.displayName,
        normalizedName: validation.value.normalizedName,
      })
    },
    async deleteTag(tagId) {
      const existingTag = await repository.getTagById(tagId)

      assertTagFound(existingTag, tagId)
      await repository.deleteTag(tagId)
    },
    async assignTagToWord(wordId, tagId) {
      const [tag, assignedTagIds] = await Promise.all([repository.getTagById(tagId), repository.listTagIdsForWord(wordId)])

      assertTagFound(tag, tagId)

      if (assignedTagIds.includes(tagId)) {
        return false
      }

      await repository.assignTagToWord(wordId, tagId)
      return true
    },
    async toggleTagAssignment(wordId, tagId) {
      const [tag, assignedTagIds] = await Promise.all([repository.getTagById(tagId), repository.listTagIdsForWord(wordId)])

      assertTagFound(tag, tagId)

      if (assignedTagIds.includes(tagId)) {
        await repository.unassignTagFromWord(wordId, tagId)
        return false
      }

      await repository.assignTagToWord(wordId, tagId)
      return true
    },
  }
}
