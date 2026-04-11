# TC — 강사 세션 상세 (F1-F6 통합 ★ 데모 핵심)

| 항목 | 값 |
|------|---|
| 라우트 | `/instructor/sessions/[id]` |
| 파일 | `src/app/instructor/sessions/[id]/page.tsx` (668 lines) |
| 역할 | 강사 |
| 관련 기능 | **F1 세션 관리 / F2 AI 퀴즈 / F3 응답 수집 / F4 히트맵 / F5 AI 코칭 / F6 피드백 루프** |
| 주요 API | `GET /api/sessions/[id]`, `PATCH /api/sessions/[id]`, `GET /api/quizzes?sessionId`, `POST /api/ai/quiz`, `POST /api/ai/analysis`, `POST /api/ai/coaching` |
| Realtime 채널 | `participants:{sessionId}`, `useRealtimeResponses(sessionId)` (응답 구독) |

> 데모 시나리오의 중심 화면. 4개 패널(Quiz / Heatmap / Coaching / Delta)과 헤더(제목·상태 배지·LIVE 인디케이터·수업 시작/종료 버튼·리포트 링크), 정보 카드(참여 코드·참여자 수·응답률)로 구성. 데스크톱은 2x2 그리드, 모바일은 Tabs.

---

## 1. UI 시나리오

### 1-1. 헤더 & 세션 상태 전환 (F1)

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| ISD-UI-001 | draft 세션 로드 — 참여 코드 미발급 | 방금 생성된 세션 | 진입 | 참여 코드 카드 "수업을 시작하면 코드가 발급됩니다", "수업 시작" 버튼 노출, LIVE 인디케이터 없음 | Must | ⬜ |
| ISD-UI-002 | draft → active 전환 | draft 상태 | "수업 시작" 클릭 | 상태 배지 "진행중", 참여 코드 6자리 노출, LIVE 인디케이터(녹색 펄스) 표시 | Must | ⬜ |
| ISD-UI-003 | active → completed 전환 | active 상태 | "수업 종료" 클릭 | 상태 배지 "종료", LIVE 인디케이터 사라짐, "퀴즈 생성" 버튼 숨김 | Must | ⬜ |
| ISD-UI-004 | 참여 코드 복사 | active 상태 | Copy 아이콘 클릭 | 클립보드에 `join_code` 저장, 아이콘 Check로 2초간 변경 | Must | ⬜ |
| ISD-UI-005 | 목록으로 돌아가기 | — | "목록" 링크 클릭 | `/instructor`로 이동 | Should | ⬜ |
| ISD-UI-006 | 리포트 이동 | — | "리포트" 버튼 클릭 | `/instructor/sessions/[id]/reports`로 이동 | Must | ⬜ |
| ISD-UI-007 | 익명 모드 참여자 표시 | `anonymous_mode=true`, 참여자 3명 | 진입 | 참여자 배지 모두 "익명" 라벨 | Must | ⬜ |
| ISD-UI-008 | 참여자 > 8명 | 9명 참여 | — | 처음 8명 배지 + `+1` 배지 | Should | ⬜ |
| ISD-UI-009 | completed 세션 진입 | `status = 'completed'` | 진입 | "종료" 배지, "수업 종료" 버튼 없음, 퀴즈 생성 불가 | Must | ⬜ |
| ISD-UI-010 | 상태 배지 — draft | `status = 'draft'` | 진입 | "대기중" 배지 | Must | ⬜ |
| ISD-UI-011 | 상태 배지 — active | `status = 'active'` | 진입 | "진행중" 배지 | Must | ⬜ |
| ISD-UI-012 | 참여 코드 6자리 형식 | active 전환 후 | — | `join_code`가 `[A-Z0-9]{6}` 패턴 | Must | ⬜ |
| ISD-UI-013 | 참여자 0명 | active, 아직 아무도 미참여 | — | 참여자 카드 "0명", 참여 코드는 노출 | Must | ⬜ |
| ISD-UI-014 | 수업 시작 버튼 로딩 | draft → active 전환 클릭 중 | — | 버튼 "시작 중..." + `disabled` | Should | ⬜ |
| ISD-UI-015 | 수업 종료 버튼 로딩 | active → completed 전환 클릭 중 | — | 버튼 "종료 중..." + `disabled` | Should | ⬜ |
| ISD-UI-016 | 탭 레이아웃 (모바일) | 뷰포트 너비 < 768px | 진입 | Tabs 컴포넌트로 패널 전환 (Quiz/Heatmap/Coaching/Delta 탭) | Should | ⬜ |
| ISD-UI-017 | 그리드 레이아웃 (데스크톱) | 뷰포트 너비 ≥ 768px | 진입 | 2×2 그리드로 4 패널 동시 표시 | Should | ⬜ |
| ISD-UI-018 | 세션 제목 표시 | `title = "Spring JPA 심화"` | 진입 | 헤더에 "Spring JPA 심화" 표시 | Must | ⬜ |
| ISD-UI-019 | topics 배지 | `topics = ["JPA", "N+1", "영속성"]` | 진입 | 세션 정보 영역에 토픽 배지 렌더 | Should | ⬜ |
| ISD-UI-020 | 응답률 표시 | 참여자 3명 × 3문제, 응답 6건 | — | "6/9 (67%)" 형식 | Must | ⬜ |
| ISD-UI-021 | 뒤로가기 후 재진입 | 상세 → 목록 → 상세 재진입 | — | 최신 상태 로드 (캐시된 이전 상태 아님) | Should | ⬜ |
| ISD-UI-022 | 새로고침 (active 상태) | active 세션 F5 | — | 동일 상태 유지, 참여자/응답 최신 데이터 로드 | Should | ⬜ |

