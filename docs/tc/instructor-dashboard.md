# TC — 강사 대시보드 (세션 목록)

| 항목 | 값 |
|------|---|
| 라우트 | `/instructor` |
| 파일 | `src/app/instructor/page.tsx` |
| 역할 | 강사 |
| 관련 기능 | F1 세션 관리 — 목록 뷰 |
| 주요 API | `GET /api/sessions` |
| Realtime 채널 | N/A (페이지 자체는 REST fetch 기반, 실시간 갱신 없음) |

## 1. UI 시나리오

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| IDB-UI-001 | 세션 목록 렌더 | 강사 로그인, 세션 ≥ 1개 | `/instructor` 진입 | 상단 헤더 "수업 세션" + "새 세션 만들기" 버튼, Stats 3개 카드(진행중/대기중/완료), 세션 카드 리스트 | Must | ⬜ |
| IDB-UI-002 | 빈 상태 | 세션 0개 | 진입 | `EmptyState` 컴포넌트 "아직 세션이 없습니다" + "첫 세션 만들기" CTA | Must | ⬜ |
| IDB-UI-003 | 정렬 순서 | `active` + `draft` + `completed` 혼재 | 진입 | **active → draft → completed** 순으로 카드 노출 | Must | ⬜ |
| IDB-UI-004 | Stats 카운트 정확성 | 각 상태별 세션 존재 | 진입 | 카드의 숫자와 실제 필터링된 세션 수 일치 | Must | ⬜ |
| IDB-UI-005 | 상태 배지 색상 | 각 상태별 세션 | 카드 렌더 | `draft`="대기중", `active`="진행중", `completed`="종료" 한국어 라벨 + `Badge` variant 일치 | Should | ⬜ |
| IDB-UI-006 | 세션 카드 클릭 | — | 카드 클릭 | `/instructor/sessions/{id}`로 이동 | Must | ⬜ |
| IDB-UI-007 | topics 배지 렌더 | `sessions.topics`에 5개 이상 | 카드 렌더 | 처음 5개 노출 + `+N` 배지 | Should | ⬜ |
| IDB-UI-008 | `course_category` optional | 카테고리 없는 세션 | 카드 렌더 | 카테고리 구분선·텍스트 미노출 | Should | ⬜ |
| IDB-UI-009 | 로딩 스피너 | `/instructor` 최초 진입 | fetch 진행 중 | `Spinner size="lg"` 중앙 정렬 | Should | ⬜ |
| IDB-UI-010 | 날짜 포맷 한국어 | — | 카드 렌더 | `toLocaleDateString("ko-KR")` 형식 (예: `2026. 4. 10.`) | Could | ⬜ |
| IDB-UI-011 | 새 세션 만들기 버튼 | — | "새 세션 만들기" 클릭 | `/instructor/sessions/new`로 이동 | Must | ⬜ |
| IDB-UI-012 | topics 0개 | `sessions.topics = []` | 카드 렌더 | 배지 영역 없음, 크래시 없음 | Should | ⬜ |
| IDB-UI-013 | topics 정확히 5개 | `topics.length = 5` | 카드 렌더 | 5개 모두 노출, `+N` 배지 없음 | Should | ⬜ |
| IDB-UI-014 | topics 정확히 6개 | `topics.length = 6` | 카드 렌더 | 5개 + `+1` 배지 | Should | ⬜ |
| IDB-UI-015 | 탭 키 네비게이션 | — | Tab 키로 카드 순회 | 포커스 순서 논리적, 키보드로 상세 진입 가능 | Should | ⬜ |
| IDB-UI-016 | 세션 50개 이상 | 세션 50개 | 진입 | 스크롤로 모두 표시, 페이지 크래시 없음 | Could | ⬜ |
| IDB-UI-017 | Stats — 진행중 0개 | active 세션 없음 | 진입 | 진행중 카드 "0" 표시, 에러 없음 | Must | ⬜ |
| IDB-UI-018 | 세션 제목 긴 텍스트 | 100자 제목 | 카드 렌더 | 텍스트 overflow 처리 (`truncate`), 카드 레이아웃 깨짐 없음 | Should | ⬜ |
| IDB-UI-019 | 새로고침 후 목록 유지 | 세션 목록 로드 후 F5 | — | 동일 목록 렌더 | Should | ⬜ |

