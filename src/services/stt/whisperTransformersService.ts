import type { SpeechToTextService, STTHandlers } from './types'

type WhisperPipeline = ((
  audio: Float32Array,
  options?: Record<string, unknown>,
) => Promise<{ text?: string }>) & {
  dispose?: () => void
}

type TransformersModule = {
  pipeline: (
    task: string,
    model: string,
    options?: Record<string, unknown>,
  ) => Promise<WhisperPipeline>
  env: {
    allowLocalModels: boolean
    backends?: {
      onnx?: {
        wasm?: {
          numThreads?: number
          proxy?: boolean
        }
      }
    }
  }
}

const TARGET_SAMPLE_RATE = 16000
const CHUNK_MS = 3200
const RECORDER_RECOVER_DELAY_MS = 300

function isWhisperWebSupported(): boolean {
  return Boolean(
    window.isSecureContext &&
      window.MediaRecorder &&
      window.AudioContext &&
      navigator.mediaDevices?.getUserMedia,
  )
}

function toMonoChannel(audioBuffer: AudioBuffer): Float32Array {
  const { length, numberOfChannels } = audioBuffer
  if (numberOfChannels <= 1) {
    return Float32Array.from(audioBuffer.getChannelData(0))
  }

  const mono = new Float32Array(length)
  for (let channel = 0; channel < numberOfChannels; channel += 1) {
    const data = audioBuffer.getChannelData(channel)
    for (let i = 0; i < length; i += 1) {
      mono[i] += data[i]
    }
  }
  for (let i = 0; i < length; i += 1) {
    mono[i] /= numberOfChannels
  }
  return mono
}

function resampleLinear(
  source: Float32Array,
  sourceRate: number,
  targetRate: number,
): Float32Array {
  if (sourceRate === targetRate) {
    return Float32Array.from(source)
  }
  const ratio = sourceRate / targetRate
  const resultLength = Math.max(1, Math.round(source.length / ratio))
  const result = new Float32Array(resultLength)

  for (let i = 0; i < resultLength; i += 1) {
    const sourceIndex = i * ratio
    const lower = Math.floor(sourceIndex)
    const upper = Math.min(source.length - 1, lower + 1)
    const weight = sourceIndex - lower
    result[i] = source[lower] * (1 - weight) + source[upper] * weight
  }

  return result
}

export class WhisperTransformersService implements SpeechToTextService {
  readonly engine = 'whisper-web' as const
  private readonly modelCandidates: string[]
  private modelIndex = 0
  private handlers: STTHandlers | null = null
  private shouldRun = false
  private stream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private audioContext: AudioContext | null = null
  private transcriber: WhisperPipeline | null = null
  private loadingPromise: Promise<WhisperPipeline> | null = null
  private queue: Promise<void> = Promise.resolve()
  private recovering = false

  constructor(modelCandidates = ['onnx-community/whisper-base', 'onnx-community/whisper-tiny']) {
    this.modelCandidates = modelCandidates
  }

  isSupported(): boolean {
    return isWhisperWebSupported()
  }

  start(handlers: STTHandlers): boolean {
    if (!this.isSupported()) {
      handlers.onError?.(
        'Whisper(Web) 실행 불가: HTTPS + MediaRecorder 지원 브라우저가 필요합니다.',
      )
      return false
    }

    this.handlers = handlers
    if (this.shouldRun && this.mediaRecorder?.state === 'recording') {
      handlers.onStateChange?.('listening')
      return true
    }
    this.shouldRun = true
    this.recovering = false
    void this.warmUpModel()
    void this.startOrRecoverRecording()
    return true
  }

