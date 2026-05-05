export function appSignature(target: "server" | "cli") {
  return `puhutko-lite ${target} powered by shared`
}

export type WiktionarySearchItem = {
  label: string
  value: string
  description?: string
  url?: string
}
