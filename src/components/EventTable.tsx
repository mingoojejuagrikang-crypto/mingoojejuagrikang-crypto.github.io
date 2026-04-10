import type { SurveyEvent } from '../types/survey'

type Props = {
  events: SurveyEvent[]
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('ko-KR', { hour12: false })
}

export function EventTable({ events }: Props) {
  return (
    <section className="card panel">
      <h2>최근 저장/실패 로그 (최대 20)</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>시간</th>
              <th>항목</th>
              <th>값</th>
              <th>원문</th>
              <th>성공</th>
              <th>사유</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-row">
                  아직 로그가 없습니다.
                </td>
              </tr>
            )}
            {events.map((event) => (
              <tr key={event.id}>
                <td>{formatTime(event.timestamp)}</td>
                <td>{event.field || '-'}</td>
                <td>{event.valueText || '-'}</td>
                <td>{event.rawText || '-'}</td>
                <td className={event.parseSuccess ? 'ok-text' : 'warn-text'}>
                  {event.parseSuccess ? '성공' : '실패'}
                </td>
                <td>{event.failureReason ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
