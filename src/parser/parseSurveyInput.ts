import { fieldSchemas } from '../data/fieldSchemas'
import type { FieldValueKind, ParseResult, ValueType } from '../types/survey'
import { extractFieldAndValue, normalizeTranscriptText } from './aliasNormalizer'
import { detectNumberValueType, normalizeNumberText } from './numberNormalizer'

function isCompatibleValueType(
  valueKind: FieldValueKind,
  valueType: ValueType,
): boolean {
  if (valueKind === 'text') return valueType === 'text'
  if (valueKind === 'integer') return valueType === 'integer'
  if (valueKind === 'float') return valueType === 'integer' || valueType === 'float'
  if (valueKind === 'number') return valueType === 'integer' || valueType === 'float'
  return false
}

function failure(
  rawText: string,
  normalizedText: string,
  reason: ParseResult['failureReason'],
  detail?: string,
): ParseResult {
  return {
    rawText,
    normalizedText,
    parseSuccess: false,
    failureReason: reason,
    failureDetail: detail,
  }
}

export function parseSurveyInput(rawText: string): ParseResult {
  const normalizedText = normalizeTranscriptText(rawText)
  if (!normalizedText) {
    return failure(rawText, '', 'EMPTY_TRANSCRIPT', '인식된 음성이 없습니다.')
  }

  const extracted = extractFieldAndValue(normalizedText)
  if (!extracted) {
    return failure(
      rawText,
      normalizedText,
      'FIELD_NOT_FOUND',
      '항목 alias를 찾지 못했습니다.',
    )
  }

  const schema = fieldSchemas[extracted.field]
  if (!schema) {
    return failure(
      rawText,
      normalizedText,
      'UNSUPPORTED_FIELD',
      '지원하지 않는 항목입니다.',
    )
  }

  const valueRaw = extracted.valuePart.trim()
  if (!valueRaw) {
    return failure(
      rawText,
      extracted.field,
      'VALUE_NOT_FOUND',
      '항목 뒤에 값이 없습니다.',
    )
  }

  if (schema.valueKind === 'text') {
    return {
      rawText,
      normalizedText: `${extracted.field} ${valueRaw}`,
      field: extracted.field,
      valueText: valueRaw,
      valueType: 'text',
      parseSuccess: true,
    }
  }

  const normalizedNumber = normalizeNumberText(valueRaw)
  if (!normalizedNumber) {
    return failure(
      rawText,
      `${extracted.field} ${valueRaw}`,
      'NUMBER_PARSE_FAILED',
      '숫자 정규화 실패',
    )
  }

  const valueType = detectNumberValueType(normalizedNumber)
  if (!isCompatibleValueType(schema.valueKind, valueType)) {
    const typeLabel = schema.valueKind === 'integer' ? '정수' : '소수'
    return failure(
      rawText,
      `${extracted.field} ${normalizedNumber}`,
      'TYPE_MISMATCH',
      `${extracted.field} 항목은 ${typeLabel} 형식이어야 합니다.`,
    )
  }

  const numericValue = Number(normalizedNumber)
  if (Number.isNaN(numericValue)) {
    return failure(
      rawText,
      `${extracted.field} ${normalizedNumber}`,
      'NUMBER_PARSE_FAILED',
      '숫자 변환 실패',
    )
  }

  return {
    rawText,
    normalizedText: `${extracted.field} ${normalizedNumber}`,
    field: extracted.field,
    valueText: normalizedNumber,
    numericValue,
    valueType,
    parseSuccess: true,
  }
}