### 1-2. F2 AI 퀴즈 생성 (QuizPanel)

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| ISD-UI-030 | 퀴즈 생성 버튼 노출 | `status = 'active'` | — | QuizPanel에 "퀴즈 생성" 버튼 활성화 | Must | ⬜ |
| ISD-UI-031 | draft 상태 — 버튼 숨김 | `status = 'draft'` | — | QuizPanel에 생성 버튼 없음 | Must | ⬜ |
| ISD-UI-032 | completed 상태 — 버튼 숨김 | `status = 'completed'` | — | 동일 | Should | ⬜ |
| ISD-UI-033 | 퀴즈 생성 정상 | active, topics=["JPA","N+1"] | "퀴즈 생성" 클릭 | 로딩 "생성중..." → 3문제 카드 렌더 (문항, 보기 A~D, 정답 강조, 토픽 배지) | Must | ⬜ |
| ISD-UI-034 | 퀴즈 초기 빈 상태 | 아직 생성 안 함 | — | "AI 퀴즈를 생성하여 수강생에게 발송하세요" 안내 | Must | ⬜ |
| ISD-UI-035 | 코드 스니펫 렌더 | `quiz.code_snippet` 존재 | — | `<pre>` 블록에 mono 폰트로 렌더 | Should | ⬜ |
| ISD-UI-036 | 라운드 번호 표시 | `currentRound=2` | 퀴즈 생성 후 | QuizPanel 제목 "AI 퀴즈 (라운드 2)" | Must | ⬜ |
| ISD-UI-037 | 정답 강조 | 퀴즈 렌더 | — | `opt === quiz.correct_answer`인 보기에 성공 색상 border + 굵은 폰트 | Should | ⬜ |
| ISD-UI-038 | 생성 중 로딩 | 퀴즈 생성 클릭 후 | — | "생성중..." + Spinner + 버튼 `disabled` | Must | ⬜ |
| ISD-UI-039 | 문제 3개 고정 | `count = 3` | 생성 완료 | 카드 정확히 3개 | Must | ⬜ |
| ISD-UI-040 | 보기 A~D 렌더 | 퀴즈 생성 완료 | — | 각 문제에 보기 4개 (A, B, C, D 라벨) | Must | ⬜ |
| ISD-UI-041 | 토픽 배지 — 문제당 | `quiz.topic` 존재 | — | 각 문제 카드에 토픽 배지 | Should | ⬜ |
| ISD-UI-042 | 퀴즈 재생성 | 퀴즈 이미 존재 | "퀴즈 생성" 재클릭 | 새 퀴즈 3개로 교체, 이전 퀴즈 대체 | Should | ⬜ |
| ISD-UI-043 | 퀴즈 생성 후 새로고침 | 생성 완료 후 F5 | — | 생성된 퀴즈 유지 (DB 저장됨) | Must | ⬜ |
| ISD-UI-044 | 퀴즈 생성 실패 후 UI | AI 에러 발생 | — | 에러 메시지, 이전 퀴즈 유지, 버튼 재활성화 | Should | ⬜ |
| ISD-UI-045 | 중복 퀴즈 생성 방지 | 생성 중 재클릭 | — | 버튼 `disabled` (단일 요청 보장) | Must | ⬜ |

