# TC — 수강생 퀴즈 결과

| 항목 | 값 |
|------|---|
| 라우트 | `/student/sessions/[id]/result` |
| 파일 | `src/app/student/sessions/[id]/result/page.tsx` |
| 역할 | 수강생 |
| 관련 기능 | F3 응답 수집 — 개인 결과 뷰 |
| 주요 API | `GET /api/quizzes?sessionId`, `GET /api/responses?sessionId` |
| Realtime 채널 | N/A |

> 문항별 정답/오답 비교, 총 정답률 트로피, 응답 시간(초). 수강생이 직접 답안과 정답을 대조해볼 수 있는 학습 피드백 화면.

---

## 1. UI 시나리오

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| SSR-UI-001 | 정상 결과 렌더 | 3문제 모두 응답 | 진입 | 트로피 카드 `N/3 정답률 X%` + 등급 배지 + 문항별 카드 | Must | ⬜ |
| SSR-UI-002 | 등급 — 우수 | 정답률 ≥ 80% | — | 노란 트로피 + "우수" success 배지 | Should | ⬜ |
| SSR-UI-003 | 등급 — 보통 | 60-80% | — | 파란 트로피 + "보통" warning 배지 | Should | ⬜ |
| SSR-UI-004 | 등급 — 복습 필요 | < 60% | — | 회색 트로피 + "복습 필요" destructive 배지 | Should | ⬜ |
| SSR-UI-005 | 정답 문항 표시 | `is_correct = true` | 문항 카드 | `CheckCircle2` 초록 아이콘, 정답 보기에 초록 배경 + 체크 | Must | ⬜ |
| SSR-UI-006 | 오답 문항 표시 | `is_correct = false` | 문항 카드 | `XCircle` 빨강 아이콘, 내 답변에 빨강 배경, 정답에 초록 배경 | Must | ⬜ |
| SSR-UI-007 | 응답 시간 표시 | `response_time_ms = 12300` | — | 우측 하단 "12.3초" | Should | ⬜ |
| SSR-UI-008 | `response_time_ms` null | — | — | 시간 섹션 미노출 | Should | ⬜ |
| SSR-UI-009 | 학습 리포트 이동 | — | "학습 리포트 보기" 클릭 | `/student/sessions/[id]/report`로 이동 | Must | ⬜ |
| SSR-UI-010 | 문항 토픽 배지 | — | — | `topic_tag` 배지 노출 | Should | ⬜ |
| SSR-UI-011 | 코드 스니펫 렌더 | `code_snippet` 존재 | — | 다크 `<pre>` 블록 | Should | ⬜ |
| SSR-UI-012 | 응답 0건 | `totalCount = 0` | 진입 | 트로피 카드 `0/0`, `scorePercent = 0` (NaN 방어) | Should | ⬜ |

---

## 2. API 계약

| TC ID | 엔드포인트 | 요청 | 기대응답 | RLS/인가 | 우선순위 | 상태 |
|-------|-----------|------|---------|---------|---------|------|
| SSR-API-001 | `GET /api/quizzes?sessionId` | 수강생 쿠키 | `200 { data: QuizRow[] }` | 본인 참여 세션의 퀴즈만 | Must | ⬜ |
| SSR-API-002 | `GET /api/responses?sessionId` | — | `200 { data: ResponseRow[] }` — **본인 응답만** (`is_correct` 포함) | RLS | Must | ⬜ |
| SSR-API-003 | 타 수강생 응답 격리 | A 수강생이 B의 응답 조회 | 빈 배열 반환 (RLS 격리) | Must | ⬜ |
| SSR-API-004 | 미참여 세션 | `sessionId` 미참여 | 빈 배열 | Should | ⬜ |

---

## 3. Realtime

N/A — 정적 결과 화면. 새 응답 반영은 없음.

---

## 4. 에러 / 엣지

| TC ID | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|------|
| SSR-ERR-001 | `quiz`가 `responses`에 매칭 안 됨 | 퀴즈 삭제됨 | `quiz?.question_text ?? ""` fallback, 크래시 없음 (단 UX 저하) | Should | ⬜ |
| SSR-ERR-002 | `options` 배열 아님 | DB 이상 | `quiz?.options ?? []`로 빈 배열 처리 | Should | ⬜ |
| SSR-ERR-003 | 네트워크 실패 | `fetch` 에러 | `results`가 `[]`로 유지, 로딩 해제 — **빈 결과 화면 표시 (silent failure)** | Should | ⬜ |
| SSR-ERR-004 | `is_correct` 필드 누락 | DB 스키마 변경 | destructive 경로로 렌더 — 정답 판정 오류 가능성 | Should | ⬜ |
| SSR-ERR-005 | 매우 긴 `question_text` | — | 카드 내 텍스트 줄바꿈, 레이아웃 깨짐 없음 | Could | ⬜ |
| SSR-ERR-006 | 여러 라운드 혼재 | 라운드 1 + 2 응답 | 모두 평탄하게 렌더 (라운드 구분 없음) — UI 개선 여지 | Could | ⬜ |

