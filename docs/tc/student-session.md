# TC — 수강생 퀴즈 풀기

| 항목 | 값 |
|------|---|
| 라우트 | `/student/sessions/[id]` |
| 파일 | `src/app/student/sessions/[id]/page.tsx` |
| 역할 | 수강생 |
| 관련 기능 | F2 퀴즈 수신 / F3 응답 제출 |
| 주요 API | `GET /api/quizzes?sessionId`, `GET /api/responses?sessionId`, `POST /api/responses` |
| Realtime 채널 | `quizzes:{sessionId}` (INSERT), `session_status:{sessionId}` (UPDATE) |

> 퀴즈 카드 1개씩 순차 제시. 이미 응답한 퀴즈는 `myResponse`로 마킹, 첫 미응답 퀴즈로 자동 이동. 응답 시간(ms) 측정해서 서버 전송.

## 1. UI 시나리오

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| SSN-UI-001 | 대기 상태 | 강사가 아직 퀴즈 생성 안 함 | 진입 | `Clock` 펄스 아이콘 + "대기 중" + "강사가 퀴즈를 준비하고 있습니다..." | Must | ⬜ |
| SSN-UI-002 | 퀴즈 풀기 정상 | 퀴즈 3개 수신됨 | 1) 보기 선택 2) "제출" 클릭 | 다음 문제로 자동 이동, 진행 표시 갱신 `2/3` | Must | ⬜ |
| SSN-UI-003 | 보기 선택 토글 | — | 보기 A 클릭 → 보기 B 클릭 | B만 선택됨 (단일 선택) | Must | ⬜ |
| SSN-UI-004 | 모든 퀴즈 완료 | 3/3 응답 완료 | — | "모든 퀴즈 완료!" 화면 + "결과 확인하기" 버튼 + "다음 라운드 퀴즈가 오면 자동으로 표시됩니다" | Must | ⬜ |
| SSN-UI-005 | 세션 종료 감지 | 강사가 "수업 종료" 클릭 | — | 실시간 "수업이 종료되었습니다" 화면 전환 + "결과 확인하기" 버튼 | Must | ⬜ |
| SSN-UI-006 | 라운드 배지 | `round_number=2` 퀴즈 | — | "라운드 2" 배지 | Should | ⬜ |
| SSN-UI-007 | 코드 스니펫 렌더 | `code_snippet` 존재 | — | 다크 배경 `<pre>` + 언어 라벨 (`code_language ?? "code"`) | Should | ⬜ |
| SSN-UI-008 | 토픽 태그 | — | 카드 아래 | `topic_tag` 배지 노출 | Should | ⬜ |
| SSN-UI-009 | 이미 응답한 퀴즈 | 새로고침 | — | 선택지 `disabled`, 기존 선택 답변 하이라이트, "제출" 버튼 숨김 | Must | ⬜ |
| SSN-UI-010 | 자동 진행 — 첫 미응답 | 1번 응답됨, 2·3번 미응답 | 진입 | 2번 퀴즈로 자동 이동 | Must | ⬜ |
| SSN-UI-011 | 제출 중 로딩 | 제출 클릭 직후 | — | 버튼 "제출 중..." + Spinner + `disabled` | Should | ⬜ |
| SSN-UI-012 | 진행 표시 | 퀴즈 3개 중 2번째 | — | 우측 상단 `2 / 3` | Must | ⬜ |
| SSN-UI-013 | 선택 없이 제출 버튼 | 선택 안 함 | — | "제출" `disabled` | Must | ⬜ |
| SSN-UI-014 | 퀴즈 1개 | 퀴즈 1개만 있음 | 진입 | `1 / 1` 표시, 응답 후 "모든 퀴즈 완료" | Must | ⬜ |
| SSN-UI-015 | 퀴즈 5개 (최대) | `MAX_QUIZ_COUNT = 5` | — | 5개 모두 순서대로 렌더 | Must | ⬜ |
| SSN-UI-016 | 보기 4개 | `options.length = 4` | — | 4개 보기 버튼 렌더 | Must | ⬜ |
| SSN-UI-017 | 보기 2개 (true/false) | `question_type = "true_false"` | — | 참/거짓 2개 보기 | Must | ⬜ |
| SSN-UI-018 | 매우 긴 보기 텍스트 | 보기 200자 이상 | — | 텍스트 줄바꿈, 카드 넘침 없음 | Should | ⬜ |
| SSN-UI-019 | 매우 긴 질문 텍스트 | 질문 500자 이상 | — | 스크롤 또는 줄바꿈, 크래시 없음 | Should | ⬜ |
| SSN-UI-020 | 코드 스니펫 + 긴 코드 | 100줄 이상 코드 | — | `<pre>` 스크롤, 페이지 레이아웃 깨짐 없음 | Could | ⬜ |
| SSN-UI-021 | 완료 후 "결과 확인하기" | 모두 완료 | 버튼 클릭 | `/student/sessions/{id}/result`로 이동 | Must | ⬜ |
| SSN-UI-022 | 접근성 — 보기 버튼 | — | 키보드 Tab | 보기 버튼 간 Tab 이동, Enter로 선택 | Must | ⬜ |
| SSN-UI-023 | 접근성 — 제출 버튼 | 보기 선택 후 | Enter | 제출 트리거 | Must | ⬜ |
| SSN-UI-024 | `data-testid` — 퀴즈 카드 | — | — | `data-testid="quiz-card"`, `data-testid="option-{n}"`, `data-testid="submit-btn"` 존재 | Must | ⬜ |
| SSN-UI-025 | 이중 제출 방지 | "제출" 클릭 후 즉시 재클릭 | — | `isSubmitting` 가드로 2회 요청 방지 | Must | ⬜ |
| SSN-UI-026 | 완료 후 라운드 2 수신 | 라운드 1 완료, Realtime | 새 퀴즈 INSERT | 완료 화면에서 새 라운드 퀴즈 화면으로 자동 전환 | Must | ⬜ |
| SSN-UI-027 | 응답 시간 측정 | 퀴즈 표시 후 5초 후 제출 | — | `responseTimeMs ≈ 5000` (±500ms 허용) | Should | ⬜ |
| SSN-UI-028 | 퀴즈 이동 시 startTime 리셋 | 1번 → 2번 이동 | — | 2번 퀴즈의 응답 시간은 2번 표시 시점부터 측정 | Should | ⬜ |
| SSN-UI-029 | 세션 종료 후 결과 버튼 | Realtime completed | 버튼 클릭 | `/student/sessions/{id}/result` 이동 | Must | ⬜ |
| SSN-UI-030 | 페이지 타이틀 | — | 진입 | 브라우저 탭에 "퀴즈" 또는 세션 제목 표시 | Could | ⬜ |