### 1-3. F4 히트맵 + 분석 (HeatmapPanel)

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| ISD-UI-050 | 히트맵 초기 렌더 | 퀴즈 생성 직후, 응답 0건 | — | `UnderstandingHeatmap` 컴포넌트 렌더 (빈 그리드) | Must | ⬜ |
| ISD-UI-051 | 응답 실시간 반영 | 수강생 1명 응답 제출 | 수강생 화면에서 응답 → 강사 화면 관찰 | 응답률 % 증가, 히트맵 해당 셀 색상 갱신 | Must | ⬜ |
| ISD-UI-052 | "분석하기" 버튼 | 응답 ≥ 1건 | "분석하기" 클릭 | 로딩 스피너 → 토픽별 이해도 바 + 약점 배지 노출 | Must | ⬜ |
| ISD-UI-053 | 이해도 색상 — 낮음 | `score < 60` | 분석 후 | Progress bar 빨간색(destructive) | Should | ⬜ |
| ISD-UI-054 | 이해도 색상 — 중간 | `60 ≤ score < 80` | 분석 후 | 노란색(warning) | Should | ⬜ |
| ISD-UI-055 | 이해도 색상 — 높음 | `score ≥ 80` | 분석 후 | 초록색(success) | Should | ⬜ |
| ISD-UI-056 | 약점 토픽 0개 | `weak_topics = []` | 분석 후 | "약점:" 섹션 미노출 | Should | ⬜ |
| ISD-UI-057 | 응답률 계산 정확성 | 참여자 5명 × 3문제 = 15, 응답 6건 | — | 응답률 40% 표시 (`6/15`) | Must | ⬜ |
| ISD-UI-058 | 분석 로딩 상태 | "분석하기" 클릭 후 | — | "AI가 분석 중입니다..." + Spinner | Should | ⬜ |
| ISD-UI-059 | 중복 분석 방지 | 분석 중 재클릭 | — | `isAnalyzing`으로 버튼 `disabled` | Must | ⬜ |
| ISD-UI-060 | 이해도 색상 경계 — 정확히 60 | `score = 60` | 분석 후 | 노란색 (< 60이 아님) | Should | ⬜ |
| ISD-UI-061 | 이해도 색상 경계 — 정확히 80 | `score = 80` | 분석 후 | 초록색 (< 80이 아님) | Should | ⬜ |
| ISD-UI-062 | 히트맵 셀 — 정답/오답 색상 | 문제별 정답 여부 | — | 정답 셀: 초록, 오답 셀: 빨간 (또는 구현 색상 확인) | Must | ⬜ |
| ISD-UI-063 | 분석 후 새로고침 | 분석 완료 후 F5 | — | 분석 결과 유지 (DB 저장됨) | Must | ⬜ |
| ISD-UI-064 | 응답률 — 분모 0 | 참여자 0명 | — | `0%` 표시, 크래시 없음 (0 나누기 방지) | Must | ⬜ |
| ISD-UI-065 | 히트맵 — 수강생 20명 | 참여자 20명 | — | 히트맵 셀 20행, 레이아웃 깨짐 없음 | Could | ⬜ |

