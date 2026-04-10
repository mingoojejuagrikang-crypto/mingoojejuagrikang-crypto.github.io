import type { STTEnginePreference } from '../services/stt/types'

type Props = {
  micActive: boolean
  ttsEnabled: boolean
  sttPreference: STTEnginePreference
  onToggleMic: () => void
  onChangeSttPreference: (next: STTEnginePreference) => void
  onToggleTts: () => void
  onClearLogs: () => void
  onExportCsv: () => void
}

export function ControlBar({
  micActive,
  ttsEnabled,
  sttPreference,
  onToggleMic,
  onChangeSttPreference,
  onToggleTts,
  onClearLogs,
  onExportCsv,
}: Props) {
  return (
    <section className="card controls">
      <button className={`big-mic ${micActive ? 'stop' : 'start'}`} onClick={onToggleMic}>
        {micActive ? '마이크 종료' : '마이크 시작'}
      </button>
      <div className="engine-row">
        <span>인식 엔진</span>
        <select
          value={sttPreference}
          onChange={(event) =>
            onChangeSttPreference(event.target.value as STTEnginePreference)
          }
        >
          <option value="webspeech">WebSpeech (안정/저지연)</option>
          <option value="whisper">Whisper (고비용/상대 고정확)</option>
        </select>
      </div>
      <div className="control-row">
        <button onClick={onToggleTts}>TTS {ttsEnabled ? 'ON' : 'OFF'}</button>
        <button onClick={onClearLogs}>로그 초기화</button>
        <button onClick={onExportCsv}>CSV export</button>
      </div>
    </section>
  )
}
