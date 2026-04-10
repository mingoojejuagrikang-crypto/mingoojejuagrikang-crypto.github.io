import type { ParseResult } from '../types/survey'

type Props = {
  rawText: string
  normalizedText: string
  parseResult: ParseResult | null
}

export function LiveResultPanel({ rawText, normalizedText, parseResult }: Props) {
  return (
    <section className="card panel">
      <h2>실시간 인식/파싱</h2>
      <div className="kv">
        <span>최근 STT 원문</span>
        <strong>{rawText || '-'}</strong>
      </div>
      <div className="kv">
        <span>보정 후 텍스트</span>
        <strong>{normalizedText || '-'}</strong>
      </div>
      <div className="parse-box">
        <h3>파싱 결과</h3>
        <div className="parse-row">
          <span>항목</span>
          <strong>{parseResult?.field ?? '-'}</strong>
        </div>
        <div className="parse-row">
          <span>값</span>
          <strong>{parseResult?.valueText ?? '-'}</strong>
        </div>
        <div className="parse-row">
          <span>상태</span>
          <strong className={parseResult?.parseSuccess ? 'ok-text' : 'warn-text'}>
            {parseResult ? (parseResult.parseSuccess ? '성공' : '실패') : '-'}
          </strong>
        </div>
        {parseResult?.failureDetail && (
          <div className="parse-row">
            <span>실패 이유</span>
            <strong>{parseResult.failureDetail}</strong>
          </div>
        )}
      </div>
    </section>
  )
}
