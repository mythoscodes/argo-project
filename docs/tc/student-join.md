# TC — 수강생 세션 참여

| 항목 | 값 |
|------|---|
| 라우트 | `/student/join` |
| 파일 | `src/app/student/join/page.tsx` |
| 역할 | 수강생 |
| 관련 기능 | F3 응답 수집 — 참여 진입점 |
| 주요 API | `POST /api/sessions/join` |
| Realtime 채널 | N/A |

> 6자리 참여 코드(`SESSION_CODE_LENGTH = 6`, `src/lib/constants.ts:13`)를 OTP 스타일 6개 인풋으로 입력. 자동 포커스 이동, 붙여넣기 지원, 완성 시 자동 제출.

## 1. UI 시나리오

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| SJN-UI-001 | 정상 참여 | `active` 세션 존재, 참여 코드 알고 있음 | 6자리 입력 (예: `ABC123`) | 자동 제출 → `/student/sessions/{id}`로 이동 | Must | ⬜ |
| SJN-UI-002 | 자동 포커스 이동 | — | 한 자리 입력 | 다음 인풋으로 자동 포커스 | Must | ⬜ |
| SJN-UI-003 | Backspace 역방향 | 2번째 자리 공란 | Backspace | 1번째 인풋으로 포커스 이동 | Should | ⬜ |
| SJN-UI-004 | 클립보드 붙여넣기 | 클립보드에 `ABC123` | 첫 인풋에 `Cmd+V` | 6개 인풋이 한 번에 채워지고 자동 제출 | Must | ⬜ |
| SJN-UI-005 | 소문자 자동 대문자화 | — | `abc123` 입력 | `ABC123`으로 표시·전송 | Should | ⬜ |
| SJN-UI-006 | 숫자만 입력 | — | `123456` | 정상 입력 | Must | ⬜ |
| SJN-UI-007 | 영문+숫자 혼합 | — | `A1B2C3` | 정상 입력 | Must | ⬜ |
| SJN-UI-008 | 특수문자 거부 | — | `!@#` 입력 | 입력창에 반영 안 됨 (`/^[0-9a-zA-Z]?$/` 정규식) | Should | ⬜ |
| SJN-UI-009 | 제출 버튼 비활성화 | 코드 < 6자리 | — | "참여하기" `disabled` | Must | ⬜ |
| SJN-UI-010 | 수동 제출 | 6자리 입력 완료 | "참여하기" 클릭 | 정상 제출 (자동 제출 실패 백업 경로) | Should | ⬜ |
| SJN-UI-011 | 최초 포커스 | 페이지 진입 | — | 첫 번째 인풋 `autoFocus` | Should | ⬜ |
| SJN-UI-012 | 제출 중 로딩 | 제출 진행 | — | 버튼 "참여 중..." + `disabled` | Should | ⬜ |
| SJN-UI-013 | 이모지 입력 거부 | — | 😀 붙여넣기 | 입력창에 반영 안 됨 (정규식 필터) | Should | ⬜ |
| SJN-UI-014 | 공백 문자 입력 거부 | — | 스페이스바 | 인풋에 반영 안 됨 | Must | ⬜ |
| SJN-UI-015 | 클립보드 7자 이상 | `ABCDEFG` 붙여넣기 | 첫 인풋 Paste | 앞 6자(`ABCDEF`)만 채워짐 | Should | ⬜ |
| SJN-UI-016 | 클립보드 4자 | `AB12` 붙여넣기 | 첫 인풋 Paste | 4개 인풋 채워짐, 5~6번째 공란, 제출 버튼 disabled | Should | ⬜ |
| SJN-UI-017 | Tab 키 순서 | — | Tab 반복 | 인풋 1→2→3→4→5→6→버튼 순 포커스 이동 | Must | ⬜ |
| SJN-UI-018 | ArrowLeft/Right 이동 | 3번째 인풋에 포커스 | ← / → | 좌/우 인풋으로 포커스 이동 | Could | ⬜ |
| SJN-UI-019 | 화면 제목 표시 | — | 진입 | "수업 참여" 또는 동등한 페이지 제목이 가시적으로 노출 | Should | ⬜ |
| SJN-UI-020 | 모바일 숫자 키패드 | 모바일 UA | 인풋 포커스 | `inputmode="text"` 또는 `"numeric"` 속성으로 키패드 자동 표시 | Could | ⬜ |
| SJN-UI-021 | 입력값 초기화 | 에러 응답 후 | — | 인풋 초기화 여부 정책 확인 (코드 유지 vs 초기화) | Should | ⬜ |
| SJN-UI-022 | 로딩 중 인풋 비활성화 | 제출 진행 | — | 6개 인풋 `disabled` 또는 포인터 이벤트 차단 | Should | ⬜ |
| SJN-UI-023 | Enter 키 제출 | 6자리 완성 후 | Enter | 제출 트리거 | Must | ⬜ |
| SJN-UI-024 | 전체 삭제 후 재입력 | 6자리 입력 후 | 모든 인풋 Backspace | 첫 번째 인풋으로 포커스 이동 후 재입력 가능 | Should | ⬜ |
| SJN-UI-025 | 한글 입력 거부 | — | `ㄱ`, `가` 입력 | 인풋에 반영 안 됨 | Should | ⬜ |

