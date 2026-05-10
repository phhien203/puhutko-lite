import { queryOptions } from "@tanstack/react-query"
import type { WordExplorerSortMode } from "@puhutko/word-tags"
import { wordTagsService } from "../../persistence"
import { queryKeys } from "../../query/query-keys"

function getCanonicalSelectedTagIds(selectedTagIds: string[]) {
  return Array.from(new Set(selectedTagIds)).sort((left, right) => left.localeCompare(right))
}

export function wordExplorerTagsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.wordExplorerTags(),
    queryFn: () => wordTagsService.listTags(),
    staleTime: Infinity,
  })
}

export function wordExplorerWordsQueryOptions(
  selectedTagIds: string[],
  sortMode: WordExplorerSortMode,
) {
  const canonicalSelectedTagIds = getCanonicalSelectedTagIds(selectedTagIds)

  return queryOptions({
    queryKey: queryKeys.wordExplorerWords(canonicalSelectedTagIds, sortMode),
    queryFn: () => wordTagsService.listWordsForTagIntersection(canonicalSelectedTagIds, sortMode),
    staleTime: Infinity,
  })
}
