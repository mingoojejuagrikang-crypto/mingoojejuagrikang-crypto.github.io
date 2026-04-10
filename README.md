# 감귤 생육조사 PWA v1

음성 인식(STT)으로 `항목 + 값`을 파싱하고, 즉시 로컬 저장 + 화면 반영 + TTS 피드백을 수행하는 최소 기능 PWA입니다.

## 설치

```bash
npm install
npm install zustand vite-plugin-pwa @huggingface/transformers --legacy-peer-deps
```

## 실행

```bash
npm run dev
```

- 개발 URL: `http://localhost:5173`
- 빌드 검증: `npm run build`

## v1 포함 기능

- 마이크 시작 시 TTS: `음성 입력 시작`
- 마이크 종료 시 TTS: `음성 입력 종료`
- STT 원문 수신 후 alias 보정 + 숫자 정규화 + 항목/값 분리 + 타입 검증
- 성공 시 즉시 localStorage 저장 및 UI 반영
- 성공 시 TTS: `항목명 + 값` (예: `횡경 35.1`)
- 실패 시 별도 실패 로그 저장 (원문/정규화문/실패 이유/시간)
- CSV export (성공 + 실패 로그 포함)
- TTS/STT 충돌 방지
  - TTS 재생 중 STT 입력 무시
  - 최근 1초 동일 문구 중복 처리 차단
- STT 엔진 선택
  - 기본: WebSpeech(모바일 단독 안정 모드)
  - 선택: Whisper(Web, 데스크톱 `whisper-base`, 모바일 `whisper-tiny`)
  - 세션 중단 시 자동 복구(종료 버튼 전까지 listening 유지)

## Whisper 사용 주의

- 최초 1회 모델 다운로드가 필요해서 시작까지 시간이 걸릴 수 있습니다.
- 모바일에서 `HTTPS + 최신 Chrome` 조합이 가장 안정적입니다.
- 기기 성능이 낮으면 처리 지연이 있을 수 있습니다.
- 모바일은 기본 엔진이 `WebSpeech`로 시작됩니다.
- 화면에서 엔진을 직접 변경할 수 있습니다.
- Whisper 강제 테스트: URL 뒤에 `?stt=whisper` 추가
- WebSpeech 강제 테스트: URL 뒤에 `?stt=webspeech` 추가

## 테스트 문장 예시

- `조사나무 둘`
- `조사과실 3`
- `횡경 삼오점일`
- `종경 이이점사`
- `당도 영 점 오`
- `라벨 테스트 A-01`
- `비고 착색 양호`

## 모바일 실기기 테스트 주의사항

- Chrome Android 권장 (`https` 또는 `localhost` 환경)
- iOS Safari는 `webkitSpeechRecognition` 지원이 제한적이라 STT가 동작하지 않을 수 있음
- 블루투스 이어폰 마이크를 사용할 경우 브라우저 마이크 권한을 다시 확인
- PWA 설치 후에도 최초 1회는 브라우저 탭에서 권한 승인 후 재실행 권장

## 폰 단독 사용(노트북 없이) 조건

- 로컬 개발 서버(`http://192.168.x.x:5173`)로 설치한 앱은 노트북이 꺼지면 접속 원본이 사라집니다.
- 폰 단독 사용을 위해서는 **고정 HTTPS 주소로 배포**해야 합니다.
- STT는 보안 컨텍스트(HTTPS)에서만 안정적으로 동작합니다.

권장 절차:

1. `npm run sync:pages`
2. `git add -A && git commit -m "deploy update" && git push`
3. `https://mingoojejuagrikang-crypto.github.io/`에서 반영 확인
4. 폰에서 홈 화면에 추가 후 설치 앱으로 실행

참고:
- Pages 배포 산출물은 `docs/` 폴더에 생성됩니다.

## 주요 코드 위치

- 앱 진입: `src/App.tsx`
- 파서: `src/parser/*`
- alias/스키마: `src/data/fieldAliases.ts`, `src/data/fieldSchemas.ts`
- STT/TTS: `src/services/stt/*`, `src/services/tts/*`
- 저장/CSV: `src/services/storage/*`, `src/services/export/*`
- 상태관리: `src/store/useSurveyStore.ts`
- PWA 설정: `vite.config.ts`
