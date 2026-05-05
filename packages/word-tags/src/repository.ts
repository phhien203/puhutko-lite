import type { Tag } from "./types"

export type WordTagsRepository = {
  listTags(): Promise<Tag[]>
  getTagById(id: string): Promise<Tag | null>
  getTagByNormalizedName(normalizedName: string): Promise<Tag | null>
  createTag(input: { name: string; normalizedName: string }): Promise<Tag>
  updateTag(id: string, input: { name: string; normalizedName: string }): Promise<Tag>
  deleteTag(id: string): Promise<void>
  listTagIdsForWord(wordId: string): Promise<string[]>
  assignTagToWord(wordId: string, tagId: string): Promise<void>
  unassignTagFromWord(wordId: string, tagId: string): Promise<void>
}