## 2. API 계약

| TC ID | 엔드포인트 | 요청 | 기대응답 | RLS/인가 | 우선순위 | 상태 |
|-------|-----------|------|---------|---------|---------|------|
| SJN-API-001 | `POST /api/sessions/join` | `{ joinCode: "ABC123" }` | `200 { data: { sessionId } }` + `session_participants` 레코드 생성 | 수강생 role 체크 | Must | ⬜ |
| SJN-API-002 | 잘못된 코드 | `{ joinCode: "XXXXXX" }` | `404` 또는 `400` + 에러 메시지 | — | Must | ⬜ |
| SJN-API-003 | draft 세션 참여 시도 | 대상 세션 status=draft | `400` "수업이 아직 시작되지 않았습니다" | — | Must | ⬜ |
| SJN-API-004 | 종료된 세션 | status=completed | `400` "종료된 수업입니다" 또는 허용(리포트 조회용) — 정책 확인 | Should | ⬜ |
| SJN-API-005 | 중복 참여 | 이미 `session_participants` 행 존재 | `200` 멱등 또는 `409` — 정책 확인 | Must | ⬜ |
| SJN-API-006 | 강사 role 참여 시도 | teacher 쿠키 | `403` (수강생 전용) | Should | ⬜ |
| SJN-API-007 | 공란 코드 | `{ joinCode: "" }` | `400` Zod 검증 | Must | ⬜ |
| SJN-API-008 | 미인증 요청 | 쿠키 없음 | `401` | Must | ⬜ |
| SJN-API-009 | owner role 참여 시도 | owner 쿠키 | `403` 또는 정책 확인 | Should | ⬜ |
| SJN-API-010 | mentor role 참여 시도 | mentor 쿠키 | `403` (수강생 전용) 또는 정책 확인 | Should | ⬜ |
| SJN-API-011 | 5자리 코드 | `{ joinCode: "ABCDE" }` | `400` Zod min length 검증 | Must | ⬜ |
| SJN-API-012 | 7자리 코드 | `{ joinCode: "ABCDEFG" }` | `400` Zod max length 검증 | Must | ⬜ |
| SJN-API-013 | 소문자 코드 | `{ joinCode: "abc123" }` | 서버가 대소문자 무감지 처리(toUpperCase) 또는 `404` — 정책 확인 | Should | ⬜ |
| SJN-API-014 | 타 학원 세션 코드 | 다른 academy 소속 active 세션 | 허용/차단 정책 확인 (RLS: join_code로 세션 조회 후 academy 필터 여부) | Must | ⬜ |
| SJN-API-015 | SQL injection 시도 | `{ joinCode: "'; DROP TABLE sessions;--" }` | Zod 정규식으로 차단 `400` | Must | ⬜ |
| SJN-API-016 | XSS 시도 | `{ joinCode: "<script>alert(1)</script>" }` | Zod 검증 `400` | Must | ⬜ |
| SJN-API-017 | 응답 JSON 구조 | 성공 | `{ data: { sessionId: string } }` 필드 존재 | Must | ⬜ |
| SJN-API-018 | 레이트 리밋 | 오류 코드로 20회 연속 | `429` 또는 서버 정책 — 현재 미구현 가능성 | Could | ⬜ |
| SJN-API-019 | NULL joinCode | `{ joinCode: null }` | `400` Zod 타입 검증 | Should | ⬜ |
| SJN-API-020 | 유니코드 코드 | `{ joinCode: "日本語A" }` | `400` | Should | ⬜ |
| SJN-API-021 | `sessionId` 응답 유효성 | 성공 응답 | 반환된 `sessionId`로 `GET /api/sessions/{id}` 호출 가능 | Must | ⬜ |
| SJN-API-022 | 한국어 에러 메시지 — 잘못된 코드 | `404` 응답 | 에러 메시지가 한국어로 명확하게 표시됨 | Should | ⬜ |
| SJN-API-023 | 한국어 에러 메시지 — draft 세션 | `400` 응답 | "아직 시작되지 않은 수업입니다" 또는 동등한 한국어 | Should | ⬜ |

