import type { RecentSearchesRepository } from "../repository"
import type { RecentSearch, RecentSearchInput } from "../types"

function cloneRecentSearch(item: RecentSearch): RecentSearch {
  return { ...item }
}

export function createMemoryRecentSearchesRepository(): RecentSearchesRepository {
  const items = new Map<string, RecentSearch>()

  return {
    async listRecentSearches(limit) {
      const recentSearches = Array.from(items.values())
        .sort((left, right) => right.lastSearchedAt.localeCompare(left.lastSearchedAt))
        .map(cloneRecentSearch)

      return typeof limit === "number" ? recentSearches.slice(0, limit) : recentSearches
    },
    async saveRecentSearch(item: RecentSearchInput) {
      const recentSearch: RecentSearch = {
        ...item,
        lastSearchedAt: new Date().toISOString(),
      }

      items.set(item.value, recentSearch)

      return cloneRecentSearch(recentSearch)
    },
    async clearRecentSearches() {
      items.clear()
    },
  }
}
