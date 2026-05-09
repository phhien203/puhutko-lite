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
  return word.trim().normalize("NFC").toLocaleLowerCase("fi-FI")
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
  const logPrefix = "[wiktionary.searchFinnishWiktionaryEntries]"

  if (normalizedQuery.length === 0) {
    console.info(`${logPrefix} skipping empty query`)
    return []
  }

  console.info(`${logPrefix} starting opensearch request`, {
    query: normalizedQuery,
  })

  let response: Response

  try {
    response = await fetch(buildSearchUrl(normalizedQuery), { signal })
  } catch (error) {
    console.error(`${logPrefix} opensearch request failed`, {
      query: normalizedQuery,
      error,
    })
    throw error
  }

  console.info(`${logPrefix} opensearch response received`, {
    query: normalizedQuery,
    status: response.status,
    ok: response.ok,
  })

  if (!response.ok) {
    console.warn(`${logPrefix} opensearch request returned non-ok response`, {
      query: normalizedQuery,
      status: response.status,
    })
    return []
  }

  const payload = await response.json()

  if (!isOpenSearchResponse(payload)) {
    console.warn(`${logPrefix} opensearch payload shape was invalid`, {
      query: normalizedQuery,
    })
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
    console.info(`${logPrefix} no candidates matched normalized query`, {
      query: normalizedQuery,
      totalTitles: titles.length,
    })
    return []
  }

  console.info(`${logPrefix} starting page content request`, {
    query: normalizedQuery,
    candidateCount: candidates.length,
  })

  let pageContentResponse: Response

  try {
    pageContentResponse = await fetch(buildPageContentUrl(candidates.map((item) => item.value)), {
      signal,
    })
  } catch (error) {
    console.error(`${logPrefix} page content request failed`, {
      query: normalizedQuery,
      candidateCount: candidates.length,
      error,
    })
    throw error
  }

  console.info(`${logPrefix} page content response received`, {
    query: normalizedQuery,
    status: pageContentResponse.status,
    ok: pageContentResponse.ok,
    candidateCount: candidates.length,
  })

  if (!pageContentResponse.ok) {
    console.warn(`${logPrefix} page content request returned non-ok response`, {
      query: normalizedQuery,
      status: pageContentResponse.status,
      candidateCount: candidates.length,
    })
    return []
  }

  const pageContentPayload = await pageContentResponse.json()

  if (!isPageContentResponse(pageContentPayload)) {
    console.warn(`${logPrefix} page content payload shape was invalid`, {
      query: normalizedQuery,
      candidateCount: candidates.length,
    })
    return []
  }

  const finnishWords = new Set<string>()

  for (const page of pageContentPayload.query?.pages ?? []) {
    const content = page.revisions?.[0]?.slots?.main?.content ?? ""

    if (page.title && hasFinnishSection(content)) {
      finnishWords.add(page.title)
    }
  }

  const results = candidates
    .filter((item) => finnishWords.has(item.value))
    .slice(0, 20)
    .map(({ normalizedValue: _normalizedValue, ...item }) => item)

  console.info(`${logPrefix} completed search`, {
    query: normalizedQuery,
    candidateCount: candidates.length,
    finnishWordCount: finnishWords.size,
    resultCount: results.length,
  })

  return results
}
