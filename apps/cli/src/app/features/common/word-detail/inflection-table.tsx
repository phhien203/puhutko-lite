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
  { caseName: "illative", label: "Illative →[ ]  " },
  { caseName: "inessive", label: "Inessive  [*]  " },
  { caseName: "elative", label: "Elative   [ ]→" },
  "spacer",
  { caseName: "allative", label: "Allative →__  " },
  { caseName: "adessive", label: "Adessive  _*_  " },
  { caseName: "ablative", label: "Ablative  __→" },
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
const caseValueColumnMinWidth = 20
const verbNegativeColumnMinWidth =
  verbPersonColumnWidth + negativeAuxiliaryWidth + negativeParticipleWidth + 8
const verbPolaritySplitMinWidth =
  verbPersonColumnWidth +
  verbAffirmativeColumnWidth +
  verbPolarityColumnGap +
  verbNegativeColumnMinWidth

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

export function InflectionTable({
  detail,
  contentWidth,
}: {
  detail: WordDetail
  contentWidth: number
}) {
  const inflections = detail.inflections ?? []
  const stackVerbPolarityColumns = contentWidth < verbPolaritySplitMinWidth

  if (inflections.length === 0) {
    return null
  }

  if (detail.partOfSpeech === "verb") {
    return <VerbInflections forms={inflections} stackPolarityColumns={stackVerbPolarityColumns} />
  }

  const isLearningCaseTable = detail.partOfSpeech === "noun" || detail.partOfSpeech === "adjective"
  const caseRows = isLearningCaseTable
    ? buildLearningCaseRows(inflections)
    : buildCaseRows(inflections)
  const otherRows = inflections.filter((form) => form.category !== "case")
  const leadingColumnWidth = caseRows.length > 0 ? getCaseColumnWidth(caseRows) : 12

  return (
    <box width="100%" flexDirection="column" gap={1}>
      <text>
        <strong>
          <span fg={homeScreenTheme.sectionHeaderText}>Inflections</span>
        </strong>
      </text>

      {caseRows.length > 0 ? <CaseTable rows={caseRows} contentWidth={contentWidth} /> : null}
      {otherRows.length > 0 ? <OtherForms forms={otherRows} leadingColumnWidth={leadingColumnWidth} /> : null}
      {caseRows.length === 0 && otherRows.length === 0 ? (
        <text>
          <span fg={homeScreenTheme.mutedText}>No inflections available.</span>
        </text>
      ) : null}
    </box>
  )
}

