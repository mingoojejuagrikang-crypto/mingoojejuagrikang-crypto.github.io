import { useEffect, useMemo, useRef, useState } from 'react'
import { ControlBar } from './components/ControlBar'
import { EventTable } from './components/EventTable'
import { LiveResultPanel } from './components/LiveResultPanel'
import { StatusHeader } from './components/StatusHeader'
import { fieldToContextKey } from './data/fieldSchemas'
import { sampleUtterances } from './data/testSamples'
import { parseSurveyInput } from './parser/parseSurveyInput'
import { exportLogsToCsv } from './services/export/csvExportService'
import { createSpeechToTextService } from './services/stt/createSpeechToTextService'
import type { SpeechToTextService, STTEngine } from './services/stt/types'
import { WebSpeechSynthesisService } from './services/tts/webSpeechSynthesisService'
import { useSurveyStore } from './store/useSurveyStore'
import type {
  ContextKey,
  FailureLog,
  ParseFailureReason,
  ParseResult,
  SurveyEvent,
  SurveyRecord,
} from './types/survey'

const DUPLICATE_BLOCK_MS = 1000

function applyContextValue(
  record: SurveyRecord,
  contextKey: ContextKey | undefined,
  value: string,
): void {
  if (!contextKey) return
  record.context[contextKey] = value
  record[contextKey] = value
}

function createFailureFromParse(parseResult: ParseResult): FailureLog {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    rawText: parseResult.rawText,
    normalizedText: parseResult.normalizedText,
    failureReason: (parseResult.failureReason ??
      'FIELD_NOT_FOUND') as ParseFailureReason,
    failureDetail: parseResult.failureDetail,
  }
}

