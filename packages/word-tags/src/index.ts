export { createMemoryWordTagsRepository } from "./adapters/memory"
export { findNextJumpMatch, getCircularIndex } from "./navigation"
export { normalizeTagName } from "./normalization"
export type { WordTagsRepository } from "./repository"
export { createWordTagsService } from "./service"
export { sortTagsAlphabetically } from "./sorting"
export {
  MAX_TAG_NAME_LENGTH,
  type NormalizedTagName,
  type Tag,
  type TagNameValidationResult,
  type TagWithAssignment,
  type WordTagLink,
  type WordTagsService,
} from "./types"
export { validateTagName } from "./validation"
