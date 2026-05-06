import { queryOptions } from "@tanstack/react-query"
import type { WordExplorerSortMode } from "@puhutko/word-tags"
import { wordTagsService } from "../../persistence"
import { queryKeys } from "../../query/query-keys"

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
  return queryOptions({
    queryKey: queryKeys.wordExplorerWords(selectedTagIds, sortMode),
    queryFn: () => wordTagsService.listWordsForTagIntersection(selectedTagIds, sortMode),
    staleTime: Infinity,
  })
}
