import type { SpeechToTextService, STTEnginePreference } from './types'
import { WebSpeechRecognitionService } from './webSpeechRecognitionService'
import { WhisperTransformersService } from './whisperTransformersService'

const STT_ENGINE_STORAGE_KEY = 'citrus-survey-stt-engine-v1'

function isMobileDevice(): boolean {
  const ua = navigator.userAgent.toLowerCase()
  return /android|iphone|ipad|ipod|mobile/.test(ua) || navigator.maxTouchPoints > 1
}

function parseEnginePreference(raw: string | null): STTEnginePreference | null {
  if (raw === 'webspeech' || raw === 'whisper') return raw
  return null
}

export function getSttEnginePreference(): STTEnginePreference {
  const query = new URLSearchParams(window.location.search)
  const fromQuery = parseEnginePreference(query.get('stt'))
  if (fromQuery) return fromQuery

  const fromStorage = parseEnginePreference(window.localStorage.getItem(STT_ENGINE_STORAGE_KEY))
  if (fromStorage) return fromStorage

  // 모바일 단독 사용 안정성을 위해 기본값은 WebSpeech.
  if (isMobileDevice()) {
    return 'webspeech'
  }

  return 'whisper'
}

export function setSttEnginePreference(preference: STTEnginePreference): void {
  window.localStorage.setItem(STT_ENGINE_STORAGE_KEY, preference)
}

export function createSpeechToTextService(
  preference: STTEnginePreference = getSttEnginePreference(),
): SpeechToTextService {
  if (preference === 'webspeech') {
    return new WebSpeechRecognitionService('ko-KR')
  }

  const whisperModelCandidates = isMobileDevice()
    ? ['onnx-community/whisper-tiny']
    : ['onnx-community/whisper-base', 'onnx-community/whisper-tiny']
  const whisper = new WhisperTransformersService(whisperModelCandidates)
  if (whisper.isSupported()) {
    return whisper
  }

  return new WebSpeechRecognitionService('ko-KR')
}
