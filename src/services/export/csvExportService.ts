import type { FailureLog, SurveyRecord } from '../../types/survey'

function escapeCsvValue(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

function downloadCsv(filename: string, csvText: string): void {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.setAttribute('download', filename)
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportLogsToCsv(
  records: SurveyRecord[],
  failures: FailureLog[],
): void {
  const header = [
    'logType',
    'timestamp',
    'field',
    'valueText',
    'rawText',
    'normalizedText',
    'valueType',
    'numericValue',
    'parseSuccess',
    'failureReason',
    'failureDetail',
  ]

  const recordRows = records.map((record) => [
    'record',
    record.timestamp,
    record.field,
    record.valueText,
    record.rawText,
    record.normalizedText,
    record.valueType,
    record.numericValue?.toString() ?? '',
    'true',
    '',
    '',
  ])

  const failureRows = failures.map((failure) => [
    'failure',
    failure.timestamp,
    '',
    '',
    failure.rawText,
    failure.normalizedText,
    '',
    '',
    'false',
    failure.failureReason,
    failure.failureDetail ?? '',
  ])

  const allRows = [header, ...recordRows, ...failureRows]
  const csvText = allRows
    .map((row) => row.map((cell) => escapeCsvValue(String(cell))).join(','))
    .join('\n')

  const timestamp = new Date().toISOString().replaceAll(':', '-')
  downloadCsv(`citrus-survey-logs-${timestamp}.csv`, csvText)
}