## 3. Realtime

N/A

## 4. 에러 / 엣지

| TC ID | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|------|
| SJN-ERR-001 | 타 학원 세션 코드 | 허용/차단 정책 확인 | Should | ⬜ |
| SJN-ERR-002 | 만료된 세션 | `400` + 명확한 에러 | Should | ⬜ |
| SJN-ERR-003 | 네트워크 끊김 — offline | 에러 메시지 표시, 로딩 해제 | Should | ⬜ |
| SJN-ERR-004 | 5자리만 입력 후 수동 제출 | "참여 코드를 모두 입력해주세요." 에러 | Must | ⬜ |
| SJN-ERR-005 | 클립보드에 7자 이상 | 앞 6자만 사용 | Should | ⬜ |
| SJN-ERR-006 | 레이트 리밋 (무차별 시도) | 잘못된 코드 20회 → `429` 또는 차단 | Could | ⬜ |
| SJN-ERR-007 | 5xx 서버 에러 | 에러 메시지 표시, 재시도 버튼 또는 안내 | Should | ⬜ |
| SJN-ERR-008 | 네트워크 timeout | 요청 10초 이상 지연 | 로딩 해제 + 에러 메시지 "잠시 후 다시 시도해주세요" | Should | ⬜ |
| SJN-ERR-009 | 뒤로가기 후 재진입 | 브라우저 뒤로가기 → `/student/join` | 인풋 초기화 상태 (이전 코드 남지 않음) | Should | ⬜ |
| SJN-ERR-010 | 새로고침 후 상태 | 제출 중 새로고침 | 인풋 초기화, 로딩 없음 | Must | ⬜ |
| SJN-ERR-011 | ARIA — 인풋 라벨 | 스크린리더 | 각 인풋에 aria-label 또는 label 연결 ("코드 1번째 자리" 등) | Should | ⬜ |
| SJN-ERR-012 | ARIA — 에러 메시지 | 에러 발생 | `aria-live="polite"` 또는 `role="alert"`로 스크린리더 고지 | Should | ⬜ |
| SJN-ERR-013 | ARIA — 버튼 상태 | 버튼 disabled | `aria-disabled="true"` 속성 확인 | Should | ⬜ |
| SJN-ERR-014 | 키보드 전용 조작 | 마우스 없이 | Tab + 문자 입력 + Enter로 완전 조작 가능 | Must | ⬜ |
| SJN-ERR-015 | 포커스 가시성 | 키보드 포커스 시 | focus ring 가시적 (outline 제거 금지) | Should | ⬜ |
| SJN-ERR-016 | 미인증 상태 `/student/join` 접근 | 쿠키 없음 | `/login`으로 리다이렉트 (layout guard) | Must | ⬜ |
| SJN-ERR-017 | teacher role `/student/join` 접근 | teacher 쿠키 | `/instructor`로 리다이렉트 (layout guard) | Must | ⬜ |
| SJN-ERR-018 | owner role `/student/join` 접근 | owner 쿠키 | `/owner`로 리다이렉트 | Should | ⬜ |
| SJN-ERR-019 | mentor role `/student/join` 접근 | mentor 쿠키 | `/mentor`로 리다이렉트 | Should | ⬜ |
| SJN-ERR-020 | `data-testid` 셀렉터 | QA 자동화 | 주요 인풋에 `data-testid="join-input-{n}"`, 버튼에 `data-testid="join-submit"` 존재 | Must | ⬜ |
| SJN-ERR-021 | 429 응답 시 한국어 메시지 | rate limit | "잠시 후 다시 시도해주세요" 표시 | Could | ⬜ |
| SJN-ERR-022 | 세션 참여 후 뒤로가기 | 참여 완료 후 브라우저 뒤로가기 | `/student/join`으로 돌아오지 않고 `/student/sessions/{id}` 유지 (히스토리 replace 정책 확인) | Could | ⬜ |
| SJN-ERR-023 | 클립보드 특수문자 포함 | `A!B@C#` 붙여넣기 | 영숫자만 필터링 후 채워짐 또는 전체 거부 | Should | ⬜ |
| SJN-ERR-024 | 인풋 간 Backspace — 1번째에서 | 1번째 인풋에 포커스, 공란 | Backspace → 포커스 이동 없음 (이미 첫 칸) | Could | ⬜ |
| SJN-ERR-025 | 고대비 모드 | 브라우저 고대비 설정 | 에러 메시지·버튼 색상 대비율 WCAG AA 기준 충족 | Could | ⬜ |
