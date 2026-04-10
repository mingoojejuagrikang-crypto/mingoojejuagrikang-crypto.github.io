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
  }
}

const TARGET_SAMPLE_RATE = 16000
const CHUNK_MS = 3200

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
  private readonly modelId: string
  private handlers: STTHandlers | null = null
  private shouldRun = false
  private stream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private audioContext: AudioContext | null = null
  private transcriber: WhisperPipeline | null = null
  private loadingPromise: Promise<WhisperPipeline> | null = null
  private queue: Promise<void> = Promise.resolve()

  constructor(modelId = 'onnx-community/whisper-tiny') {
    this.modelId = modelId
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
    this.shouldRun = true
    void this.warmUpModel()
    void this.startRecording()
    return true
  }

  stop(): void {
    this.shouldRun = false
    this.mediaRecorder?.stop()
    this.mediaRecorder = null
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop()
      }
    }
    this.stream = null
    this.handlers?.onStateChange?.('stopped')
  }

  private async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          channelCount: 1,
        },
      })
    } catch (error) {
      this.shouldRun = false
      this.handlers?.onStateChange?.('stopped')
      this.handlers?.onError?.(`마이크 권한 오류: ${String(error)}`)
      return
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : undefined
    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.stream, { mimeType })
      : new MediaRecorder(this.stream)

    this.mediaRecorder.ondataavailable = (event) => {
      if (!this.shouldRun || event.data.size === 0) return
      this.queue = this.queue
        .then(() => this.transcribeChunk(event.data))
        .catch((error) => {
          this.handlers?.onError?.(`Whisper 처리 오류: ${String(error)}`)
        })
    }

    this.mediaRecorder.onerror = (event: Event) => {
      this.handlers?.onError?.(`녹음기 오류: ${String(event)}`)
    }

    this.mediaRecorder.onstop = () => {
      if (!this.shouldRun) {
        return
      }
      this.handlers?.onStateChange?.('stopped')
    }

    this.mediaRecorder.start(CHUNK_MS)
    this.handlers?.onStateChange?.('listening')
  }

  private async warmUpModel(): Promise<WhisperPipeline> {
    if (this.transcriber) return this.transcriber
    if (this.loadingPromise) return this.loadingPromise

    this.handlers?.onInfo?.('Whisper 모델 로딩 중입니다. 최초 1회는 시간이 걸릴 수 있습니다.')

    this.loadingPromise = (async () => {
      const module = (await import(
        '@huggingface/transformers'
      )) as unknown as TransformersModule
      module.env.allowLocalModels = false

      const options: Record<string, unknown> = {
        progress_callback: () => undefined,
      }
      if ('gpu' in navigator) {
        options.device = 'webgpu'
      }

      const pipeline = await module.pipeline(
        'automatic-speech-recognition',
        this.modelId,
        options,
      )

      this.transcriber = pipeline
      this.handlers?.onInfo?.('Whisper 모델 로딩이 완료되었습니다.')
      return pipeline
    })()

    try {
      return await this.loadingPromise
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
