import type { RecentSearchesRepository } from "./repository"
import type { RecentSearchesService } from "./types"

export function createRecentSearchesService(
  repository: RecentSearchesRepository,
): RecentSearchesService {
  return {
    async listRecentSearches(limit) {
      return repository.listRecentSearches(limit)
    },
    async saveRecentSearch(item) {
      return repository.saveRecentSearch(item)
    },
    async clearRecentSearches() {
      await repository.clearRecentSearches()
    },
  }
}
