export type ValueType = 'integer' | 'float' | 'text'

export type FieldValueKind = 'integer' | 'float' | 'number' | 'text'

export const FIELD_NAMES = [
  '조사나무',
  '조사과실',
  '횡경',
  '종경',
  '비고',
  '과중',
  '과피중',
  '과피두께x4',
  '과피두께',
  '당도',
  '적정',
  '산함량',
  '당산도',
  '착색',
  '비파괴',
  '조사일자',
  '기준일자',
  '농가명',
  '라벨',
  '처리',
  '처리구',
] as const

export type FieldName = (typeof FIELD_NAMES)[number]

export type ContextKey =
  | 'surveyDate'
  | 'baseDate'
  | 'farmName'
  | 'label'
  | 'treatment'
  | 'treatmentGroup'
  | 'treeNo'
  | 'fruitNo'

export type SurveyContext = Partial<Record<ContextKey, string>>

export type ParseFailureReason =
  | 'EMPTY_TRANSCRIPT'
  | 'FIELD_NOT_FOUND'
  | 'VALUE_NOT_FOUND'
  | 'NUMBER_PARSE_FAILED'
  | 'TYPE_MISMATCH'
  | 'UNSUPPORTED_FIELD'

export type ParseResult = {
  rawText: string
  normalizedText: string
  field?: FieldName
  valueText?: string
  numericValue?: number
  valueType?: ValueType
  parseSuccess: boolean
  failureReason?: ParseFailureReason
  failureDetail?: string
}

export type SurveyRecord = {
  id: string
  timestamp: string
  surveyDate?: string
  baseDate?: string
  farmName?: string
  label?: string
  treatment?: string
  treatmentGroup?: string
  treeNo?: string
  fruitNo?: string
  context: SurveyContext
  field: FieldName
  rawText: string
  normalizedText: string
  valueText: string
  numericValue?: number
  valueType: ValueType
  parseSuccess: boolean
  failureReason?: string
}

export type FailureLog = {
  id: string
  timestamp: string
  rawText: string
  normalizedText: string
  failureReason: ParseFailureReason
  failureDetail?: string
}

export type SurveyEvent = {
  id: string
  timestamp: string
  rawText: string
  field: string
  valueText: string
  parseSuccess: boolean
  failureReason?: string
}

export type FieldSchema = {
  field: FieldName
  valueKind: FieldValueKind
}
