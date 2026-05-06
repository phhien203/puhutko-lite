import { RECENT_SEARCH_LIMIT } from "../features/word-search/word-search.constants"
import type { WordExplorerSortMode } from "@puhutko/word-tags"

export const queryKeys = {
  wordDetail: (word: string) => ["word-detail", word] as const,
  wordTags: (wordId: string) => ["word-tags", wordId] as const,
  wordExample: (wordId: string) => ["word-example", wordId] as const,
  recentSearches: (limit: number = RECENT_SEARCH_LIMIT) =>
    ["recent-searches", limit] as const,
  wordExplorerTags: () => ["word-explorer", "tags"] as const,
  wordExplorerWords: (selectedTagIds: string[], sortMode: WordExplorerSortMode) =>
    ["word-explorer", "words", selectedTagIds, sortMode] as const,
}