### 1-4. F5 AI 코칭 (CoachingPanel)

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| ISD-UI-070 | 코칭 생성 정상 | 응답 ≥ 1건, 분석 후 | "분석하기" 클릭 | 코칭 Accordion 아이템 첫 번째로 추가, 기본 펼침, 보라색 배경으로 `coaching_suggestion` 렌더 | Must | ⬜ |
| ISD-UI-071 | 코칭 누적 | 분석 2번 실행 | — | 코칭 Accordion 2개 아이템 (최신이 맨 위) | Should | ⬜ |
| ISD-UI-072 | 빈 상태 | 아직 분석 안 함 | — | "이해도 분석을 실행하면 AI 코칭 메시지가 표시됩니다" | Must | ⬜ |
| ISD-UI-073 | 분석 중 로딩 | 분석 호출 직후 | — | "AI가 분석 중입니다..." + Spinner | Should | ⬜ |
| ISD-UI-074 | Accordion 제목 요약 | `coaching_suggestion` 긴 텍스트 | — | 앞 60자 + "..." 표시 | Could | ⬜ |
| ISD-UI-075 | 코칭 Accordion 열기/닫기 | 코칭 1개 이상 | 아이템 클릭 | 펼침/닫힘 전환 | Should | ⬜ |
| ISD-UI-076 | `coaching_suggestion` 줄바꿈 | 여러 단락으로 된 코칭 | — | `whitespace-pre-wrap`으로 단락 유지 | Should | ⬜ |
| ISD-UI-077 | 코칭 생성 타임스탬프 | 코칭 2건 | Accordion 제목 | 각 코칭에 한국어 생성 시각 표시 | Could | ⬜ |
| ISD-UI-078 | 코칭 10건 누적 | 분석 10회 | — | 10개 Accordion 아이템, 스크롤 처리, 크래시 없음 | Could | ⬜ |

### 1-5. F6 피드백 루프 (DeltaPanel)

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| ISD-UI-080 | 재퀴즈 발행 | 라운드 1 완료 + 응답 ≥ 1건 | "재퀴즈" 클릭 | `currentRound` +1, 새 퀴즈 3개 생성, QuizPanel 새 라운드 표시 | Must | ⬜ |
| ISD-UI-081 | 1라운드 안내 | `currentRound = 1` | — | "1라운드 후 재퀴즈를 보내면 이해도 변화(델타)를 확인할 수 있습니다" | Must | ⬜ |
| ISD-UI-082 | 델타 차트 렌더 | `currentRound ≥ 2` | — | `DeltaChart` 컴포넌트 렌더 (라운드 간 이해도 변화) | Must | ⬜ |
| ISD-UI-083 | 재퀴즈 로딩 | 재퀴즈 클릭 중 | — | 버튼 "생성중..." + `disabled` | Should | ⬜ |
| ISD-UI-084 | 재퀴즈 중복 방지 | 재퀴즈 생성 중 재클릭 | — | 버튼 `disabled`, 단일 API 호출 | Must | ⬜ |
| ISD-UI-085 | 라운드 3 이상 델타 | `currentRound = 3` | — | 3라운드 이상 차트 렌더, 추이 정확히 표시 | Should | ⬜ |
| ISD-UI-086 | 델타 차트 — 상승 표시 | 라운드 1 → 2 이해도 개선 | — | 차트 선 상승 방향, 긍정적 색상 | Should | ⬜ |
| ISD-UI-087 | 델타 차트 — 하락 표시 | 라운드 1 → 2 이해도 하락 | — | 차트 선 하락, 경고 색상 | Should | ⬜ |

---

## 2. API 계약

