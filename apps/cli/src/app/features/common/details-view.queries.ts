import { queryOptions } from "@tanstack/react-query"
import { getFinnishWordDetail } from "@puhutko/kaikki"
import { queryKeys } from "../../query/query-keys"

export function wordDetailQueryOptions(word: string) {
  return queryOptions({
    queryKey: queryKeys.wordDetail(word),
    queryFn: ({ signal }) => getFinnishWordDetail(word, signal),
    staleTime: 1000 * 60 * 3,
  })
}
