import type { NormalizedTagName } from "./types"

export function normalizeTagName(name: string): NormalizedTagName {
  const displayName = name.trim().normalize("NFC")

  return {
    displayName,
    normalizedName: displayName.toLocaleLowerCase("fi-FI"),
  }
}