| TC ID | 엔드포인트 | 요청 | 기대응답 | RLS/인가 | 우선순위 | 상태 |
|-------|-----------|------|---------|---------|---------|------|
| ISD-API-001 | `GET /api/sessions/[id]` | — | `200 { data: SessionRow }` | 본인 학원 세션만 | Must | ⬜ |
| ISD-API-002 | `PATCH /api/sessions/[id]` draft→active | `{ status: "active" }` | `200`, 서버에서 `join_code` 자동 발급 후 반환 | 본인 세션 작성자 | Must | ⬜ |
| ISD-API-003 | `PATCH /api/sessions/[id]` active→completed | `{ status: "completed" }` | `200`, `completed_at` 기록 | 본인 세션 | Must | ⬜ |
| ISD-API-004 | `PATCH /api/sessions/[id]` 비정상 전환 (completed→active) | `{ status: "active" }` | `400` 또는 제약 (정책 확인) | — | Should | ⬜ |
| ISD-API-005 | `GET /api/quizzes?sessionId` | — | `200 { data: QuizRow[] }`, `round_number` 포함 | 본인 세션 | Must | ⬜ |
| ISD-API-006 | `GET /api/sessions/[id]` — join_code draft 시 null | draft 상태 세션 | 응답 `join_code = null` 또는 필드 없음 | 회귀 포인트 | Must | ⬜ |
| ISD-API-007 | `GET /api/sessions/[id]` — join_code active 시 발급 | active 전환 후 | 응답 `join_code = "ABC123"` (6자리) | — | Must | ⬜ |
| ISD-API-008 | `PATCH /api/sessions/[id]` — mentor 접근 | mentor 쿠키로 PATCH | `403` (mentor는 세션 상태 변경 불가) | role 체크 | Must | ⬜ |
| ISD-API-009 | `PATCH /api/sessions/[id]` — 미인증 | 쿠키 없음 | `401` | 인증 가드 | Must | ⬜ |
| ISD-API-010 | `POST /api/ai/quiz` 정상 | `{ sessionId, subject, topic, count: 3, difficulty: "mixed" }` | `200` + 3개 퀴즈 저장, Zod 스키마 검증 통과 | — | Must | ⬜ |
| ISD-API-011 | `POST /api/ai/quiz` temperature | Gemini 요청 | `temperature = 0.3` (CLAUDE.md §15) | — | Must | ⬜ |
| ISD-API-012 | `POST /api/ai/quiz` JSON 파싱 실패 재시도 | AI 응답 malformed | 1회 재시도 후 성공 (CLAUDE.md §14) | — | Must | ⬜ |
| ISD-API-013 | `POST /api/ai/quiz` 스키마 위반 | AI 응답 불일치 | Zod 검증 실패 → `500` + 에러 | — | Must | ⬜ |
| ISD-API-014 | `POST /api/ai/quiz` — completed 세션 | completed 상태 세션 ID | `400` "종료된 세션" | — | Must | ⬜ |
| ISD-API-015 | `POST /api/ai/quiz` — mentor 접근 | mentor 쿠키 | `403` | role 체크 | Must | ⬜ |
| ISD-API-016 | `GET /api/quizzes?sessionId` — round_number 필터 | 라운드 1, 2 퀴즈 혼재 | 현재 라운드 퀴즈만 반환 또는 전체 반환 (정책 확인) | — | Should | ⬜ |
| ISD-API-017 | `POST /api/ai/analysis` | `{ sessionId }` | `200 { data: { understanding_scores, weak_topics, delta? } }` | — | Must | ⬜ |
| ISD-API-018 | `POST /api/ai/analysis` 응답 0건 | 응답 수집 전 | `200` + 빈 점수 또는 `400` (정책 확인) | — | Should | ⬜ |
| ISD-API-019 | `POST /api/ai/analysis` temperature | — | `temperature = 0.5` (CLAUDE.md §15) | — | Should | ⬜ |
| ISD-API-020 | `POST /api/ai/analysis` JSON 재시도 | malformed 응답 | 1회 재시도 (CLAUDE.md §14) | — | Must | ⬜ |
| ISD-API-021 | `POST /api/ai/coaching` | `{ sessionId }` | `200 { data: { coaching_suggestion, understanding_scores, weak_topics, created_at } }` | — | Must | ⬜ |
| ISD-API-022 | `POST /api/ai/coaching` temperature | — | `temperature = 0.5` (CLAUDE.md §15) | — | Should | ⬜ |
| ISD-API-023 | `POST /api/ai/coaching` JSON 재시도 | malformed | 1회 재시도 | — | Must | ⬜ |
| ISD-API-024 | `PATCH` — 타 학원 세션 ID | B 학원 강사가 A 세션 PATCH | `403` 또는 `404` (RLS) | Must | ⬜ |
| ISD-API-025 | `GET /api/sessions/[id]` — 존재하지 않는 UUID | 랜덤 UUID | `404` | — | Should | ⬜ |
| ISD-API-026 | `POST /api/ai/quiz` — `count` 경계값 | `count = 0` | `400` Zod 에러 | — | Should | ⬜ |
| ISD-API-027 | `POST /api/ai/quiz` — `count = 10` | — | 10개 퀴즈 생성 또는 제한 에러 (정책 확인) | — | Could | ⬜ |

---

## 3. Realtime

