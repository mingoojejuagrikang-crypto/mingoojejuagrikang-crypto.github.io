import type { SurveyRecord } from '../types/survey'

export const sampleUtterances = [
  '조사나무 둘',
  '조사과실 3',
  '횡경 삼오점일',
  '종경 이이점사',
  '당도 영 점 오',
  '라벨 테스트 A-01',
  '비고 착색 양호',
]

export const sampleRecords: SurveyRecord[] = [
  {
    id: 'sample-1',
    timestamp: '2026-04-09T00:00:00.000Z',
    context: { treeNo: '2' },
    treeNo: '2',
    field: '조사나무',
    rawText: '조사나무 둘',
    normalizedText: '조사나무 2',
    valueText: '2',
    numericValue: 2,
    valueType: 'integer',
    parseSuccess: true,
  },
  {
    id: 'sample-2',
    timestamp: '2026-04-09T00:00:02.000Z',
    context: { treeNo: '2', fruitNo: '3' },
    treeNo: '2',
    fruitNo: '3',
    field: '조사과실',
    rawText: '조사과실 3',
    normalizedText: '조사과실 3',
    valueText: '3',
    numericValue: 3,
    valueType: 'integer',
    parseSuccess: true,
  },
]
