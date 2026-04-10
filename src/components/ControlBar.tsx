type Props = {
  micActive: boolean
  ttsEnabled: boolean
  onToggleMic: () => void
  onToggleTts: () => void
  onClearLogs: () => void
  onExportCsv: () => void
}

export function ControlBar({
  micActive,
  ttsEnabled,
  onToggleMic,
  onToggleTts,
  onClearLogs,
  onExportCsv,
}: Props) {
  return (
    <section className="card controls">
      <button className={`big-mic ${micActive ? 'stop' : 'start'}`} onClick={onToggleMic}>
        {micActive ? '마이크 종료' : '마이크 시작'}
      </button>
      <div className="control-row">
        <button onClick={onToggleTts}>TTS {ttsEnabled ? 'ON' : 'OFF'}</button>
        <button onClick={onClearLogs}>로그 초기화</button>
        <button onClick={onExportCsv}>CSV export</button>
      </div>
    </section>
  )
}
