import { create } from 'zustand'
import { localStorageService } from '../services/storage/localStorageService'
import type { FailureLog, ParseResult, SurveyRecord } from '../types/survey'

type SurveyStore = {
  online: boolean
  micActive: boolean
  ttsEnabled: boolean
  ttsSpeaking: boolean
  sttSupported: boolean
  latestRawText: string
  latestNormalizedText: string
  latestParseResult: ParseResult | null
  records: SurveyRecord[]
  failures: FailureLog[]
  setOnline: (online: boolean) => void
  setMicActive: (active: boolean) => void
  setTtsEnabled: (enabled: boolean) => void
  setTtsSpeaking: (speaking: boolean) => void
  setSttSupported: (supported: boolean) => void
  setLatestParse: (rawText: string, parseResult: ParseResult) => void
  addRecord: (record: SurveyRecord) => void
  addFailure: (failure: FailureLog) => void
  clearAllLogs: () => void
}

const initialRecords = localStorageService.loadRecords()
const initialFailures = localStorageService.loadFailures()

export const useSurveyStore = create<SurveyStore>((set) => ({
  online: navigator.onLine,
  micActive: false,
  ttsEnabled: true,
  ttsSpeaking: false,
  sttSupported: true,
  latestRawText: '',
  latestNormalizedText: '',
  latestParseResult: null,
  records: initialRecords,
  failures: initialFailures,

  setOnline: (online) => set({ online }),
  setMicActive: (micActive) => set({ micActive }),
  setTtsEnabled: (ttsEnabled) => set({ ttsEnabled }),
  setTtsSpeaking: (ttsSpeaking) => set({ ttsSpeaking }),
  setSttSupported: (sttSupported) => set({ sttSupported }),

  setLatestParse: (latestRawText, parseResult) =>
    set({
      latestRawText,
      latestNormalizedText: parseResult.normalizedText,
      latestParseResult: parseResult,
    }),

  addRecord: (record) => {
    const next = localStorageService.appendRecord(record)
    set({ records: next })
  },

  addFailure: (failure) => {
    const next = localStorageService.appendFailure(failure)
    set({ failures: next })
  },

  clearAllLogs: () => {
    localStorageService.clearAll()
    set({
      records: [],
      failures: [],
      latestRawText: '',
      latestNormalizedText: '',
      latestParseResult: null,
    })
  },
}))
