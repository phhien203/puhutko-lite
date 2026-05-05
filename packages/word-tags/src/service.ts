import type { WordTagsRepository } from "./repository"
import { sortTagsAlphabetically } from "./sorting"
import type { Tag, WordTagsService } from "./types"
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
