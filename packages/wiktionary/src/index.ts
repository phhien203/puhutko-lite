import type { PronunciationAudio, WiktionarySearchItem } from "@puhutko/shared"

type WiktionaryOpenSearchResponse = [string, string[], string[], string[]]

type WiktionaryPageContentResponse = {
  query?: {
    pages?: Array<{
      title?: string
      missing?: boolean
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

type CommonsVideoInfoResponse = {
  query?: {
    pages?: Array<{
      title?: string
      missing?: boolean
      videoinfo?: CommonsVideoInfo[]
    }>
  }
}

type CommonsDerivative = {
  src?: string
  type?: string
}

type CommonsVideoInfo = {
  url?: string
  mime?: string
  derivatives?: CommonsDerivative[]
}

type ParsedTemplate = {
  name: string
  positional: string[]
  named: Map<string, string>
}

type PronunciationAudioReference = {
  fileName: string
  caption?: string
  qualifier?: string
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

function buildCommonsVideoInfoUrl(fileName: string) {
  const params = new URLSearchParams({
    action: "query",
    titles: `File:${normalizeCommonsFileTitle(fileName)}`,
    prop: "videoinfo",
    viprop: "url|mime|derivatives",
    format: "json",
    formatversion: "2",
    origin: "*",
  })

  return `https://commons.wikimedia.org/w/api.php?${params.toString()}`
}

function buildWiktionaryPageUrl(word: string) {
  return `https://en.wiktionary.org/wiki/${encodeURIComponent(word.normalize("NFC"))}`
}

function normalizeSearchWord(word: string) {
  return word.trim().normalize("NFC").toLocaleLowerCase("fi-FI")
}

function normalizePageWord(word: string) {
  return word.trim().normalize("NFC")
}

function normalizeCommonsFileTitle(fileName: string) {
  return fileName.trim().replace(/^[Ff]ile:/, "").replace(/^[Ii]mage:/, "")
}

function isOpenSearchResponse(value: unknown): value is WiktionaryOpenSearchResponse {
  return Array.isArray(value) && Array.isArray(value[1])
}

function isPageContentResponse(value: unknown): value is WiktionaryPageContentResponse {
  return typeof value === "object" && value !== null && "query" in value
}

function isCommonsVideoInfoResponse(value: unknown): value is CommonsVideoInfoResponse {
  return typeof value === "object" && value !== null && "query" in value
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError"
}

function hasFinnishSection(content: string) {
  return /^==\s*Finnish\s*==\s*$/m.test(content)
}

function extractFinnishSection(content: string) {
  const match = /^==\s*Finnish\s*==\s*$/m.exec(content)

  if (!match || match.index === undefined) {
    return null
  }

  const start = match.index + match[0].length
  const remainder = content.slice(start)
  const nextHeading = [...remainder.matchAll(/^==[^=].*==\s*$/gm)][0]
  const end = nextHeading?.index ?? remainder.length

  return remainder.slice(0, end)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function extractHeadingSection(content: string, heading: string) {
  const headingPattern = new RegExp(`^(={3,})\\s*${escapeRegExp(heading)}\\s*\\1\\s*$`, "im")
  const match = headingPattern.exec(content)

  if (!match || match.index === undefined) {
    return null
  }

  const headingLevel = match[1]?.length ?? 3
  const start = match.index + match[0].length
  const remainder = content.slice(start)
  const sectionHeadings = remainder.matchAll(/^(={3,})\s*.+?\s*\1\s*$/gm)

  for (const candidate of sectionHeadings) {
    const candidateLevel = candidate[1]?.length ?? headingLevel

    if (candidateLevel <= headingLevel) {
      return remainder.slice(0, candidate.index ?? 0)
    }
  }

  return remainder
}

function extractTopLevelTemplates(content: string) {
  const templates: string[] = []
  let depth = 0
  let templateStart = -1

  for (let index = 0; index < content.length; index += 1) {
    const nextTwoChars = content.slice(index, index + 2)

    if (nextTwoChars === "{{") {
      if (depth === 0) {
        templateStart = index
      }

      depth += 1
      index += 1
      continue
    }

    if (nextTwoChars === "}}" && depth > 0) {
      depth -= 1

      if (depth === 0 && templateStart >= 0) {
        templates.push(content.slice(templateStart, index + 2))
        templateStart = -1
      }

      index += 1
    }
  }

  return templates
}

function splitTemplateParts(content: string) {
  const parts: string[] = []
  let currentPart = ""
  let templateDepth = 0
  let linkDepth = 0

  for (let index = 0; index < content.length; index += 1) {
    const nextTwoChars = content.slice(index, index + 2)

    if (nextTwoChars === "{{") {
      templateDepth += 1
      currentPart += nextTwoChars
      index += 1
      continue
    }

    if (nextTwoChars === "}}" && templateDepth > 0) {
      templateDepth -= 1
      currentPart += nextTwoChars
      index += 1
      continue
    }

    if (nextTwoChars === "[[") {
      linkDepth += 1
      currentPart += nextTwoChars
      index += 1
      continue
    }

    if (nextTwoChars === "]]" && linkDepth > 0) {
      linkDepth -= 1
      currentPart += nextTwoChars
      index += 1
      continue
    }

    if (content[index] === "|" && templateDepth === 0 && linkDepth === 0) {
      parts.push(currentPart)
      currentPart = ""
      continue
    }

    currentPart += content[index] ?? ""
  }

  parts.push(currentPart)

  return parts
}

function parseTemplate(templateText: string): ParsedTemplate | null {
  if (!templateText.startsWith("{{") || !templateText.endsWith("}}")) {
    return null
  }

  const innerContent = templateText.slice(2, -2)
  const parts = splitTemplateParts(innerContent).map((part) => part.trim())
  const [rawName, ...rawParams] = parts
  const name = rawName?.trim().toLocaleLowerCase("en-US")

  if (!name) {
    return null
  }

  const positional: string[] = []
  const named = new Map<string, string>()

  for (const rawParam of rawParams) {
    const equalsIndex = rawParam.indexOf("=")

    if (equalsIndex === -1) {
      positional.push(rawParam.trim())
      continue
    }

    const key = rawParam.slice(0, equalsIndex).trim().toLocaleLowerCase("en-US")
    const value = rawParam.slice(equalsIndex + 1).trim()

    if (key) {
      named.set(key, value)
    }
  }

  return {
    name,
    positional,
    named,
  }
}

function findFirstTemplateByName(content: string, name: string) {
  const normalizedName = name.toLocaleLowerCase("en-US")

  for (const templateText of extractTopLevelTemplates(content)) {
    const template = parseTemplate(templateText)

    if (template?.name === normalizedName) {
      return template
    }
  }

  return null
}

function getTemplatesByName(content: string, name: string) {
  const normalizedName = name.toLocaleLowerCase("en-US")

  return extractTopLevelTemplates(content)
    .map((templateText) => parseTemplate(templateText))
    .filter((template): template is ParsedTemplate => template?.name === normalizedName)
}

function getNamedParameter(template: ParsedTemplate, key: string) {
  const value = template.named.get(key.toLocaleLowerCase("en-US"))?.trim()

  return value && value.length > 0 ? value : undefined
}

function normalizeCommonsFileName(rawValue: string) {
  let value = rawValue.trim()

  if (!value) {
    return null
  }

  if (value.startsWith("[[") && value.endsWith("]]")) {
    const innerContent = value.slice(2, -2)
    value = innerContent.split("|")[0]?.trim() ?? ""
  }

  value = normalizeCommonsFileTitle(value).replace(/_/g, " ")

  return value.length > 0 ? value : null
}

function parseFiPronunciationAudio(template: ParsedTemplate) {
  const audioReferences: PronunciationAudioReference[] = []

  for (const suffix of ["", "2", "3"]) {
    const fileName = normalizeCommonsFileName(getNamedParameter(template, `a${suffix}`) ?? "")

    if (!fileName) {
      continue
    }

    audioReferences.push({
      fileName,
      caption: getNamedParameter(template, `ac${suffix}`) ?? "Audio",
      qualifier: getNamedParameter(template, `q${suffix}`),
    })
  }

  return uniqueAudioReferences(audioReferences)
}

function parseGenericFinnishAudio(content: string) {
  const audioReferences: PronunciationAudioReference[] = []

  for (const template of getTemplatesByName(content, "audio")) {
    const languageCode = template.positional[0]?.trim().toLocaleLowerCase("en-US")

    if (languageCode !== "fi") {
      continue
    }

    const fileName = normalizeCommonsFileName(template.positional[1] ?? "")

    if (!fileName) {
      continue
    }

    audioReferences.push({
      fileName,
      caption: template.positional[2]?.trim() || getNamedParameter(template, "caption") || "Audio",
      qualifier: getNamedParameter(template, "q") ?? getNamedParameter(template, "qualifier"),
    })
  }

  return uniqueAudioReferences(audioReferences)
}

function uniqueAudioReferences(audioReferences: PronunciationAudioReference[]) {
  const seenKeys = new Set<string>()

  return audioReferences.filter((audioReference) => {
    const key = [
      audioReference.fileName,
      audioReference.caption ?? "",
      audioReference.qualifier ?? "",
    ].join("::")

    if (seenKeys.has(key)) {
      return false
    }

    seenKeys.add(key)
    return true
  })
}

function getPreferredDerivativeUrl(videoInfo: CommonsVideoInfo) {
  return videoInfo.derivatives?.find((derivative) => derivative.type?.startsWith("audio/mpeg"))
}

function guessMimeType(url: string) {
  const normalizedUrl = url.toLocaleLowerCase("en-US")

  if (normalizedUrl.endsWith(".mp3")) {
    return "audio/mpeg"
  }

  if (normalizedUrl.endsWith(".ogg") || normalizedUrl.endsWith(".oga")) {
    return "audio/ogg"
  }

  if (normalizedUrl.endsWith(".wav")) {
    return "audio/wav"
  }

  return "application/octet-stream"
}

async function resolveCommonsPronunciationAudio(
  audioReference: PronunciationAudioReference,
  pageTitle: string,
  signal?: AbortSignal,
): Promise<PronunciationAudio | null> {
  const response = await fetch(buildCommonsVideoInfoUrl(audioReference.fileName), { signal })

  if (!response.ok) {
    throw new Error(`Commons returned ${response.status}`)
  }

  const payload = await response.json()

  if (!isCommonsVideoInfoResponse(payload)) {
    return null
  }

  const page = payload.query?.pages?.[0]
  const videoInfo = page?.videoinfo?.[0]

  if (page?.missing || !videoInfo?.url) {
    return null
  }

  const preferredDerivative = getPreferredDerivativeUrl(videoInfo)
  const preferredPlaybackUrl = preferredDerivative?.src ?? videoInfo.url
  const mimeType = preferredDerivative?.type ?? videoInfo.mime ?? guessMimeType(preferredPlaybackUrl)

  return {
    fileName: audioReference.fileName,
    caption: audioReference.caption,
    qualifier: audioReference.qualifier,
    pageUrl: buildWiktionaryPageUrl(pageTitle),
    source: "wiktionary-commons",
    originalUrl: videoInfo.url,
    preferredPlaybackUrl,
    mimeType,
  }
}

export async function searchFinnishWiktionaryEntries(
  query: string,
  signal: AbortSignal,
): Promise<WiktionarySearchItem[]> {
  const normalizedQuery = normalizeSearchWord(query)
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
      normalizedValue: normalizeSearchWord(title),
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

export async function getFinnishWiktionaryPronunciationAudio(
  word: string,
  signal?: AbortSignal,
): Promise<PronunciationAudio[]> {
  const normalizedWord = normalizePageWord(word)
  const logPrefix = "[wiktionary.getFinnishWiktionaryPronunciationAudio]"

  if (!normalizedWord) {
    return []
  }

  let response: Response

  try {
    response = await fetch(buildPageContentUrl([normalizedWord]), { signal })
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }

    console.error(`${logPrefix} page content request failed`, {
      word: normalizedWord,
      error,
    })
    return []
  }

  if (!response.ok) {
    console.warn(`${logPrefix} page content request returned non-ok response`, {
      word: normalizedWord,
      status: response.status,
    })
    return []
  }

  const payload = await response.json()

  if (!isPageContentResponse(payload)) {
    console.warn(`${logPrefix} page content payload shape was invalid`, {
      word: normalizedWord,
    })
    return []
  }

  const page = payload.query?.pages?.[0]
  const content = page?.revisions?.[0]?.slots?.main?.content ?? ""

  if (!content || !hasFinnishSection(content)) {
    return []
  }

  const finnishSection = extractFinnishSection(content)

  if (!finnishSection) {
    return []
  }

  const pronunciationSection = extractHeadingSection(finnishSection, "Pronunciation") ?? finnishSection
  const fiPronunciationTemplate = findFirstTemplateByName(pronunciationSection, "fi-pronunciation")
  const audioReferences = fiPronunciationTemplate
    ? parseFiPronunciationAudio(fiPronunciationTemplate)
    : parseGenericFinnishAudio(pronunciationSection)
  const fallbackAudioReferences =
    audioReferences.length > 0 ? audioReferences : parseGenericFinnishAudio(pronunciationSection)

  if (fallbackAudioReferences.length === 0) {
    return []
  }

  const pageTitle = page?.title ?? normalizedWord
  const resolvedResults = await Promise.allSettled(
    fallbackAudioReferences.map((audioReference) =>
      resolveCommonsPronunciationAudio(audioReference, pageTitle, signal),
    ),
  )

  const pronunciationAudios: PronunciationAudio[] = []

  for (const [index, result] of resolvedResults.entries()) {
    const audioReference = fallbackAudioReferences[index]

    if (result.status === "fulfilled") {
      if (result.value) {
        pronunciationAudios.push(result.value)
      }

      continue
    }

    if (isAbortError(result.reason)) {
      throw result.reason
    }

    console.warn(`${logPrefix} failed to resolve Commons audio`, {
      word: normalizedWord,
      fileName: audioReference?.fileName,
      error: result.reason,
    })
  }

  return pronunciationAudios
}
