import type { SpeechToTextService } from './types'
import { WebSpeechRecognitionService } from './webSpeechRecognitionService'
import { WhisperTransformersService } from './whisperTransformersService'

function isMobileRiskDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const ua = navigator.userAgent.toLowerCase()
  const isMobileUa =
    /android|iphone|ipad|ipod|mobile/.test(ua) || navigator.maxTouchPoints > 1
  const deviceMemory = nav.deviceMemory ?? 4
  const cores = navigator.hardwareConcurrency ?? 4
  return isMobileUa && (deviceMemory <= 6 || cores <= 8)
}

export function createSpeechToTextService(): SpeechToTextService {
  const query = new URLSearchParams(window.location.search)
  const forcedEngine = query.get('stt')
  if (forcedEngine === 'webspeech') {
    return new WebSpeechRecognitionService('ko-KR')
  }

  const mobileRisk = isMobileRiskDevice()
  if (mobileRisk && forcedEngine !== 'whisper') {
    return new WebSpeechRecognitionService('ko-KR')
  }

  const whisperModelCandidates = mobileRisk
    ? ['onnx-community/whisper-tiny']
    : ['onnx-community/whisper-base', 'onnx-community/whisper-tiny']
  const whisper = new WhisperTransformersService(whisperModelCandidates)
  if (whisper.isSupported()) {
    return whisper
  }

  return new WebSpeechRecognitionService('ko-KR')
}