export default function App() {
  const {
    online,
    micActive,
    ttsEnabled,
    ttsSpeaking,
    sttSupported,
    latestRawText,
    latestNormalizedText,
    latestParseResult,
    records,
    failures,
    setOnline,
    setMicActive,
    setTtsEnabled,
    setTtsSpeaking,
    setSttSupported,
    setLatestParse,
    addRecord,
    addFailure,
    clearAllLogs,
  } = useSurveyStore()

  const sttServiceRef = useRef<SpeechToTextService | null>(null)
  const sttEngineRef = useRef<STTEngine>('web-speech')
  const ttsServiceRef = useRef<WebSpeechSynthesisService | null>(null)
  const recentTranscriptRef = useRef<Map<string, number>>(new Map())
  const ttsSpeakingRef = useRef(false)
  const secureContextRef = useRef(window.isSecureContext)
  const standaloneRef = useRef(
    window.matchMedia?.('(display-mode: standalone)').matches ?? false,
  )
  const [sttInfo, setSttInfo] = useState('')

  if (!sttServiceRef.current) {
    sttServiceRef.current = createSpeechToTextService()
    sttEngineRef.current = sttServiceRef.current.engine
  }
  if (!ttsServiceRef.current) {
    ttsServiceRef.current = new WebSpeechSynthesisService()
  }

  useEffect(() => {
    ttsSpeakingRef.current = ttsSpeaking
  }, [ttsSpeaking])

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [setOnline])

  useEffect(() => {
    setSttSupported(sttServiceRef.current?.isSupported() ?? false)
  }, [setSttSupported])

  const recentEvents = useMemo<SurveyEvent[]>(() => {
    const successEvents = records.map<SurveyEvent>((record) => ({
      id: record.id,
      timestamp: record.timestamp,
      field: record.field,
      valueText: record.valueText,
      rawText: record.rawText,
      parseSuccess: true,
    }))
    const failureEvents = failures.map<SurveyEvent>((failure) => ({
      id: failure.id,
      timestamp: failure.timestamp,
      field: '',
      valueText: '',
      rawText: failure.rawText,
      parseSuccess: false,
      failureReason: `${failure.failureReason}${failure.failureDetail ? `: ${failure.failureDetail}` : ''}`,
    }))
    return [...successEvents, ...failureEvents]
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, 20)
  }, [records, failures])

  const speak = async (text: string): Promise<void> => {
    if (!ttsEnabled) return
    await ttsServiceRef.current?.speak(text, {
      dedupeMs: DUPLICATE_BLOCK_MS,
      onStart: () => setTtsSpeaking(true),
      onEnd: () => setTtsSpeaking(false),
    })
  }

  const isBlockedByRecentDuplicate = (rawText: string): boolean => {
    const key = rawText.replace(/\s+/g, '').trim()
    if (!key) return true
    const now = Date.now()
    const lastAt = recentTranscriptRef.current.get(key)
    recentTranscriptRef.current.set(key, now)

    for (const [phrase, ts] of recentTranscriptRef.current.entries()) {
      if (now - ts > 5_000) {
        recentTranscriptRef.current.delete(phrase)
      }
    }
    return typeof lastAt === 'number' && now - lastAt < DUPLICATE_BLOCK_MS
  }

  const onTranscript = (rawText: string): void => {
    if (ttsSpeakingRef.current) return
    if (isBlockedByRecentDuplicate(rawText)) return

    const parseResult = parseSurveyInput(rawText)
    setLatestParse(rawText, parseResult)

    if (!parseResult.parseSuccess || !parseResult.field || !parseResult.valueText) {
      addFailure(createFailureFromParse(parseResult))
      return
    }

    const record: SurveyRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      context: {},
      field: parseResult.field,
      rawText,
      normalizedText: parseResult.normalizedText,
      valueText: parseResult.valueText,
      numericValue: parseResult.numericValue,
      valueType: parseResult.valueType ?? 'text',
      parseSuccess: true,
    }

    applyContextValue(record, fieldToContextKey[parseResult.field], parseResult.valueText)
    addRecord(record)
    void speak(`${parseResult.field} ${parseResult.valueText}`)
  }

  const onSttError = (message: string): void => {
    const errorResult: ParseResult = {
      rawText: message,
      normalizedText: message,
      parseSuccess: false,
      failureReason: 'FIELD_NOT_FOUND',
      failureDetail: message,
    }
    setLatestParse('STT_ERROR', errorResult)
    addFailure(createFailureFromParse(errorResult))
  }

  const startMic = (): void => {
    if (!sttServiceRef.current?.isSupported()) {
      setSttSupported(false)
      return
    }

    const started = sttServiceRef.current.start({
      onResult: onTranscript,
      onError: onSttError,
      onInfo: (message) => setSttInfo(message),
      onStateChange: (state) => setMicActive(state === 'listening'),
    })
    if (!started) {
      setMicActive(false)
      return
    }

    void speak('음성 입력 시작')
  }

  const stopMic = (): void => {
    sttServiceRef.current?.stop()
    setMicActive(false)
    void speak('음성 입력 종료')
  }

  const onToggleMic = (): void => {
    if (micActive) {
      stopMic()
      return
    }
    startMic()
  }

  const onToggleTts = (): void => {
    const next = !ttsEnabled
    setTtsEnabled(next)
    if (!next) {
      ttsServiceRef.current?.stop()
      setTtsSpeaking(false)
    }
  }

  return (
    <main className="app-shell">
      <StatusHeader
        online={online}
        micActive={micActive}
        sttSupported={sttSupported}
        sttEngine={sttEngineRef.current}
        sttInfo={sttInfo}
        secureContext={secureContextRef.current}
        standaloneMode={standaloneRef.current}
      />
      <LiveResultPanel
        rawText={latestRawText}
        normalizedText={latestNormalizedText}
        parseResult={latestParseResult}
      />
      <EventTable events={recentEvents} />
      <ControlBar
        micActive={micActive}
        ttsEnabled={ttsEnabled}
        onToggleMic={onToggleMic}
        onToggleTts={onToggleTts}
        onClearLogs={clearAllLogs}
        onExportCsv={() => exportLogsToCsv(records, failures)}
      />
      <section className="card panel">
        <h2>테스트용 음성 문장 예시</h2>
        <ul className="samples">
          {sampleUtterances.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </section>
    </main>
  )
}