## 2. API 계약

| TC ID | 엔드포인트 | 요청 | 기대응답 | RLS/인가 | 우선순위 | 상태 |
|-------|-----------|------|---------|---------|---------|------|
| SSN-API-001 | `POST /api/responses` | `{ quizId, sessionId, selectedAnswer, responseTimeMs }` | `201 { data: ResponseRow }` | 본인 응답만 insert, 세션 참여자 확인 | Must | ⬜ |
| SSN-API-002 | `GET /api/quizzes?sessionId` | 수강생 쿠키 | `200 { data: QuizRow[] }` — 본인이 참여한 세션의 퀴즈만 | RLS | Must | ⬜ |
| SSN-API-003 | `GET /api/responses?sessionId` | — | `200 { data: ResponseRow[] }` — **본인 응답만** | RLS | Must | ⬜ |
| SSN-API-004 | 중복 응답 제출 | 같은 `quizId`로 재요청 | `409` 또는 멱등 (정책 확인) | Must | ⬜ |
| SSN-API-005 | `responseTimeMs` 저장 | — | DB에 ms 단위로 저장 | — | Should | ⬜ |
| SSN-API-006 | `selectedAnswer` Zod 검증 | 빈 문자열 | `400` | — | Must | ⬜ |
| SSN-API-007 | 타 세션 퀴즈에 응답 시도 | `quizId`가 미참여 세션 소속 | `403` 또는 `404` | Must | ⬜ |
| SSN-API-008 | 미인증 응답 제출 | 쿠키 없음 | `401` | Must | ⬜ |
| SSN-API-009 | teacher role 응답 제출 | teacher 쿠키 | `403` (수강생 전용) | Should | ⬜ |
| SSN-API-010 | `responseTimeMs` 음수 | `{ responseTimeMs: -100 }` | `400` Zod 검증 또는 0으로 강제 | Should | ⬜ |
| SSN-API-011 | `responseTimeMs` 매우 큰 값 | 999999999 | 저장 허용 또는 임계값 cap — 정책 확인 | Could | ⬜ |
| SSN-API-012 | `selectedAnswer` XSS | `"<script>alert(1)</script>"` | Zod 검증 또는 DB 저장 후 React escape | Must | ⬜ |
| SSN-API-013 | `selectedAnswer` SQL injection | `"'; DROP TABLE responses;--"` | Supabase 파라미터 바인딩으로 차단 | Must | ⬜ |
| SSN-API-014 | 타 수강생 응답 조회 | A 수강생이 B의 `sessionId`로 GET | 본인 응답만 반환 (RLS) | Must | ⬜ |
| SSN-API-015 | 타 학원 세션 퀴즈 조회 | 다른 academy 세션 ID | 빈 배열 (RLS 격리) | Must | ⬜ |
| SSN-API-016 | `quizId` UUID 아닌 값 | `{ quizId: "not-uuid" }` | `400` Zod UUID 검증 | Should | ⬜ |
| SSN-API-017 | 한국어 에러 — 중복 응답 | `409` | "이미 응답하셨습니다" 또는 동등한 한국어 | Should | ⬜ |
| SSN-API-018 | 한국어 에러 — 미인증 | `401` | "로그인이 필요합니다" | Should | ⬜ |
| SSN-API-019 | 응답 후 UI 반영 | POST 성공 | `myResponse` 상태 즉시 반영, 다음 퀴즈 이동 | Must | ⬜ |
| SSN-API-020 | NULL selectedAnswer | `{ selectedAnswer: null }` | `400` | Should | ⬜ |
| SSN-API-021 | 매우 긴 selectedAnswer | 1000자 | `400` 또는 DB max length — 정책 확인 | Could | ⬜ |
| SSN-API-022 | 5xx 서버 에러 — 응답 제출 | 서버 오류 | 에러 메시지 표시, 재제출 가능 상태 유지 | Should | ⬜ |
| SSN-API-023 | 429 rate limit — 연속 제출 | 빠른 연속 요청 | `429` 응답 또는 정책 확인 | Could | ⬜ |
| SSN-API-024 | `round_number` 저장 | 라운드 2 퀴즈 응답 | `round_number = 2` 정확히 저장 | Should | ⬜ |
| SSN-API-025 | 세션 종료 후 응답 제출 | status=completed 세션 | `400` 또는 저장 허용 — 정책 확인 | Should | ⬜ |