| TC ID | 채널/이벤트 | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|------------|---------|---------|---------|------|
| ISD-RT-001 | `participants:{sessionId}` INSERT | 수강생이 `join_code`로 참여 | 강사 화면 참여자 카드 카운트 실시간 증가, 새 참여자 배지 추가 | Must | ⬜ |
| ISD-RT-002 | `useRealtimeResponses(sessionId)` | 수강생이 퀴즈 응답 제출 | 강사 화면 응답률 % 즉시 갱신, 히트맵 재렌더 | Must | ⬜ |
| ISD-RT-003 | `isConnected` 상태 | Realtime 연결 성공, `status=active` | 헤더에 LIVE 녹색 펄스 인디케이터 노출 | Must | ⬜ |
| ISD-RT-004 | `isConnected=false` | Realtime 연결 실패 | LIVE 인디케이터 숨김, 에러 토스트 또는 경고 | Should | ⬜ |
| ISD-RT-005 | 채널 언서브스크라이브 | 페이지 이탈 | `useEffect` cleanup에서 `channel.unsubscribe()` 호출 — 메모리 누수 방지 | Must | ⬜ |
| ISD-RT-006 | 응답 순서 역전 | 빠른 연속 응답 | `round_number` 필터로 현재 라운드만 카운트 | Should | ⬜ |
| ISD-RT-007 | 재연결 후 상태 복구 | 네트워크 일시 단절 → 복구 | `loadParticipants()` 재호출되어 최신 상태 반영 | Should | ⬜ |
| ISD-RT-008 | 다중 응답 동시 수신 | 5명 수강생이 동시 응답 | 응답률 5건 모두 반영, 히트맵 일관성 유지 | Should | ⬜ |
| ISD-RT-009 | Realtime CHANNEL_ERROR | 채널 에러 이벤트 | `use-realtime.ts` `CHANNEL_ERROR` 핸들링 — 에러 상태 반환, silent failure 없음 | Must | ⬜ |
| ISD-RT-010 | Realtime TIMED_OUT | 채널 타임아웃 | 재연결 시도 또는 에러 상태 표시 | Must | ⬜ |
| ISD-RT-011 | `participants` DELETE | 수강생이 페이지 이탈 | 참여자 카운트 감소 (또는 감소 없음 — 정책 확인) | Could | ⬜ |
| ISD-RT-012 | 탭 전환 후 Realtime 유지 | 모바일 탭 전환 | Realtime 구독 유지, 응답 수신 계속 | Should | ⬜ |

---

## 4. 에러 / 엣지