  stop(): void {
    this.shouldRun = false
    this.recovering = false
    this.mediaRecorder?.stop()
    this.mediaRecorder = null
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop()
      }
    }
    this.stream = null
    this.audioContext?.close().catch(() => undefined)
    this.audioContext = null
    this.modelIndex = 0
    this.handlers?.onStateChange?.('stopped')
  }

  private async startOrRecoverRecording(): Promise<void> {
    try {
      if (!this.stream || this.stream.getTracks().every((track) => track.readyState === 'ended')) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true,
            channelCount: 1,
          },
        })
      }
    } catch (error) {
      this.shouldRun = false
      this.handlers?.onStateChange?.('stopped')
      this.handlers?.onError?.(`마이크 권한 오류: ${String(error)}`)
      return
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : undefined
    const recorder = mimeType
      ? new MediaRecorder(this.stream, { mimeType })
      : new MediaRecorder(this.stream)
    this.mediaRecorder = recorder

    recorder.ondataavailable = (event) => {
      if (!this.shouldRun || event.data.size === 0) return
      this.queue = this.queue
        .then(() => this.transcribeChunk(event.data))
        .catch((error) => {
          this.handlers?.onError?.(`Whisper 처리 오류: ${String(error)}`)
        })
    }

    recorder.onerror = (event: Event) => {
      this.handlers?.onError?.(`녹음기 오류: ${String(event)}`)
      if (this.shouldRun) {
        this.recoverRecorder()
      }
    }

    recorder.onstop = () => {
      if (!this.shouldRun) {
        this.handlers?.onStateChange?.('stopped')
        return
      }
      this.recoverRecorder()
    }

    recorder.start(CHUNK_MS)
    this.handlers?.onStateChange?.('listening')
  }

  private recoverRecorder(): void {
    if (!this.shouldRun || this.recovering) return
    this.recovering = true
    this.handlers?.onInfo?.('STT 세션이 중단되어 자동 복구 중입니다.')
    setTimeout(() => {
      this.recovering = false
      if (!this.shouldRun) return
      void this.startOrRecoverRecording()
    }, RECORDER_RECOVER_DELAY_MS)
  }

  private async warmUpModel(): Promise<WhisperPipeline> {
    if (this.transcriber) return this.transcriber
    if (this.loadingPromise) return this.loadingPromise

    const activeModel = this.modelCandidates[this.modelIndex]
    this.handlers?.onInfo?.(
      `Whisper 모델 로딩 중: ${activeModel} (최초 1회는 시간이 걸릴 수 있습니다.)`,
    )

    this.loadingPromise = (async () => {
      const module = (await import(
        '@huggingface/transformers'
      )) as unknown as TransformersModule
      module.env.allowLocalModels = false
      if (module.env.backends?.onnx?.wasm) {
        // 모바일 안정성을 위해 단일 스레드/비프록시 모드 사용
        module.env.backends.onnx.wasm.numThreads = 1
        module.env.backends.onnx.wasm.proxy = false
      }

      const options: Record<string, unknown> = {
        progress_callback: () => undefined,
      }
      if ('gpu' in navigator) {
        options.device = 'webgpu'
      }

      const pipeline = await module.pipeline(
        'automatic-speech-recognition',
        activeModel,
        options,
      )

      this.transcriber = pipeline
      this.handlers?.onInfo?.(`Whisper 모델 로딩 완료: ${activeModel}`)
      return pipeline
    })()

    try {
      return await this.loadingPromise
    } catch (error) {
      const hasFallback = this.modelIndex < this.modelCandidates.length - 1
      if (hasFallback) {
        const failed = this.modelCandidates[this.modelIndex]
        this.modelIndex += 1
        this.transcriber = null
        this.handlers?.onError?.(
          `Whisper 모델 로딩 실패(${failed}). 경량 모델로 자동 전환합니다.`,
        )
        return this.warmUpModel()
      }
      this.handlers?.onError?.(`Whisper 모델 로딩 실패: ${String(error)}`)
      throw error
    } finally {
      this.loadingPromise = null
    }
  }

  private async transcribeChunk(blob: Blob): Promise<void> {
    if (!this.shouldRun) return
    const audio = await this.decodeBlobTo16kMono(blob)
    if (audio.length < TARGET_SAMPLE_RATE / 2) {
      return
    }

    const transcriber = await this.warmUpModel()
    if (!this.shouldRun) return

    const result = await transcriber(audio, {
      language: 'korean',
      task: 'transcribe',
      chunk_length_s: 20,
      stride_length_s: 3,
      return_timestamps: false,
    })
    const text = (result?.text ?? '').trim()
    if (text) {
      this.handlers?.onResult(text)
    }
  }

  private async decodeBlobTo16kMono(blob: Blob): Promise<Float32Array> {
    const arrayBuffer = await blob.arrayBuffer()
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
    const decoded = await this.audioContext.decodeAudioData(arrayBuffer.slice(0))
    const mono = toMonoChannel(decoded)
    return resampleLinear(mono, decoded.sampleRate, TARGET_SAMPLE_RATE)
  }
}
