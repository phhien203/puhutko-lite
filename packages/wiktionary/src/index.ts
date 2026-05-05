import type { WiktionarySearchItem } from "@puhutko/shared"

type WiktionaryOpenSearchResponse = [string, string[], string[], string[]]

type WiktionaryPageContentResponse = {
  query?: {
    pages?: Array<{
      title?: string
      revisions?: Array<{
        slots?: {
          main?: {
            content?: string
          }
        }
      }>
    }>
  }
}

function buildSearchUrl(query: string) {
  const params = new URLSearchParams({
    action: "opensearch",
    search: query,
    namespace: "0",
    limit: "25",
    format: "json",
    origin: "*",
  })

  return `https://en.wiktionary.org/w/api.php?${params.toString()}`
}

function buildPageContentUrl(words: string[]) {
  const params = new URLSearchParams({
    action: "query",
    prop: "revisions",
    titles: words.join("|"),
    rvprop: "content",
    rvslots: "main",
    format: "json",
    formatversion: "2",
    origin: "*",
  })

  return `https://en.wiktionary.org/w/api.php?${params.toString()}`
}

function normalizeWord(word: string) {
  return word.trim().toLocaleLowerCase("fi-FI")
}

function isOpenSearchResponse(value: unknown): value is WiktionaryOpenSearchResponse {
  return Array.isArray(value) && Array.isArray(value[1])
}

function isPageContentResponse(value: unknown): value is WiktionaryPageContentResponse {
  return typeof value === "object" && value !== null && "query" in value
}

function hasFinnishSection(content: string) {
  return /^==\s*Finnish\s*==\s*$/m.test(content)
}

export async function searchFinnishWiktionaryEntries(
  query: string,
  signal: AbortSignal,
): Promise<WiktionarySearchItem[]> {
  const normalizedQuery = normalizeWord(query)

  if (normalizedQuery.length === 0) {
    return []
  }

  const response = await fetch(buildSearchUrl(normalizedQuery), { signal })

  if (!response.ok) {
    return []
  }

  const payload = await response.json()

  if (!isOpenSearchResponse(payload)) {
    return []
  }

  const [, titles, descriptions = [], urls = []] = payload
  const candidates = titles
    .map((title, index) => ({
      label: title,
      value: title,
      normalizedValue: normalizeWord(title),
      description: descriptions[index],
      url: urls[index],
    }))
    .filter((item) => item.normalizedValue.startsWith(normalizedQuery))

  if (candidates.length === 0) {
    return []
  }

  const pageContentResponse = await fetch(buildPageContentUrl(candidates.map((item) => item.value)), {
    signal,
  })

  if (!pageContentResponse.ok) {
    return []
  }

  const pageContentPayload = await pageContentResponse.json()

  if (!isPageContentResponse(pageContentPayload)) {
    return []
  }

  const finnishWords = new Set<string>()

  for (const page of pageContentPayload.query?.pages ?? []) {
    const content = page.revisions?.[0]?.slots?.main?.content ?? ""

    if (page.title && hasFinnishSection(content)) {
      finnishWords.add(page.title)
    }
  }

  return candidates
    .filter((item) => finnishWords.has(item.value))
    .slice(0, 20)
    .map(({ normalizedValue: _normalizedValue, ...item }) => item)
}