| TC ID | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|------|
| ISD-ERR-001 | **`join_code` 평문 노출 방지 회귀** | 네트워크 탭에서 draft 세션 `GET`시 `join_code` 필드 없음 또는 null (커밋 `236a658` 회귀) | Must | ⬜ |
| ISD-ERR-002 | 타 강사 세션 접근 차단 | B 강사가 A의 `sessionId` URL 직접 접근 | `403`/`404` 또는 빈 상태, RLS 거부 | Must | ⬜ |
| ISD-ERR-003 | 타 학원 세션 접근 | 다른 학원 강사 | 동일 차단 | Must | ⬜ |
| ISD-ERR-004 | 존재하지 않는 sessionId | `/instructor/sessions/invalid-uuid` | 에러 상태 또는 `404` | Should | ⬜ |
| ISD-ERR-005 | completed 상태에서 퀴즈 생성 시도 | UI 버튼 숨김이지만 API 직접 호출 가정 | 서버에서 `400` "종료된 세션" | Must | ⬜ |
| ISD-ERR-006 | AI 퀴즈 생성 타임아웃 | Gemini 응답 지연 | 에러 메시지, 로딩 해제, 재시도 가능 | Should | ⬜ |
| ISD-ERR-007 | AI 퀴즈 생성 실패 (네트워크) | — | 에러 메시지 표시, 기존 퀴즈 유지 | Should | ⬜ |
| ISD-ERR-008 | 응답률 분모 0 | 참여자 0명 | `totalExpected=0` → 0% 표시, 크래시 없음 | Must | ⬜ |
| ISD-ERR-009 | `topics` JSONB 배열 아님 | 데이터 이상 | `Array.isArray` 가드 → 빈 배열 처리 | Should | ⬜ |
| ISD-ERR-010 | `clipboard.writeText` 거부 (HTTPS 아님) | 로컬/staging | 에러 catch — 복사 실패 메시지 표시 (silent 아님) | Could | ⬜ |
| ISD-ERR-011 | 분석 호출 중복 클릭 | 빠른 연속 클릭 | `isAnalyzing`으로 버튼 비활성화 | Should | ⬜ |
| ISD-ERR-012 | 라운드 번호 불일치 | DB `round_number = 5`, UI 1 | `Math.max(quizData.map(q => q.round_number))`로 자동 동기화 | Should | ⬜ |
| ISD-ERR-013 | XSS — 세션 제목 `<script>` | DB에 저장된 후 헤더 렌더 | React escape, 스크립트 실행 없음 | Must | ⬜ |
| ISD-ERR-014 | XSS — 코칭 제안에 HTML 태그 | AI 응답에 `<b>` 포함 | `whitespace-pre-wrap`으로 텍스트 렌더, 태그 실행 없음 | Should | ⬜ |
| ISD-ERR-015 | SQL injection — sessionId 파라미터 | URL에 `'; DROP TABLE sessions;--` | Supabase 파라미터 바인딩으로 안전 | Must | ⬜ |
| ISD-ERR-016 | 레이트 리밋 — 퀴즈 생성 연속 | 5회 연속 "퀴즈 생성" | 서버 또는 AI 레이트 리밋 응답 처리 | Could | ⬜ |
| ISD-ERR-017 | 레이트 리밋 — 분석 연속 | 10회 연속 "분석하기" | 동일 | Could | ⬜ |
| ISD-ERR-018 | 분석 AI 500 에러 | AI API 오류 | 에러 메시지, 기존 히트맵 유지 | Should | ⬜ |
| ISD-ERR-019 | `understanding_scores` null | 분석 실패로 null 반환 | 히트맵 섹션 생략 또는 빈 상태, 크래시 없음 | Should | ⬜ |
| ISD-ERR-020 | `weak_topics` null | — | 약점 섹션 생략 | Should | ⬜ |
| ISD-ERR-021 | 수업 시작 중 페이지 이탈 | draft→active PATCH 중 뒤로가기 | PATCH 완료 또는 취소 — 세션 상태 일관성 유지 | Should | ⬜ |
| ISD-ERR-022 | RLS — mentor가 강사 세션 PATCH 시도 | mentor 쿠키로 `PATCH /api/sessions/{id}` | `403` | Must | ⬜ |
| ISD-ERR-023 | RLS — 수강생이 강사 세션 접근 | student 쿠키로 `/instructor/sessions/{id}` | layout 가드로 리다이렉트 | Must | ⬜ |
| ISD-ERR-024 | 접근성 — LIVE 인디케이터 | 녹색 펄스 애니메이션에 `aria-label="실시간 연결 중"` | Should | ⬜ |
| ISD-ERR-025 | 접근성 — 퀴즈 카드 | 각 문제 카드 `role="article"`, 보기 버튼에 라벨 | Should | ⬜ |
| ISD-ERR-026 | 접근성 — 탭 키 | 헤더→코드 복사→버튼→패널 순 포커스 | Should | ⬜ |
| ISD-ERR-027 | 한국어 에러 — 퀴즈 생성 실패 | AI 오류 시 한국어 에러, raw 영어 미노출 | Must | ⬜ |
| ISD-ERR-028 | 한국어 에러 — 분석 실패 | 동일 | Must | ⬜ |
| ISD-ERR-029 | 한국어 에러 — 코칭 실패 | 동일 | Must | ⬜ |
| ISD-ERR-030 | `GET /api/sessions/[id]` 500 | DB 에러 | 에러 페이지 또는 에러 메시지, 크래시 없음 | Should | ⬜ |
| ISD-ERR-031 | 참여자 이름에 XSS | `display_name = "<img onerror=...>"` | React escape, 스크립트 실행 없음 | Must | ⬜ |
| ISD-ERR-032 | 퀴즈 `correct_answer` = 'E' | 보기 A~D만 존재, E는 없음 | 정답 강조 없음, 크래시 없음 | Should | ⬜ |
| ISD-ERR-033 | 재연결 중 응답 수신 | 네트워크 단절 → 복구 → 응답 이벤트 | 누락 없이 최신 상태 반영 (또는 polling 보완) | Could | ⬜ |
| ISD-ERR-034 | completed 세션에서 분석 API 직접 호출 | `POST /api/ai/analysis` with completed sessionId | 허용 또는 `400` (정책 확인) | Could | ⬜ |
| ISD-ERR-035 | `anonymous_mode=true` 상태에서 참여자 실명 노출 여부 | 익명 모드 세션 | 강사 화면에 수강생 실명 미노출 (익명 라벨만) | Must | ⬜ |
