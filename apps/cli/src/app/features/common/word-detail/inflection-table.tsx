import type { FinnishNominalCase, InflectionForm, WordDetail } from "@puhutko/shared"
import React from "react"
import { homeScreenTheme } from "../../../theme/colors"

const nominalCaseOrder: FinnishNominalCase[] = [
  "nominative",
  "genitive",
  "partitive",
  "essive",
  "translative",
  "inessive",
  "elative",
  "illative",
  "adessive",
  "ablative",
  "allative",
  "abessive",
  "comitative",
  "instructive",
]

const nounCaseDisplayOrder: Array<{ caseName: FinnishNominalCase; label: string } | "spacer"> = [
  { caseName: "nominative", label: "Nominative" },
  "spacer",
  { caseName: "partitive", label: "Partitive" },
  { caseName: "genitive", label: "Genitive" },
  "spacer",
  { caseName: "illative", label: "Illative (S-Mihin) ⇢□ " },
  { caseName: "inessive", label: "Inessive (S-Missä)  ▣ " },
  { caseName: "elative", label: "Elative  (S-Mistä)  □⇢" },
  "spacer",
  { caseName: "allative", label: "Allative (L-Mihin) ⇢▁ " },
  { caseName: "adessive", label: "Adessive (L-Millä) ●▁ " },
  { caseName: "ablative", label: "Ablative (L-Miltä)  ▁⇢" },
  "spacer",
  { caseName: "essive", label: "Essive" },
  { caseName: "translative", label: "Translative" },
]

const verbPersons = [
  { pronoun: "minä", person: "1", number: "singular" },
  { pronoun: "sinä", person: "2", number: "singular" },
  { pronoun: "hän", person: "3", number: "singular" },
  { pronoun: "me", person: "1", number: "plural" },
  { pronoun: "te", person: "2", number: "plural" },
  { pronoun: "he", person: "3", number: "plural" },
] as const

const verbAffirmativeColumnWidth = 34
const verbPolarityColumnGap = 6
const negativeAuxiliaryWidth = 6
const negativeParticipleWidth = 7
const verbPersonColumnWidth = 9

const coreVerbSections = [
  { title: "Present", tags: ["indicative", "present"] },
  { title: "Simple Past", tags: ["indicative", "past"] },
] as const

const perfectVerbSections = [
  { title: "Present Perfect", tags: ["indicative", "perfect"] },
  { title: "Past Perfect", tags: ["indicative", "pluperfect"] },
] as const

const conditionalVerbSection = { title: "Conditional", tags: ["conditional"] } as const

const allVerbSections = [
  ...coreVerbSections,
  ...perfectVerbSections,
  conditionalVerbSection,
] as const

type CaseRow = { name: string; singular: string; plural: string }
type CaseTableRow = CaseRow | "spacer"

export function InflectionTable({ detail }: { detail: WordDetail }) {
  const inflections = detail.inflections ?? []

  if (inflections.length === 0) {
    return null
  }

  if (detail.partOfSpeech === "verb") {
    return <VerbInflections forms={inflections} />
  }

  const isLearningCaseTable = detail.partOfSpeech === "noun" || detail.partOfSpeech === "adjective"
  const caseRows = isLearningCaseTable
    ? buildLearningCaseRows(inflections)
    : buildCaseRows(inflections)
  const otherRows = inflections.filter((form) => form.category !== "case")

  return (
    <box width="100%" flexDirection="column" gap={1}>
      <text>
        <strong>
          <span fg={homeScreenTheme.sectionHeaderText}>Inflections</span>
        </strong>
      </text>

      {caseRows.length > 0 ? <CaseTable rows={caseRows} /> : null}
      {otherRows.length > 0 ? <OtherForms forms={otherRows} /> : null}
      {caseRows.length === 0 && otherRows.length === 0 ? (
        <text>
          <span fg={homeScreenTheme.mutedText}>No inflections available.</span>
        </text>
      ) : null}
    </box>
  )
}

function VerbInflections({ forms }: { forms: InflectionForm[] }) {
  const hasVerbForms = allVerbSections.some(
    (section) =>
      verbPersons.some((person) => selectVerbValue(forms, section.tags, person)) ||
      selectPassiveVerbValue(forms, section.tags),
  )

  return (
    <box width="100%" flexDirection="column" gap={1}>
      <text>
        <strong>
          <span fg={homeScreenTheme.sectionHeaderText}>Inflections</span>
        </strong>
      </text>
      {hasVerbForms ? (
        <box width="100%" flexDirection="column" gap={1}>
          <VerbPolaritySection title="Present" tags={coreVerbSections[0].tags} forms={forms} />
          <VerbPolaritySection title="Simple Past" tags={coreVerbSections[1].tags} forms={forms} />
          <VerbPolaritySection
            title="Present Perfect"
            tags={perfectVerbSections[0].tags}
            forms={forms}
          />
          <VerbPolaritySection
            title="Past Perfect"
            tags={perfectVerbSections[1].tags}
            forms={forms}
          />
          <VerbSimpleSection title="Conditional" tags={conditionalVerbSection.tags} forms={forms} />
        </box>
      ) : (
        <text>
          <span fg={homeScreenTheme.mutedText}>No inflections available.</span>
        </text>
      )}
    </box>
  )
}

