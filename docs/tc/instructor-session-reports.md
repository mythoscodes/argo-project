# TC — 강사 세션 리포트

| 항목 | 값 |
|------|---|
| 라우트 | `/instructor/sessions/[id]/reports` |
| 파일 | `src/app/instructor/sessions/[id]/reports/page.tsx` |
| 역할 | 강사 |
| 관련 기능 | F7 리포트 — 강사 뷰 |
| 주요 API | `GET /api/ai/analysis?sessionId`, `POST /api/ai/report` |
| Realtime 채널 | N/A |

> 이전에 수행한 이해도 분석 기록을 라운드별 추이 차트(Recharts LineChart)와 상세 카드로 시각화. AI 리포트 생성 버튼으로 추가 분석 실행 가능.

## 1. UI 시나리오

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| ISR-UI-001 | 분석 기록 ≥ 1건 렌더 | 세션 대시보드에서 "분석하기" 최소 1회 실행 | 진입 | 추이 차트 + 분석 카드 리스트 렌더 | Must | ⬜ |
| ISR-UI-002 | 빈 상태 | 분석 기록 0건 | 진입 | `Brain` 아이콘 + "아직 분석 데이터가 없습니다" + "수업 대시보드에서 이해도 분석을 실행하세요" | Must | ⬜ |
| ISR-UI-003 | 대시보드 링크 | — | "대시보드로" 클릭 | `/instructor/sessions/[id]`로 복귀 | Should | ⬜ |
| ISR-UI-004 | 추이 차트 라인 | 분석 2건 이상 | — | 각 토픽별 라인 노출 (최대 6색 순환), 레전드 토픽명 표시 | Must | ⬜ |
| ISR-UI-005 | Y축 범위 | — | — | 0-100 고정 | Should | ⬜ |
| ISR-UI-006 | 분석 카드 타입 라벨 | `analysis_type = "coaching"` vs `"analysis"` | — | "코칭 분석" / "이해도 분석" 분기 | Should | ⬜ |
| ISR-UI-007 | 이해도 점수 색상 | score ≥ 80 / 60-80 / < 60 | — | 녹/노/빨 텍스트 색상 | Should | ⬜ |
| ISR-UI-008 | 약점 토픽 배지 | `weak_topics.length > 0` | — | destructive 배지 리스트 | Should | ⬜ |
| ISR-UI-009 | 코칭 제안 렌더 | `coaching_suggestion` 존재 | — | 보라색 박스 + whitespace-pre-wrap | Must | ⬜ |
| ISR-UI-010 | AI 리포트 생성 버튼 | — | "AI 리포트 생성" 클릭 | 로딩 → 새 분석 카드 추가 + 차트 갱신 | Must | ⬜ |
| ISR-UI-011 | 생성 중 로딩 | 생성 클릭 후 | — | "생성중..." + Spinner + `disabled` | Should | ⬜ |
| ISR-UI-012 | 생성 시각 포맷 | — | 카드 헤더 | `toLocaleString("ko-KR")` 한국어 일시 | Could | ⬜ |
| ISR-UI-013 | 분석 1건 — 차트 렌더 | 분석 정확히 1건 | — | LineChart 점 1개 (선 없음), 크래시 없음 | Should | ⬜ |
| ISR-UI-014 | 토픽 7개 — 색상 순환 | 분석 결과에 7개 토픽 | — | `topicColors[index % 6]`으로 순환 렌더 | Should | ⬜ |
| ISR-UI-015 | 약점 토픽 0개 | `weak_topics = []` | — | "약점:" 섹션 미노출 | Should | ⬜ |
| ISR-UI-016 | 분석 카드 10개 | 분석 10회 실행 | — | 10개 카드 모두 렌더, 스크롤 처리, 크래시 없음 | Could | ⬜ |
| ISR-UI-017 | 탭 키 네비게이션 | — | Tab으로 버튼/링크 순회 | 포커스 논리적 | Should | ⬜ |
| ISR-UI-018 | 차트 호버 툴팁 | 마우스 오버 | LineChart 데이터 포인트 호버 | 토픽명 + 점수 툴팁 표시 | Could | ⬜ |
| ISR-UI-019 | 새로고침 후 기록 유지 | 분석 2건 후 F5 | — | 동일 카드 리스트 유지 | Should | ⬜ |
| ISR-UI-020 | 뒤로가기 | 대시보드에서 리포트 진입 후 | 뒤로가기 | 대시보드로 복귀 | Could | ⬜ |
| ISR-UI-021 | 코칭 제안 긴 텍스트 | `coaching_suggestion` 500자 | — | `whitespace-pre-wrap`으로 줄바꿈, 레이아웃 깨짐 없음 | Should | ⬜ |
| ISR-UI-022 | 점수 색상 경계 — 정확히 60 | `score = 60` | — | 노란색(warning) (< 60이 아님) | Should | ⬜ |
| ISR-UI-023 | 점수 색상 경계 — 정확히 80 | `score = 80` | — | 초록색(success) (< 80이 아님) | Should | ⬜ |

