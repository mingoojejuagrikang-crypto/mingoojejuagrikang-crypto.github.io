import type { SpeechToTextService } from './types'
import { WebSpeechRecognitionService } from './webSpeechRecognitionService'
import { WhisperTransformersService } from './whisperTransformersService'

export function createSpeechToTextService(): SpeechToTextService {
  const whisper = new WhisperTransformersService()
  if (whisper.isSupported()) {
    return whisper
  }

  return new WebSpeechRecognitionService('ko-KR')
}
