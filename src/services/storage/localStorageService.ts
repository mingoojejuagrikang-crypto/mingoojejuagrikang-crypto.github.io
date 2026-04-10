import type { FailureLog, SurveyRecord } from '../../types/survey'

const RECORDS_KEY = 'citrus-survey-records-v1'
const FAILURES_KEY = 'citrus-survey-failures-v1'

function readJson<T>(key: string, fallback: T): T {
  try {
    const text = window.localStorage.getItem(key)
    if (!text) return fallback
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, data: T): void {
  window.localStorage.setItem(key, JSON.stringify(data))
}

export const localStorageService = {
  loadRecords(): SurveyRecord[] {
    return readJson<SurveyRecord[]>(RECORDS_KEY, [])
  },

  loadFailures(): FailureLog[] {
    return readJson<FailureLog[]>(FAILURES_KEY, [])
  },

  appendRecord(record: SurveyRecord): SurveyRecord[] {
    const records = this.loadRecords()
    const next = [...records, record]
    writeJson(RECORDS_KEY, next)
    return next
  },

  appendFailure(failure: FailureLog): FailureLog[] {
    const failures = this.loadFailures()
    const next = [...failures, failure]
    writeJson(FAILURES_KEY, next)
    return next
  },

  clearAll(): void {
    window.localStorage.removeItem(RECORDS_KEY)
    window.localStorage.removeItem(FAILURES_KEY)
  },
}
