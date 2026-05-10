export const MAX_TAG_NAME_LENGTH = 30

export type Tag = {
  id: string
  name: string
  normalizedName: string
  createdAt: string
  updatedAt: string
}

export type WordTagLink = {
  wordId: string
  tagId: string
  createdAt: string
}

export type WordExplorerSortMode = "alphabetical" | "added"

export type WordExplorerWord = {
  wordId: string
  latestAddedAt: string
}

export type NormalizedTagName = {
  displayName: string
  normalizedName: string
}

export type TagWithAssignment = {
  tag: Tag
  assigned: boolean
}

export type TagWithWordCount = Tag & {
  wordCount: number
}

export type TagNameValidationResult =
  | { ok: true; value: NormalizedTagName }
  | { ok: false; message: string }

export type WordTagsService = {
  listTagsForWord(wordId: string): Promise<TagWithAssignment[]>
  listTags(): Promise<TagWithWordCount[]>
  listWordsForTagIntersection(
    selectedTagIds: string[],
    sortMode: WordExplorerSortMode,
  ): Promise<WordExplorerWord[]>
  createTag(name: string): Promise<Tag>
  renameTag(tagId: string, name: string): Promise<Tag>
  deleteTag(tagId: string): Promise<void>
  assignTagToWord(wordId: string, tagId: string): Promise<boolean>
  toggleTagAssignment(wordId: string, tagId: string): Promise<boolean>
}