---

## 5. 경계값 테스트

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| SSR-BND-001 | 정답률 정확히 80% 경계 | 5문제 중 4개 정답 | 진입 | "우수" success 배지 (80 이상 조건 확인 — `≥80` vs `>80`) | Must | ⬜ |
| SSR-BND-002 | 정답률 정확히 60% 경계 | 5문제 중 3개 정답 | 진입 | "보통" warning 배지 (60 이상 조건 확인) | Must | ⬜ |
| SSR-BND-003 | 정답률 0% | 전체 오답 | 진입 | `scorePercent = 0`, "복습 필요" destructive 배지, NaN/Infinity 없음 | Must | ⬜ |
| SSR-BND-004 | 정답률 100% | 전체 정답 | 진입 | `scorePercent = 100`, "우수" 배지, "N/N 정답" | Must | ⬜ |
| SSR-BND-005 | 문항 1개 (최소) | 1문제 퀴즈 | 진입 | 트로피 카드 `1/1 또는 0/1`, 정상 렌더 | Should | ⬜ |
| SSR-BND-006 | 문항 20개 (최대) | 20문제 퀴즈 | 진입 | 모든 카드 렌더, 스크롤 가능, 첫 카드 뷰포트 내 | Should | ⬜ |
| SSR-BND-007 | `response_time_ms = 1` (최소) | — | — | "0.0초" 또는 "0.001초" 포맷 (소수점 처리 확인) | Could | ⬜ |
| SSR-BND-008 | `response_time_ms = 600000` (10분) | — | — | "600.0초" 정상 포맷, 레이아웃 깨짐 없음 | Could | ⬜ |
| SSR-BND-009 | 선택지 5개 | 퀴즈에 보기 A~E | — | 5개 보기 모두 카드에 렌더, 정답/오답 하이라이트 정확 | Should | ⬜ |
| SSR-BND-010 | `topic_tag` 빈 문자열 | `topic_tag = ""` | — | 빈 배지 또는 배지 미노출 (UI 정책 확인) | Could | ⬜ |

---

## 6. 인증 컨텍스트

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| SSR-AUTH-001 | 비인증 접근 | 쿠키 없음 | `/student/sessions/[id]/result` 직접 접근 | `/login`으로 리다이렉트 | Must | ⬜ |
| SSR-AUTH-002 | 강사(teacher) role 접근 | teacher 쿠키 | 동일 URL 접근 | `/instructor`로 리다이렉트 (student layout guard) | Must | ⬜ |
| SSR-AUTH-003 | 멘토(mentor) role 접근 | mentor 쿠키 | 동일 URL 접근 | `/mentor`로 리다이렉트 | Must | ⬜ |
| SSR-AUTH-004 | 원장(owner) role 접근 | owner 쿠키 | 동일 URL 접근 | `/owner`로 리다이렉트 | Must | ⬜ |
| SSR-AUTH-005 | 세션 만료 중 체류 | 쿠키 만료 | 페이지 체류 후 API 호출 | `401` 응답 → 리다이렉트 처리 | Should | ⬜ |

---

## 7. 네트워크 에러

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| SSR-NET-001 | `GET /api/quizzes` 타임아웃 | 10s 지연 | 페이지 로드 | 로딩 스피너 → 타임아웃 후 에러 상태 또는 빈 결과 | Should | ⬜ |
| SSR-NET-002 | `GET /api/responses` 500 | 서버 에러 | — | `results = []` 유지, 에러 토스트 표시 (또는 silent — 현재 패턴) | Should | ⬜ |
| SSR-NET-003 | 두 API 중 한 쪽만 실패 | quizzes 성공, responses 실패 | — | 퀴즈 카드만 렌더, 정오답 표시 불가 — 크래시 없음 | Should | ⬜ |
| SSR-NET-004 | 오프라인 상태로 진입 | 인터넷 끊김 | 진입 | 에러 바운더리 또는 빈 상태, "결과를 불러올 수 없습니다" 안내 | Should | ⬜ |
| SSR-NET-005 | `GET /api/responses` 403 | RLS 차단 | — | 빈 배열 또는 에러 상태, 크래시 없음 | Must | ⬜ |

---

## 8. 접근성

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| SSR-A11Y-001 | 키보드 탐색 | — | Tab 키 순차 이동 | 트로피 카드 → 문항 카드들 → "학습 리포트 보기" 버튼 순서로 포커스 | Should | ⬜ |
| SSR-A11Y-002 | 정오답 아이콘 ARIA | — | — | `CheckCircle2`/`XCircle`에 `aria-label="정답"/"오답"` 또는 스크린리더 대체 텍스트 | Should | ⬜ |
| SSR-A11Y-003 | 색 외 구분 | 색맹 사용자 | — | 정답(초록)과 오답(빨강)이 아이콘 또는 텍스트로도 구분 가능 | Should | ⬜ |
| SSR-A11Y-004 | `data-testid` 존재 | — | — | `[data-testid="result-trophy-card"]`, `[data-testid="quiz-result-card-{index}"]`, `[data-testid="report-link"]` | Must | ⬜ |
| SSR-A11Y-005 | 페이지 제목 (`<title>`) | — | — | "퀴즈 결과 \| Argos" 또는 유사 — 스크린리더 페이지 구분 | Could | ⬜ |