## 2. API 계약

| TC ID | 엔드포인트 | 요청 | 기대응답 | RLS/인가 | 우선순위 | 상태 |
|-------|-----------|------|---------|---------|---------|------|
| IDB-API-001 | `GET /api/sessions` | 강사 세션 쿠키 | `200 { data: SessionRow[] }`, 본인 학원 세션만 | `academy_id = 강사.academy_id` RLS | Must | ⬜ |
| IDB-API-002 | `GET /api/sessions` 0건 | 세션 없음 | `200 { data: [] }` | — | Must | ⬜ |
| IDB-API-003 | `GET /api/sessions` 미인증 | 쿠키 없음 | `401` 또는 리다이렉트 | 인증 가드 | Must | ⬜ |
| IDB-API-004 | `GET /api/sessions` 응답 구조 | — | 각 행에 `id, title, subject, status, topics, course_category, created_at` 포함 | — | Must | ⬜ |
| IDB-API-005 | `GET /api/sessions` — mentor role 접근 | mentor 쿠키 | `200` (mentor는 세션 조회 가능, academy_id 기반) | — | Must | ⬜ |
| IDB-API-006 | `GET /api/sessions` — 응답 `join_code` 포함 여부 | — | 목록 응답에 `join_code` 포함 안 됨 (보안) | — | Should | ⬜ |

## 3. Realtime

N/A — 현재 구현은 `useEffect` 1회 fetch. 세션 목록 변동을 실시간 반영하지 않음. 필요 시 `sessions:{academyId}` 채널 추가 고려 (Could).

| TC ID | 채널/이벤트 | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|------------|---------|---------|---------|------|
| IDB-RT-001 | 수동 새로고침 | 다른 강사가 새 세션 생성 후 이 강사가 F5 | 새 세션 목록에 반영 | Could | ⬜ |

## 4. 에러 / 엣지

| TC ID | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|------|
| IDB-ERR-001 | 타 학원 세션 격리 | A 학원 강사가 B 학원 세션을 못 봄 (RLS 회귀, 커밋 `b081bed`) | Must | ⬜ |
| IDB-ERR-002 | `GET /api/sessions` 500 | `sessions` state가 `[]`로 유지됨 — 에러 토스트 또는 메시지 표시 | Should | ⬜ |
| IDB-ERR-003 | 수강생/원장/mentor role로 `/instructor` 접근 | 레이아웃 가드로 역할별 홈 리다이렉트 | Must | ⬜ |
| IDB-ERR-004 | `topics`가 JSONB null/배열 아님 | `Array.isArray` 가드로 빈 배열 처리, 크래시 없음 | Should | ⬜ |
| IDB-ERR-005 | 알 수 없는 `status` 값 | `STATUS_CONFIG[session.status] ?? STATUS_CONFIG.draft`로 fallback 렌더 | Could | ⬜ |
| IDB-ERR-006 | 네트워크 오프라인 | 에러 상태 표시, 빈 목록 아닌 에러 메시지 | Should | ⬜ |
| IDB-ERR-007 | `created_at` null | 날짜 포맷 함수에서 null 처리, 크래시 없음 | Should | ⬜ |
| IDB-ERR-008 | RLS 교차 — 타 학원 강사 쿠키로 직접 API 호출 | `GET /api/sessions` | 타 학원 세션 응답에 포함 안 됨 | Must | ⬜ |
| IDB-ERR-009 | `academy_id` NULL인 강사 | 학원 바인딩 없는 강사 | 빈 목록 또는 에러 메시지, 크래시 없음 | Should | ⬜ |
| IDB-ERR-010 | XSS — 세션 제목에 `<script>` 저장 후 목록 렌더 | 카드에 텍스트로 escape 렌더, 스크립트 실행 없음 | Must | ⬜ |
| IDB-ERR-011 | 접근성 — 세션 카드 ARIA | 카드에 `role="article"` 또는 의미 있는 랜드마크, 스크린리더 읽기 가능 | Should | ⬜ |
| IDB-ERR-012 | Stats 카운트 — 정렬 후 필터 정확성 | active 3, draft 2, completed 5 혼재 | Stats 카드 숫자 정확히 3/2/5, 정렬 순서 active→draft→completed | Must | ⬜ |
