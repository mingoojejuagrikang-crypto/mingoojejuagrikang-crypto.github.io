export type TTSSpeakOptions = {
  dedupeMs?: number
  onStart?: () => void
  onEnd?: () => void
}

export class WebSpeechSynthesisService {
  private readonly synthesis: SpeechSynthesis | null
  private lastSpokenText = ''
  private lastSpokenAt = 0

  constructor() {
    this.synthesis = 'speechSynthesis' in window ? window.speechSynthesis : null
  }

  isSupported(): boolean {
    return (
      this.synthesis !== null &&
      typeof window.SpeechSynthesisUtterance !== 'undefined'
    )
  }

  stop(): void {
    this.synthesis?.cancel()
  }

  speak(text: string, options: TTSSpeakOptions = {}): Promise<boolean> {
    const synthesis = this.synthesis
    if (!this.isSupported() || !synthesis) {
      return Promise.resolve(false)
    }

    const utteranceText = text.trim()
    if (!utteranceText) return Promise.resolve(false)

    const now = Date.now()
    const dedupeMs = options.dedupeMs ?? 1000
    if (
      this.lastSpokenText === utteranceText &&
      now - this.lastSpokenAt <= dedupeMs
    ) {
      return Promise.resolve(false)
    }
    this.lastSpokenText = utteranceText
    this.lastSpokenAt = now

    synthesis.cancel()

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(utteranceText)
      utterance.lang = 'ko-KR'
      utterance.rate = 1.05
      utterance.pitch = 1

      utterance.onstart = () => {
        options.onStart?.()
      }

      utterance.onend = () => {
        options.onEnd?.()
        resolve(true)
      }

      utterance.onerror = () => {
        options.onEnd?.()
        resolve(false)
      }

      synthesis.speak(utterance)
    })
  }
}
