import { queryOptions } from "@tanstack/react-query"
import { wordExampleService, wordTagsService } from "../../../persistence"
import { queryKeys } from "../../../query/query-keys"

export function wordTagsQueryOptions(wordId: string) {
  return queryOptions({
    queryKey: queryKeys.wordTags(wordId),
    queryFn: () => wordTagsService.listTagsForWord(wordId),
    staleTime: Infinity,
  })
}

export function wordExampleQueryOptions(wordId: string) {
  return queryOptions({
    queryKey: queryKeys.wordExample(wordId),
    queryFn: () => wordExampleService.getWordExample(wordId),
    staleTime: Infinity,
  })
}
