export type STTState = 'idle' | 'listening' | 'stopped'
export type STTEnginePreference = 'webspeech' | 'whisper'

export type STTHandlers = {
  onResult: (transcript: string) => void
  onError?: (errorMessage: string) => void
  onInfo?: (message: string) => void
  onStateChange?: (state: STTState) => void
}

export type STTEngine = 'whisper-web' | 'web-speech'

export interface SpeechToTextService {
  readonly engine: STTEngine
  isSupported(): boolean
  start(handlers: STTHandlers): boolean
  stop(): void
}