function VerbPolaritySection({
  title,
  tags,
  forms,
}: {
  title: string
  tags: readonly string[]
  forms: InflectionForm[]
}) {
  return (
    <box width="100%" flexDirection="column">
      <text>
        <strong>{title}</strong>
      </text>
      <box flexDirection="row" width="100%">
        <text width={verbPersonColumnWidth}> </text>
        <text width={verbAffirmativeColumnWidth}>
          <span fg={homeScreenTheme.mutedText}>Affirmative</span>
        </text>
        <text width={verbPolarityColumnGap}> </text>
        <text width={verbPersonColumnWidth}> </text>
        <text flexGrow={1}>
          <span fg={homeScreenTheme.mutedText}>Negative</span>
        </text>
      </box>
      {renderVerbPersonRows((person) => (
        <box key={`${title}:${person.pronoun}`} flexDirection="row" width="100%">
          <text width={verbPersonColumnWidth}>{person.pronoun}</text>
          <text width={verbAffirmativeColumnWidth}>
            {formatAffirmativeVerbValue(title, selectVerbValue(forms, tags, person))}
          </text>
          <text width={verbPolarityColumnGap}> </text>
          <text width={verbPersonColumnWidth}>{person.pronoun}</text>
          <text flexGrow={1}>
            {formatNegativeVerbValue(selectVerbValue(forms, tags, person, true))}
          </text>
        </box>
      ))}
      <box flexDirection="row" width="100%">
        <text width={verbPersonColumnWidth}>
          <span fg={homeScreenTheme.mutedText}>passive</span>
        </text>
        <text width={verbAffirmativeColumnWidth}>
          {formatAffirmativeVerbValue(title, selectPassiveVerbValue(forms, tags))}
        </text>
        <text width={verbPolarityColumnGap}> </text>
        <text width={verbPersonColumnWidth}>
          <span fg={homeScreenTheme.mutedText}>passive</span>
        </text>
        <text flexGrow={1}>
          {formatNegativeVerbValue(selectPassiveVerbValue(forms, tags, true))}
        </text>
      </box>
    </box>
  )
}

function VerbSimpleSection({
  title,
  tags,
  forms,
}: {
  title: string
  tags: readonly string[]
  forms: InflectionForm[]
}) {
  return (
    <box width="100%" flexDirection="column">
      <text>
        <strong>{title}</strong>
      </text>
      <box flexDirection="row" width="100%">
        <text width={verbPersonColumnWidth}> </text>
        <text flexGrow={1}>
          <span fg={homeScreenTheme.mutedText}>Form</span>
        </text>
      </box>
      {renderVerbPersonRows((person) => (
        <box key={`${title}:${person.pronoun}`} flexDirection="row" width="100%">
          <text width={verbPersonColumnWidth}>{person.pronoun}</text>
          <text flexGrow={1}>{selectVerbValue(forms, tags, person) || "-"}</text>
        </box>
      ))}
    </box>
  )
}

function renderVerbPersonRows(
  renderRow: (person: (typeof verbPersons)[number]) => React.ReactNode,
) {
  return verbPersons.map((person) => renderRow(person))
}

function CaseTable({ rows }: { rows: CaseTableRow[] }) {
  const caseColumnWidth = Math.max(
    24,
    ...rows.filter((row): row is CaseRow => row !== "spacer").map((row) => row.name.length + 1),
  )
  const singularColumnWidth = 20

  return (
    <box width="100%" flexDirection="column">
      <text>
        <span fg={homeScreenTheme.mutedText}>
          {padNoTruncate("Case", caseColumnWidth)} {padNoTruncate("Singular", singularColumnWidth)}{" "}
          Plural
        </span>
      </text>
      {rows.map((row, index) =>
        row === "spacer" ? (
          <text key={`spacer:${index}`}> </text>
        ) : (
          <text key={row.name}>
            {padNoTruncate(row.name, caseColumnWidth)}{" "}
            {padNoTruncate(row.singular, singularColumnWidth)} {row.plural}
          </text>
        ),
      )}
    </box>
  )
}