## 3. Realtime

| TC ID | 채널/이벤트 | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|------------|---------|---------|---------|------|
| SSN-RT-001 | `quizzes:{sessionId}` INSERT | 강사가 새 퀴즈 생성 | `loadQuizzes()` 재호출 → 새 퀴즈 리스트 반영, 대기 화면에서 문제 화면으로 전환 | Must | ⬜ |
| SSN-RT-002 | `quizzes:{sessionId}` 라운드 2 | 강사 재퀴즈 | 모두 완료 화면에서 새 라운드 퀴즈 자동 수신 | Must | ⬜ |
| SSN-RT-003 | `session_status:{sessionId}` UPDATE→completed | 강사 "수업 종료" | `sessionStatus = "completed"` state → "수업이 종료되었습니다" 화면 | Must | ⬜ |
| SSN-RT-004 | 채널 언서브스크라이브 | 페이지 이탈 | 두 채널 모두 `unsubscribe()` 호출 | Must | ⬜ |
| SSN-RT-005 | 네트워크 단절 후 복구 | — | Supabase Realtime 자동 재연결, 이벤트 누락 시 `loadQuizzes()`로 복구 | Should | ⬜ |
| SSN-RT-006 | 이벤트 순서 역전 | 두 퀴즈가 거의 동시 INSERT | 두 퀴즈 모두 수신, 순서대로 렌더 (중복 없음) | Should | ⬜ |
| SSN-RT-007 | CHANNEL_ERROR 처리 | 채널 에러 발생 | `isConnected = false` 상태 표시, 에러 고지 (silent failure 금지) | Should | ⬜ |
| SSN-RT-008 | TIMED_OUT 처리 | 채널 타임아웃 | 재연결 시도 또는 에러 상태 표시 | Should | ⬜ |
| SSN-RT-009 | 동일 이벤트 중복 수신 | INSERT 이벤트 2회 발생 | `id` 중복 체크로 리스트에 1회만 추가 | Must | ⬜ |
| SSN-RT-010 | 장시간 대기 (1시간 이상) | 세션 연결 유지 | Realtime 구독 유지 또는 재연결 후 정상 수신 | Could | ⬜ |
| SSN-RT-011 | 채널 연결 상태 표시 | SUBSCRIBED | 연결 상태 표시 (isConnected=true) | Should | ⬜ |
| SSN-RT-012 | 페이지 포커스 복귀 후 | 탭 전환 후 복귀 | 대기 중 이벤트 누락 없음, 또는 `loadQuizzes()` 재호출로 복구 | Could | ⬜ |
| SSN-RT-013 | 여러 학생 동시 접속 | 50명 동시 Realtime 구독 | 각 학생이 정상 퀴즈 수신 (서버 부하 테스트) | Could | ⬜ |
| SSN-RT-014 | 세션 status UPDATE — draft→active | 강사가 세션 활성화 | 대기 중 수강생에게 퀴즈 준비 알림 가능 — 현재 구현 여부 확인 | Could | ⬜ |
| SSN-RT-015 | 두 채널 동시 구독 정리 | 컴포넌트 unmount | `channel1.unsubscribe()`, `channel2.unsubscribe()` 모두 호출 (메모리 누수 방지) | Must | ⬜ |

