import { queryOptions } from "@tanstack/react-query"
import { getFinnishWordDetail } from "@puhutko/kaikki"
import type { WordDetail } from "@puhutko/shared"
import { getFinnishWiktionaryPronunciationAudio } from "@puhutko/wiktionary"
import { queryClient } from "../../query/query-client"
import { queryKeys } from "../../query/query-keys"

export function wordDetailQueryOptions(word: string) {
  return queryOptions({
    queryKey: queryKeys.wordDetail(word),
    queryFn: async ({ signal }) => {
      const previousDetail = queryClient.getQueryData<WordDetail | null>(queryKeys.wordDetail(word))
      const previousPronunciationAudios = previousDetail?.pronunciationAudios?.length
        ? previousDetail.pronunciationAudios
        : undefined
      const [detail, pronunciationAudios] = await Promise.all([
        getFinnishWordDetail(word, signal),
        getFinnishWiktionaryPronunciationAudio(word, signal),
      ])

      if (!detail) {
        return null
      }

      return {
        ...detail,
        pronunciationAudios:
          pronunciationAudios.length > 0 ? pronunciationAudios : previousPronunciationAudios,
      }
    },
    staleTime: 1000 * 60 * 3,
  })
}