function OtherForms({ forms }: { forms: InflectionForm[] }) {
  return (
    <box width="100%" flexDirection="column">
      <text>
        <span fg={homeScreenTheme.mutedText}>Form Value</span>
      </text>
      {forms.map((form) => (
        <text key={`${form.label}:${form.value}`}>
          {pad(form.label, 28)} {form.value}
        </text>
      ))}
    </box>
  )
}

function buildCaseRows(forms: InflectionForm[]) {
  return nominalCaseOrder
    .map((caseName) => {
      const singular = selectCaseValue(forms, caseName, "singular")
      const plural = selectCaseValue(forms, caseName, "plural")

      return { name: caseName, singular, plural }
    })
    .filter((row) => row.singular || row.plural)
}

function buildLearningCaseRows(forms: InflectionForm[]) {
  const rows = nounCaseDisplayOrder.map((item) => {
    if (item === "spacer") {
      return item
    }

    const singular = selectCaseValue(forms, item.caseName, "singular")
    const plural = selectCaseValue(forms, item.caseName, "plural")

    return { name: item.label, singular, plural }
  })

  return rows.filter((row, index) => {
    if (row !== "spacer") {
      return row.singular || row.plural
    }

    const hasVisibleRowBefore = rows.slice(0, index).some(hasCaseValue)
    const hasVisibleRowAfter = rows.slice(index + 1).some(hasCaseValue)

    return hasVisibleRowBefore && hasVisibleRowAfter
  })
}

function hasCaseValue(row: CaseTableRow) {
  return row !== "spacer" && Boolean(row.singular || row.plural)
}

function selectCaseValue(
  forms: InflectionForm[],
  caseName: FinnishNominalCase,
  number: "singular" | "plural",
) {
  const matches = forms.filter((form) => form.case === caseName && form.number === number)
  const preferredMatch = matches.find((form) => !form.tags?.includes("accusative"))

  return (preferredMatch ?? matches[0])?.value ?? ""
}

function selectVerbValue(
  forms: InflectionForm[],
  requiredTags: readonly string[],
  person: { person: "1" | "2" | "3"; number: "singular" | "plural" },
  negative = false,
) {
  return uniqueValues(
    forms
      .filter((form) => {
        const tags = form.tags ?? []
        const formNumber =
          form.number ??
          (tags.includes("plural") ? "plural" : tags.includes("singular") ? "singular" : undefined)
        const formPerson =
          form.person ??
          (tags.includes("first-person")
            ? "1"
            : tags.includes("second-person")
              ? "2"
              : tags.includes("third-person")
                ? "3"
                : undefined)

        return (
          formPerson === person.person &&
          formNumber === person.number &&
          requiredTags.every((tag) => tags.includes(tag)) &&
          tags.includes("negative") === negative &&
          !tags.includes("passive") &&
          (requiredTags.includes("conditional") || tags.includes("indicative"))
        )
      })
      .map((form) => form.value),
  ).join(" / ")
}

function selectPassiveVerbValue(
  forms: InflectionForm[],
  requiredTags: readonly string[],
  negative = false,
) {
  return uniqueValues(
    forms
      .filter((form) => {
        const tags = form.tags ?? []

        return (
          requiredTags.every((tag) => tags.includes(tag)) &&
          tags.includes("negative") === negative &&
          tags.includes("passive") &&
          tags.includes("indicative")
        )
      })
      .map((form) => form.value),
  ).join(" / ")
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function formatNegativeVerbValue(value: string) {
  if (!value) {
    return "-"
  }

  const [auxiliary, participle, ...rest] = value.split(" ")

  if (!participle) {
    return pad(auxiliary, negativeAuxiliaryWidth).trimEnd()
  }

  if (rest.length === 0) {
    return [pad(auxiliary, negativeAuxiliaryWidth), participle].join(" ")
  }

  return [
    pad(auxiliary, negativeAuxiliaryWidth),
    pad(participle, negativeParticipleWidth),
    ...rest,
  ].join(" ")
}

function formatAffirmativeVerbValue(title: string, value: string) {
  if (!value) {
    return "-"
  }

  if (title !== "Present Perfect" && title !== "Past Perfect") {
    return value
  }

  const [auxiliary, ...rest] = value.split(" ")
  const auxiliaryWidth = 6

  return [pad(auxiliary, auxiliaryWidth), ...rest].join(" ")
}

function pad(value: string, width: number) {
  return value.padEnd(width, " ").slice(0, width)
}

function padNoTruncate(value: string, width: number) {
  return value.length >= width ? `${value} ` : value.padEnd(width, " ")
}