function VerbInflections({
  forms,
  stackPolarityColumns,
}: {
  forms: InflectionForm[]
  stackPolarityColumns: boolean
}) {
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
          <VerbPolaritySection
            title="Present"
            tags={coreVerbSections[0].tags}
            forms={forms}
            stackPolarityColumns={stackPolarityColumns}
          />
          <VerbPolaritySection
            title="Simple Past"
            tags={coreVerbSections[1].tags}
            forms={forms}
            stackPolarityColumns={stackPolarityColumns}
          />
          <VerbPolaritySection
            title="Present Perfect"
            tags={perfectVerbSections[0].tags}
            forms={forms}
            stackPolarityColumns={stackPolarityColumns}
          />
          <VerbPolaritySection
            title="Past Perfect"
            tags={perfectVerbSections[1].tags}
            forms={forms}
            stackPolarityColumns={stackPolarityColumns}
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
  stackPolarityColumns,
}: {
  title: string
  tags: readonly string[]
  forms: InflectionForm[]
  stackPolarityColumns: boolean
}) {
  return (
    <box width="100%" flexDirection="column">
      <text>
        <strong>{title}</strong>
      </text>
      <box
        width="100%"
        flexDirection={stackPolarityColumns ? "column" : "row"}
        gap={stackPolarityColumns ? 1 : verbPolarityColumnGap}
      >
        <VerbPolarityColumn
          label="Affirmative"
          fullWidth={stackPolarityColumns}
          width={
            stackPolarityColumns ? undefined : verbPersonColumnWidth + verbAffirmativeColumnWidth
          }
        >
          {renderVerbPersonRows((person) => (
            <box key={`${title}:affirmative:${person.pronoun}`} flexDirection="row" width="100%">
              <text width={verbPersonColumnWidth}>{person.pronoun}</text>
              <text width={verbAffirmativeColumnWidth}>
                {formatAffirmativeVerbValue(title, selectVerbValue(forms, tags, person))}
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
          </box>
        </VerbPolarityColumn>

        <VerbPolarityColumn
          label="Negative"
          fullWidth={stackPolarityColumns}
          minWidth={stackPolarityColumns ? undefined : verbNegativeColumnMinWidth}
        >
          {renderVerbPersonRows((person) => (
            <box key={`${title}:negative:${person.pronoun}`} flexDirection="row" width="100%">
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
            <text flexGrow={1}>
              {formatNegativeVerbValue(selectPassiveVerbValue(forms, tags, true))}
            </text>
          </box>
        </VerbPolarityColumn>
      </box>
    </box>
  )
}

function VerbPolarityColumn({
  label,
  children,
  fullWidth = false,
  minWidth,
  width,
}: {
  label: string
  children: React.ReactNode
  fullWidth?: boolean
  minWidth?: number
  width?: number
}) {
  return (
    <box
      width={fullWidth ? "100%" : width}
      minWidth={minWidth}
      flexDirection="column"
      flexGrow={fullWidth || width === undefined ? 1 : 0}
    >
      <box flexDirection="row" width="100%">
        <text width={verbPersonColumnWidth}> </text>
        <text flexGrow={1}>
          <span fg={homeScreenTheme.mutedText}>{label}</span>
        </text>
      </box>
      {children}
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

function CaseTable({ rows, contentWidth }: { rows: CaseTableRow[]; contentWidth: number }) {
  const visibleRows = rows.filter((row): row is CaseRow => row !== "spacer")
  const caseColumnWidth = getCaseColumnWidth(rows)
  const singularColumnWidth = Math.max(
    caseValueColumnMinWidth,
    "Singular".length + 1,
    ...visibleRows.map((row) => row.singular.length + 1),
  )
  const stackCaseColumns = contentWidth < caseColumnWidth + singularColumnWidth + caseValueColumnMinWidth + 1

  if (stackCaseColumns) {
    return (
      <box width="100%" flexDirection="column" gap={1}>
        <CaseValueTable rows={rows} caseColumnWidth={caseColumnWidth} label="Singular" valueKey="singular" />
        <CaseValueTable rows={rows} caseColumnWidth={caseColumnWidth} label="Plural" valueKey="plural" />
      </box>
    )
  }

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

function CaseValueTable({
  rows,
  caseColumnWidth,
  label,
  valueKey,
}: {
  rows: CaseTableRow[]
  caseColumnWidth: number
  label: string
  valueKey: "singular" | "plural"
}) {
  return (
    <box width="100%" flexDirection="column">
      <text>
        <span fg={homeScreenTheme.mutedText}>
          {padNoTruncate("Case", caseColumnWidth)} {label}
        </span>
      </text>
      {rows.map((row, index) =>
        row === "spacer" ? (
          <text key={`${valueKey}:spacer:${index}`}> </text>
        ) : (
          <text key={`${valueKey}:${row.name}`}>
            {padNoTruncate(row.name, caseColumnWidth)} {row[valueKey]}
          </text>
        ),
      )}
    </box>
  )
}

function OtherForms({
  forms,
  leadingColumnWidth,
}: {
  forms: InflectionForm[]
  leadingColumnWidth: number
}) {
  return (
    <box width="100%" flexDirection="column">
      <text>
        <span fg={homeScreenTheme.mutedText}>
          {padNoTruncate("Form", leadingColumnWidth)} Value
        </span>
      </text>
      {forms.map((form) => (
        <text key={`${form.label}:${form.value}`}>
          {padNoTruncate(form.label, leadingColumnWidth)} {form.value}
        </text>
      ))}
    </box>
  )
}

function getCaseColumnWidth(rows: CaseTableRow[]) {
  return Math.max(
    12,
    ...rows.filter((row): row is CaseRow => row !== "spacer").map((row) => row.name.length + 1),
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