## 4. 에러 / 엣지

| TC ID | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|------|
| SSN-ERR-001 | 미참여 세션 URL 직접 접근 | `GET /api/quizzes` 빈 배열 → 대기 화면 유지 (또는 `/student/join` 리다이렉트 권장) | Should | ⬜ |
| SSN-ERR-002 | 제출 도중 강사가 수업 종료 | 응답 저장되나 Realtime UPDATE로 종료 화면 전환 | Should | ⬜ |
| SSN-ERR-003 | 네트워크 끊김 — 제출 실패 | **에러 토스트 표시 필요** (현재 silent failure 가능성) | Must | ⬜ |
| SSN-ERR-004 | `options` 배열 아님 | `options as string[]` 캐스팅 크래시 방지 가드 | Should | ⬜ |
| SSN-ERR-005 | 라운드 2 퀴즈 수신 시 자동 이동 | `loadQuizzes()` → 첫 미응답으로 자동 포커스 | Must | ⬜ |
| SSN-ERR-006 | `startTime` 리셋 타이밍 | 퀴즈 이동 시 `setStartTime(Date.now())` 정확한 응답 시간 측정 | Should | ⬜ |
| SSN-ERR-007 | 매우 빠른 연속 제출 | `isSubmitting`으로 더블클릭 방지 | Must | ⬜ |
| SSN-ERR-008 | draft 상태 세션 진입 | 대기 화면 유지 (quizzes 0건) | Should | ⬜ |
| SSN-ERR-009 | 뒤로가기 후 재진입 | 기존 응답 상태 복구 (완료한 퀴즈 disabled, 미완료 퀴즈 활성) | Should | ⬜ |
| SSN-ERR-010 | 새로고침 후 상태 복구 | `GET /api/responses` 재조회로 기응답 퀴즈 복구 | Must | ⬜ |
| SSN-ERR-011 | 미인증 접근 | layout guard → `/login` 리다이렉트 | Must | ⬜ |
| SSN-ERR-012 | teacher role 접근 | layout guard → `/instructor` 리다이렉트 | Must | ⬜ |
| SSN-ERR-013 | `GET /api/quizzes` 실패 | 500 응답 | 에러 메시지 표시, 대기 화면 유지 (silent failure 금지) | Should | ⬜ |
| SSN-ERR-014 | `GET /api/responses` 실패 | 500 응답 | 에러 메시지 표시 또는 빈 응답 상태로 진행 | Should | ⬜ |
| SSN-ERR-015 | 5xx 서버 에러 — 응답 제출 | 에러 메시지 표시, 재제출 가능 | Should | ⬜ |
| SSN-ERR-016 | 타 학원 세션 URL 직접 접근 | RLS로 빈 퀴즈 반환 → 대기 화면 | Must | ⬜ |
| SSN-ERR-017 | 타 수강생 응답 조회 불가 | RLS 격리로 본인 응답만 반환 | Must | ⬜ |
| SSN-ERR-018 | `data-testid` 셀렉터 | `data-testid="quiz-card"`, `data-testid="option-{n}"`, `data-testid="submit-btn"` 존재 | Must | ⬜ |
| SSN-ERR-019 | ARIA — 퀴즈 카드 | role="region" aria-label="퀴즈 {n}" | Should | ⬜ |
| SSN-ERR-020 | ARIA — 선택된 보기 | aria-pressed="true" 또는 aria-selected | Should | ⬜ |
| SSN-ERR-021 | 접근성 — 키보드만으로 완전 풀이 | Tab + Enter만으로 퀴즈 완료 가능 | Must | ⬜ |
| SSN-ERR-022 | `options` 빈 배열 | DB 이상 | 빈 카드 또는 에러 메시지 (크래시 없음) | Could | ⬜ |
| SSN-ERR-023 | 매우 많은 퀴즈 (20개 이상) | API가 20개 이상 반환 | 스크롤 또는 페이지네이션, 크래시 없음 | Could | ⬜ |
| SSN-ERR-024 | 한국어 에러 — 네트워크 실패 | "네트워크 오류가 발생했습니다" 한국어 표시 | Should | ⬜ |
