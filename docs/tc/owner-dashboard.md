# TC — 원장 경영 대시보드

| 항목 | 값 |
|------|---|
| 라우트 | `/owner` |
| 파일 | `src/app/owner/page.tsx` |
| 역할 | 원장 |
| 관련 기능 | F8 원장 대시보드 (KPI + 품질 추적) |
| 주요 API | `GET /api/dashboard` |
| Realtime 채널 | N/A |

> 학원 전체 KPI 4개 카드(전체 세션·진행중·수강생·이탈위험) + 세션별 평균 정답률 BarChart + 이탈 위험 수강생 리스트.

## 1. UI 시나리오

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| ODB-UI-001 | 정상 로드 | 원장 로그인, 데이터 존재 | 진입 | 헤더 "경영 대시보드" + KPI 4개 카드 + 정답률 차트 + 이탈 위험 리스트 | Must | ⬜ |
| ODB-UI-002 | KPI 카드 — 전체 세션 | `total_sessions=10` | — | 파란 아이콘 + `10` + "전체 세션" | Must | ⬜ |
| ODB-UI-003 | KPI 카드 — 진행중 | `active_sessions=3` | — | 초록 아이콘 + `3` + "진행중" | Must | ⬜ |
| ODB-UI-004 | KPI 카드 — 수강생 | `total_students=45` | — | 보라 아이콘 + `45` + "수강생" | Must | ⬜ |
| ODB-UI-005 | KPI 카드 — 이탈 위험 | `at_risk_students=5` | — | 빨간 아이콘 + `5` + "이탈 위험" | Must | ⬜ |
| ODB-UI-006 | 세션별 정답률 차트 | `session_stats.length ≥ 1` | — | Recharts BarChart, X축 세션명(8자 이상 축약), Y축 0-100 | Must | ⬜ |
| ODB-UI-007 | 차트 빈 상태 | `session_stats = []` | — | "데이터가 없습니다" 텍스트 | Must | ⬜ |
| ODB-UI-008 | 이탈 위험 리스트 | `at_risk_list.length ≥ 1` | — | 각 수강생 카드: 이니셜 아바타 + 이름 + "정답률 X%" + HIGH/MEDIUM 배지 | Must | ⬜ |
| ODB-UI-009 | 이탈 위험 — 빈 상태 | `at_risk_list = []` | — | "이탈 위험 수강생이 없습니다" 텍스트 | Must | ⬜ |
| ODB-UI-010 | 데이터 로드 실패 — 전체 null | `data === null` | — | "데이터를 불러올 수 없습니다" 텍스트 | Must | ⬜ |
| ODB-UI-011 | 세션 제목 축약 | 9자 이상 제목 | — | 첫 8자 + "..." | Should | ⬜ |
| ODB-UI-012 | HIGH vs MEDIUM 배지 | `risk_level="HIGH"` vs `"MEDIUM"` | — | `risk_high`/`risk_medium` variant, "위험"/"주의" 라벨 | Should | ⬜ |
| ODB-UI-013 | KPI 카드 — 전체 0 | 새로 가입한 원장 | 진입 | 4개 카드 모두 `0`, 에러 없음 | Must | ⬜ |
| ODB-UI-014 | 이탈 위험 정렬 | HIGH 2명, MEDIUM 3명 혼재 | — | HIGH가 먼저 정렬되는지 확인 (정책 확인) | Should | ⬜ |
| ODB-UI-015 | 수강생 이름 이니셜 아바타 | `display_name = "홍길동"` | — | 아바타에 "홍" 표시 | Should | ⬜ |
| ODB-UI-016 | 세션 정답률 0% | `average_accuracy = 0` | 차트 | 막대 높이 0, 표시됨 | Should | ⬜ |
| ODB-UI-017 | 세션 정답률 100% | `average_accuracy = 100` | 차트 | 막대 최대 높이 | Should | ⬜ |
| ODB-UI-018 | 탭 키 네비게이션 | — | Tab으로 주요 UI 순회 | 포커스 논리적 | Should | ⬜ |
| ODB-UI-019 | 새로고침 | F5 | — | 동일 데이터 렌더 (1회 fetch 재실행) | Should | ⬜ |
| ODB-UI-020 | 세션 이름 정확히 8자 | `title.length = 8` | — | 축약 없음, 그대로 표시 | Should | ⬜ |
| ODB-UI-021 | 세션 이름 정확히 9자 | `title.length = 9` | — | 8자 + "..." | Should | ⬜ |
| ODB-UI-022 | 이탈 위험 수강생 20명 | `at_risk_list.length = 20` | — | 스크롤로 모두 표시, 레이아웃 깨짐 없음 | Could | ⬜ |
| ODB-UI-023 | 로딩 상태 | API 응답 대기 중 | — | 스피너 또는 스켈레톤, 빈 화면 아님 | Should | ⬜ |
| ODB-UI-024 | 뒤로가기 | `/owner`에서 뒤로가기 | — | 이전 페이지 또는 로그인 | Could | ⬜ |

## 2. API 계약

