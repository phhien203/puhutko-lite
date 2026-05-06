import { queryOptions } from "@tanstack/react-query"
import { recentSearchesService } from "../../persistence"
import { queryKeys } from "../../query/query-keys"
import { RECENT_SEARCH_LIMIT } from "./word-search.constants"

export function recentSearchesQueryOptions(limit: number = RECENT_SEARCH_LIMIT) {
  return queryOptions({
    queryKey: queryKeys.recentSearches(limit),
    queryFn: () => recentSearchesService.listRecentSearches(limit),
    staleTime: Infinity,
  })
}
