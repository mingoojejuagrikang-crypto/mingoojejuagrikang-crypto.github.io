import type { ContextKey, FieldName, FieldSchema } from '../types/survey'

export const fieldSchemas: Record<FieldName, FieldSchema> = {
  조사나무: { field: '조사나무', valueKind: 'integer' },
  조사과실: { field: '조사과실', valueKind: 'integer' },
  횡경: { field: '횡경', valueKind: 'float' },
  종경: { field: '종경', valueKind: 'float' },
  비고: { field: '비고', valueKind: 'text' },
  과중: { field: '과중', valueKind: 'number' },
  과피중: { field: '과피중', valueKind: 'number' },
  과피두께x4: { field: '과피두께x4', valueKind: 'float' },
  과피두께: { field: '과피두께', valueKind: 'float' },
  당도: { field: '당도', valueKind: 'float' },
  적정: { field: '적정', valueKind: 'float' },
  산함량: { field: '산함량', valueKind: 'float' },
  당산도: { field: '당산도', valueKind: 'float' },
  착색: { field: '착색', valueKind: 'float' },
  비파괴: { field: '비파괴', valueKind: 'float' },
  조사일자: { field: '조사일자', valueKind: 'text' },
  기준일자: { field: '기준일자', valueKind: 'text' },
  농가명: { field: '농가명', valueKind: 'text' },
  라벨: { field: '라벨', valueKind: 'text' },
  처리: { field: '처리', valueKind: 'text' },
  처리구: { field: '처리구', valueKind: 'text' },
}

export const fieldToContextKey: Partial<Record<FieldName, ContextKey>> = {
  조사일자: 'surveyDate',
  기준일자: 'baseDate',
  농가명: 'farmName',
  라벨: 'label',
  처리: 'treatment',
  처리구: 'treatmentGroup',
  조사나무: 'treeNo',
  조사과실: 'fruitNo',
}
