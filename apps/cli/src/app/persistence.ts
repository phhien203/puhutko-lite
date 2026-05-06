import {
  createRecentSearchesService,
  createSqliteRecentSearchesRepository,
} from "@puhutko/recent-searches"
import { openDatabase } from "@puhutko/sqlite"
import { createSqliteWordExampleRepository, createWordExampleService } from "@puhutko/word-example"
import { createSqliteWordTagsRepository, createWordTagsService } from "@puhutko/word-tags"

const database = openDatabase()

export const wordTagsService = createWordTagsService(createSqliteWordTagsRepository(database))
export const wordExampleService = createWordExampleService(createSqliteWordExampleRepository(database))
export const recentSearchesService = createRecentSearchesService(
  createSqliteRecentSearchesRepository(database),
)
