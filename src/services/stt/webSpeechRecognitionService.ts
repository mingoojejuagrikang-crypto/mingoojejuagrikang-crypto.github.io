export type STTState = 'idle' | 'listening' | 'stopped'

export type STTHandlers = {
  onResult: (transcript: string) => void
  onError?: (errorMessage: string) => void
  onStateChange?: (state: STTState) => void
}

type RecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => RecognitionLike
  webkitSpeechRecognition?: new () => RecognitionLike
}

export class WebSpeechRecognitionService {
  private recognition: RecognitionLike | null = null
  private shouldRun = false
  private handlers: STTHandlers | null = null
  private readonly lang: string

  constructor(lang = 'ko-KR') {
    this.lang = lang
  }

  isSupported(): boolean {
    const win = window as SpeechWindow
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition)
  }

  start(handlers: STTHandlers): boolean {
    if (!this.isSupported()) {
      handlers.onError?.('이 브라우저는 STT(Web Speech API)를 지원하지 않습니다.')
      return false
    }

    if (!window.isSecureContext) {
      handlers.onError?.('모바일 STT는 HTTPS(보안 컨텍스트)에서 실행해야 합니다.')
      return false
    }

    this.handlers = handlers
    this.shouldRun = true
    this.ensureRecognition()
    if (!this.recognition) {
      handlers.onError?.('STT 인스턴스 생성에 실패했습니다.')
      return false
    }

    try {
      this.recognition.start()
      return true
    } catch (error) {
      const message = String(error)
      if (message.toLowerCase().includes('already started')) {
        handlers.onStateChange?.('listening')
        return true
      }
      this.shouldRun = false
      handlers.onError?.(`STT 시작 실패: ${message}`)
      return false
    }
  }

  stop(): void {
    this.shouldRun = false
    this.recognition?.stop()
    this.handlers?.onStateChange?.('stopped')
  }

  private ensureRecognition(): void {
    if (this.recognition) return

    const win = window as SpeechWindow
    const RecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!RecognitionCtor) return

    const recognition = new RecognitionCtor()
    recognition.lang = this.lang
    recognition.continuous = true
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => {
      this.handlers?.onStateChange?.('listening')
    }

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (!result?.isFinal) continue
        const transcript = result[0]?.transcript?.trim()
        if (transcript) {
          this.handlers?.onResult(transcript)
        }
      }
    }

    recognition.onerror = (event: any) => {
      const errorMessage = event?.error ? `STT 오류: ${event.error}` : 'STT 오류'
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        this.shouldRun = false
        this.handlers?.onStateChange?.('stopped')
      }
      this.handlers?.onError?.(errorMessage)
    }

    recognition.onend = () => {
      if (!this.shouldRun) {
        this.handlers?.onStateChange?.('stopped')
        return
      }

      // 모바일 환경에서 중간 종료가 자주 발생해 자동 재시작한다.
      setTimeout(() => {
        if (!this.shouldRun) return
        try {
          recognition.start()
        } catch (error) {
          const message = String(error)
          if (!message.toLowerCase().includes('already started')) {
            this.handlers?.onError?.(`STT 재시작 실패: ${message}`)
          }
        }
      }, 250)
    }

    this.recognition = recognition
  }
}