---

## 9. 한국어 에러 메시지

| TC ID | 시나리오 | 기대 에러 문구 | 우선순위 | 상태 |
|-------|---------|--------------|---------|------|
| SSR-KO-001 | API 실패 토스트 (미래 개선) | "결과를 불러오는 중 오류가 발생했습니다." | Should | ⬜ |
| SSR-KO-002 | 응답 0건 안내 | "아직 제출한 답변이 없습니다." 또는 빈 상태 구체적 안내 | Should | ⬜ |
| SSR-KO-003 | 세션 미참여 안내 | "이 세션에 참여하지 않았습니다." | Should | ⬜ |
| SSR-KO-004 | 네트워크 오류 안내 | "네트워크 오류가 발생했습니다. 다시 시도해 주세요." | Should | ⬜ |

---

## 10. RLS 교차 검증

| TC ID | 시나리오 | 전제조건 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|---------|------|
| SSR-RLS-001 | 타 학원 수강생 — 퀴즈 접근 | A 학원 student가 B 학원 sessionId로 GET /api/quizzes | `200 []` 빈 배열 (RLS 격리) 또는 `403` | Must | ⬜ |
| SSR-RLS-002 | 타 학원 수강생 — 응답 접근 | 동일 조건 GET /api/responses | `200 []` 빈 배열 — 타인 응답 미노출 | Must | ⬜ |
| SSR-RLS-003 | 동 학원 타 수강생 응답 격리 | 같은 학원 A, B 수강생 | A가 B의 `responses`를 조회할 수 없음 | Must | ⬜ |
| SSR-RLS-004 | `session_participants` 미참여자 | 세션에 참여하지 않은 수강생 | `quizzes`는 조회 가능할 수 있으나 `responses`는 빈 배열 | Should | ⬜ |
| SSR-RLS-005 | `is_correct` 필드 — 타인 응답에서 미노출 | API 응답 검사 | `GET /api/responses` 응답에 자신의 `is_correct`만 포함 | Must | ⬜ |

---

## 11. XSS / SQL 인젝션

| TC ID | 시나리오 | 입력 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| SSR-SEC-001 | `question_text` XSS | DB에 `<script>alert(1)</script>` 저장된 경우 | React escape로 텍스트 그대로 렌더, 스크립트 실행 없음 | Must | ⬜ |
| SSR-SEC-002 | `topic_tag` XSS | `<img onerror=alert(1)>` | 배지에 escape 처리, 이벤트 핸들러 무효 | Must | ⬜ |
| SSR-SEC-003 | `code_snippet` XSS | `<script>` 포함 코드 | `<pre>` 내 텍스트 escape 처리, 실행 없음 | Must | ⬜ |
| SSR-SEC-004 | `sessionId` URL 파라미터 조작 | UUID 아닌 값 (`'; DROP TABLE--`) | Supabase 파라미터 바인딩으로 SQL 인젝션 차단, `200 []` 또는 `400` | Must | ⬜ |

---

## 12. 레이트 리밋

| TC ID | 시나리오 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| SSR-RL-001 | 결과 페이지 빠른 새로고침 | 5초 내 5회 새로고침 | 매번 정상 렌더 (캐시 또는 정상 응답) | Could | ⬜ |
| SSR-RL-002 | 동일 sessionId 동시 요청 | 탭 2개 동시 진입 | 각각 독립적으로 정상 렌더 | Could | ⬜ |

---

## 13. 브라우저 네비게이션 복구

| TC ID | 시나리오 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| SSR-NAV-001 | 결과 → 리포트 → 뒤로가기 | "학습 리포트 보기" 클릭 후 브라우저 뒤로 | 결과 페이지 재로드 — 데이터 유지 | Should | ⬜ |
| SSR-NAV-002 | 결과 페이지 새로고침 | F5 / Ctrl+R | 동일 결과 재렌더 (서버 재페칭) | Must | ⬜ |
| SSR-NAV-003 | 세션 화면 → 결과 → 세션 홈 | 직접 URL 입력으로 `/student/sessions/[id]` | 결과 → 세션 홈 이동 정상 | Should | ⬜ |
| SSR-NAV-004 | 오래된 탭 복귀 | 30분 후 탭 포커스 | 쿠키 유효하면 정상, 만료면 `/login` 리다이렉트 | Should | ⬜ |
| SSR-NAV-005 | 히스토리 앞/뒤 반복 | result ↔ report 왕복 3회 | 매번 정상 데이터 렌더, 상태 꼬임 없음 | Could | ⬜ |
