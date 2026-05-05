import { normalizeTagName } from "./normalization"
import { MAX_TAG_NAME_LENGTH, type TagNameValidationResult } from "./types"

export function validateTagName(name: string, existingNormalizedNames: Iterable<string> = []): TagNameValidationResult {
  const value = normalizeTagName(name)

  if (value.displayName.length === 0) {
    return { ok: false, message: "Tag name is required." }
  }

  if (value.displayName.length > MAX_TAG_NAME_LENGTH) {
    return { ok: false, message: `Tag name must be ${MAX_TAG_NAME_LENGTH} characters or fewer.` }
  }

  for (const existingNormalizedName of existingNormalizedNames) {
    if (existingNormalizedName === value.normalizedName) {
      return { ok: false, message: "A tag with this name already exists." }
    }
  }

  return { ok: true, value }
}