## 2. API 계약

| TC ID | 엔드포인트 | 요청 | 기대응답 | RLS/인가 | 우선순위 | 상태 |
|-------|-----------|------|---------|---------|---------|------|
| ISR-API-001 | `GET /api/ai/analysis?sessionId` | — | `200 { data: AnalysisResult[] \| AnalysisResult }` (코드는 단일 객체와 배열 양쪽 수용) | 본인 세션 | Must | ⬜ |
| ISR-API-002 | `POST /api/ai/report` | `{ sessionId }` | `200`, 새 분석 레코드 생성 | — | Must | ⬜ |
| ISR-API-003 | 타 강사 세션 ID | A 강사가 B의 `sessionId` 쿼리 | `403` 또는 빈 배열 (RLS) | Must | ⬜ |
| ISR-API-004 | 응답 0건에서 리포트 생성 | 아직 수강생 응답 없음 | `400` 또는 빈 분석 (정책 확인) | Should | ⬜ |
| ISR-API-005 | mentor role로 `GET /api/ai/analysis` | mentor 쿠키, 학원 내 세션 | `200` (mentor 접근 가능 — isStaff 기준) | Must | ⬜ |
| ISR-API-006 | mentor role로 `POST /api/ai/report` | mentor 쿠키 | `200` 또는 `403` (정책 확인 — mentor 리포트 생성 권한) | Should | ⬜ |
| ISR-API-007 | `GET /api/ai/analysis` — 분석 없음 | 분석 0건 | `200 { data: [] }` (빈 배열) | Must | ⬜ |
| ISR-API-008 | `POST /api/ai/report` temperature | — | `temperature = 0.5` (CLAUDE.md §15, 코칭/리포트) | Should | ⬜ |

## 3. Realtime

N/A — 정적 기록 열람 화면.

## 4. 에러 / 엣지

| TC ID | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|------|
| ISR-ERR-001 | 타 학원 세션 접근 | `/instructor/sessions/{타학원}/reports` | 빈 상태 또는 RLS 차단 | Must | ⬜ |
| ISR-ERR-002 | `understanding_scores` null | 분석 실패로 점수 null | 카드에서 점수 섹션 생략, 크래시 없음 | Should | ⬜ |
| ISR-ERR-003 | `weak_topics` null | — | 약점 섹션 생략 | Should | ⬜ |
| ISR-ERR-004 | 토픽 수 > 6 | 7개 토픽 | `topicColors` 순환 사용 (% 연산) | Should | ⬜ |
| ISR-ERR-005 | 리포트 생성 실패 | AI 에러 | 로딩 해제, 기존 차트 유지, 에러 메시지 표시 (silent failure 방지) | Should | ⬜ |
| ISR-ERR-006 | 차트 데이터 0건 | 분석은 있지만 `understanding_scores` 모두 null | 차트 카드 숨김, 분석 카드만 표시 | Should | ⬜ |
| ISR-ERR-007 | RLS 교차 — 타 학원 강사 직접 URL 접근 | B 학원 강사가 A 학원 `sessionId`로 `/reports` 접근 | 빈 상태 또는 `403`, 데이터 노출 없음 | Must | ⬜ |
| ISR-ERR-008 | `coaching_suggestion`에 HTML 태그 | AI 응답에 `<b>` 태그 포함 | React escape로 텍스트 렌더, 태그 실행 없음 | Should | ⬜ |
| ISR-ERR-009 | 네트워크 오프라인 중 생성 버튼 클릭 | — | 에러 메시지, 로딩 해제 | Should | ⬜ |
| ISR-ERR-010 | 중복 생성 버튼 클릭 | `isGenerating=true` 중 재클릭 | 버튼 `disabled`, 단일 API 호출 | Must | ⬜ |
| ISR-ERR-011 | 잘못된 `sessionId` (UUID 형식 아님) | URL `/reports`에 `abc` sessionId | `400` 또는 빈 상태 | Should | ⬜ |
| ISR-ERR-012 | 한국어 에러 메시지 | 리포트 생성 실패 | 한국어 에러, 영어 raw 에러 미노출 | Must | ⬜ |
| ISR-ERR-013 | 접근성 — 차트 | Recharts LineChart에 `aria-label` 또는 데이터 테이블 대안 | Could | ⬜ |
| ISR-ERR-014 | 분석 AI 재시도 | JSON 파싱 실패 | 1회 재시도 후 성공 또는 에러 (CLAUDE.md §14) | Must | ⬜ |
