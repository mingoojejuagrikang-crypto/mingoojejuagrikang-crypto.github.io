type Props = {
  online: boolean
  micActive: boolean
  sttSupported: boolean
  sttEngine: 'whisper-web' | 'web-speech'
  sttInfo: string
  secureContext: boolean
  standaloneMode: boolean
}

export function StatusHeader({
  online,
  micActive,
  sttSupported,
  sttEngine,
  sttInfo,
  secureContext,
  standaloneMode,
}: Props) {
  return (
    <header className="card header-card">
      <div>
        <h1>감귤 생육조사 PWA v1</h1>
        <p className="subtitle">음성 인식 기반 항목/값 단건 저장</p>
      </div>
      <div className="status-grid">
        <span className={`badge ${online ? 'ok' : 'warn'}`}>
          온라인: {online ? '연결됨' : '오프라인'}
        </span>
        <span className={`badge ${micActive ? 'ok' : 'muted'}`}>
          마이크: {micActive ? '수신 중' : '중지'}
        </span>
        <span className={`badge ${sttSupported ? 'ok' : 'warn'}`}>
          STT: {sttSupported ? '지원됨' : '미지원'}
        </span>
        <span className="badge">엔진: {sttEngine === 'whisper-web' ? 'Whisper' : 'WebSpeech'}</span>
        <span className={`badge ${secureContext ? 'ok' : 'warn'}`}>
          보안: {secureContext ? 'HTTPS' : '비보안'}
        </span>
        <span className={`badge ${standaloneMode ? 'ok' : 'muted'}`}>
          앱모드: {standaloneMode ? '설치 실행' : '브라우저'}
        </span>
      </div>
      {sttInfo && <p className="subtitle">{sttInfo}</p>}
    </header>
  )
}