| TC ID | 엔드포인트 | 요청 | 기대응답 | RLS/인가 | 우선순위 | 상태 |
|-------|-----------|------|---------|---------|---------|------|
| ODB-API-001 | `GET /api/dashboard` 정상 | 원장 쿠키 | `200 { data: DashboardData }` with `total_sessions`, `active_sessions`, `total_students`, `at_risk_students`, `session_stats[]`, `at_risk_list[]` | **원장 role만** (커밋 `b081bed` 회귀) | Must | ⬜ |
| ODB-API-002 | `academy_id` 스코프 | — | 본인 학원 데이터만 집계 | RLS | Must | ⬜ |
| ODB-API-003 | 강사 role 접근 시도 | 강사 쿠키로 호출 | `403` | role 체크 | Must | ⬜ |
| ODB-API-004 | 수강생/mentor role 접근 시도 | — | `403` | role 체크 | Must | ⬜ |
| ODB-API-005 | 빈 학원 (세션 0개) | 방금 가입한 원장 | `200 { data: { total_sessions: 0, session_stats: [], at_risk_list: [], ... } }` | — | Must | ⬜ |
| ODB-API-006 | `at_risk_students` 카운트 정확성 | HIGH=3, MEDIUM=2 | `at_risk_students = 5` 또는 HIGH만 카운트 — 정책 확인 | — | Should | ⬜ |
| ODB-API-007 | `average_accuracy` 계산 | 세션별 정답 평균 | 응답 0건 세션은 0 또는 제외 — 정책 확인 | — | Should | ⬜ |
| ODB-API-008 | 미인증 접근 | 쿠키 없음 | `401` | 인증 가드 | Must | ⬜ |
| ODB-API-009 | RLS 교차 — 타 학원 원장 | B 학원 원장이 A 학원 데이터 쿼리 | 본인 학원 데이터만 반환 | RLS | Must | ⬜ |
| ODB-API-010 | `session_stats` 구조 | — | 각 항목에 `session_id`, `title`, `average_accuracy` 포함 | — | Must | ⬜ |
| ODB-API-011 | `at_risk_list` 구조 | — | 각 항목에 `user_id`, `display_name`, `average_accuracy`, `risk_level` 포함 | — | Must | ⬜ |

## 3. Realtime

N/A — 1회 fetch. 세션/수강생 상태 변화는 새로고침 필요.

| TC ID | 채널/이벤트 | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|------------|---------|---------|---------|------|
| ODB-RT-001 | 수동 새로고침 | 세션 종료 후 F5 | KPI 카드 숫자 갱신 | Could | ⬜ |

## 4. 에러 / 엣지

| TC ID | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|------|
| ODB-ERR-001 | **타 학원 데이터 노출 금지** | A 원장의 응답에 B 학원 수치 미포함 (RLS 회귀) | Must | ⬜ |
| ODB-ERR-002 | **원장 role 체크 회귀** | 강사/수강생/mentor 쿠키로 `GET /api/dashboard` 직접 호출 | `403` (커밋 `b081bed` QA 2차 회귀) | Must | ⬜ |
| ODB-ERR-003 | `session_stats` null/undefined | — | `(data.session_stats ?? [])` 가드로 크래시 방지 | Should | ⬜ |
| ODB-ERR-004 | `at_risk_list` null | — | 동일 가드 | Should | ⬜ |
| ODB-ERR-005 | `display_name` 빈 문자열 | — | 이니셜 빈 원 렌더, 크래시 없음 | Could | ⬜ |
| ODB-ERR-006 | `session_stats`가 30개 이상 | — | BarChart X축 레이블 겹침 가능성 — 페이지네이션/스크롤 고려 | Could | ⬜ |
| ODB-ERR-007 | 네트워크 실패 | `fetch` 에러 | `data = null` → "데이터를 불러올 수 없습니다" 표시 | Should | ⬜ |
| ODB-ERR-008 | 원장 로그인 직후 | `profiles.role="owner"` 설정 완료 확인 | `/owner` 정상 접근 | Must | ⬜ |
| ODB-ERR-009 | 학원 ID NULL인 원장 | 잘못된 가입 상태 | 빈 집계 또는 에러 | Should | ⬜ |
| ODB-ERR-010 | XSS — 수강생 이름에 `<script>` | 이탈 위험 리스트에 노출 시 | React escape, 스크립트 실행 없음 | Must | ⬜ |
| ODB-ERR-011 | XSS — 세션 제목에 `<script>` | 차트 X축 레이블 | escape 렌더 | Must | ⬜ |
| ODB-ERR-012 | SQL injection — `academy_id` 변조 | 직접 API 호출 시 파라미터 조작 | Supabase 파라미터 바인딩으로 안전 | Must | ⬜ |
| ODB-ERR-013 | `average_accuracy` = NaN | 계산 에러 | `0` 또는 `"N/A"` 표시, 크래시 없음 | Should | ⬜ |
| ODB-ERR-014 | 접근성 — KPI 카드 | 숫자만 있는 KPI 카드에 `aria-label` ("전체 세션 10개") | Should | ⬜ |
| ODB-ERR-015 | 접근성 — BarChart | Recharts BarChart에 `aria-label` 또는 표 대안 | Could | ⬜ |
| ODB-ERR-016 | 레이트 리밋 — 대시보드 연속 새로고침 | 1초에 10회 F5 | 서버 레이트 리밋 응답 처리 또는 정상 | Could | ⬜ |
| ODB-ERR-017 | 한국어 에러 — 데이터 로드 실패 | "데이터를 불러올 수 없습니다" 정확한 텍스트 | Must | ⬜ |
| ODB-ERR-018 | `risk_level` 알 수 없는 값 | `"LOW"` 등 미정의 | 배지 fallback 렌더, 크래시 없음 | Should | ⬜ |
