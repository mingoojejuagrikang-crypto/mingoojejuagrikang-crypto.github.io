import { fieldAliases } from '../data/fieldAliases'
import type { FieldName } from '../types/survey'

type AliasEntry = {
  field: FieldName
  alias: string
  regex: RegExp
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function compact(text: string): string {
  return text.replace(/\s+/g, '')
}

function createPrefixRegex(alias: string): RegExp {
  const aliasChars = compact(alias).split('').map(escapeRegExp).join('\\s*')
  return new RegExp(`^${aliasChars}(.*)$`)
}

const aliasEntries: AliasEntry[] = Object.entries(fieldAliases)
  .flatMap(([field, aliases]) =>
    aliases.map((alias) => ({
      field: field as FieldName,
      alias,
      regex: createPrefixRegex(alias),
    })),
  )
  .sort((a, b) => compact(b.alias).length - compact(a.alias).length)

export function normalizeTranscriptText(rawText: string): string {
  return rawText
    .trim()
    .replace(/[“”"'`]/g, ' ')
    .replace(/[,:;]/g, ' ')
    .replace(/\s+/g, ' ')
}

export function extractFieldAndValue(normalizedText: string): {
  field: FieldName
  alias: string
  valuePart: string
} | null {
  const text = normalizedText.trim()
  if (!text) return null

  for (const entry of aliasEntries) {
    const match = entry.regex.exec(text)
    if (!match) continue

    const remainder = (match[1] ?? '')
      .trim()
      .replace(/^(값|값은|은|는|이|가|을|를)\s*/u, '')
      .trim()

    return {
      field: entry.field,
      alias: entry.alias,
      valuePart: remainder,
    }
  }

  return null
}
