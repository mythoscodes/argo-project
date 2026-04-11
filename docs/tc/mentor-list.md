# TC — 멘토 대시보드 (이탈 위험 리스트)

| 항목 | 값 |
|------|---|
| 라우트 | `/mentor` |
| 파일 | `src/app/mentor/page.tsx` |
| 역할 | 멘토 |
| 관련 기능 | F5 AI 코칭 — 조기 개입 |
| 주요 API | `GET /api/mentor/students` |
| Realtime 채널 | N/A |

> 수강생을 3단계 위험도(HIGH/MEDIUM/LOW)로 분류해 카드 리스트. `low_accuracy`, `speed_increase`, `absence` 3개 신호 조합. HIGH 건수가 1 이상이면 상단에 빨간 알림 배너.

---

## 1. UI 시나리오

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| MLS-UI-001 | 정상 로드 | 수강생 데이터 ≥ 1명 | 진입 | 헤더 "멘토 대시보드" + 탭(전체/위험/주의/양호) + 카드 리스트 | Must | ⬜ |
| MLS-UI-002 | HIGH 알림 배너 | `risk_level=HIGH` ≥ 1명 | 진입 | "오늘 상담이 필요한 수강생이 N명 있습니다" 빨간 배너 | Must | ⬜ |
| MLS-UI-003 | HIGH 0명 | 모두 MEDIUM/LOW | 진입 | 배너 미노출 | Should | ⬜ |
| MLS-UI-004 | 정렬 순서 | HIGH + MEDIUM + LOW 혼재 | 진입 | 카드 순서: HIGH → MEDIUM → LOW | Must | ⬜ |
| MLS-UI-005 | 탭 카운트 정확성 | — | 각 탭 관찰 | 전체/위험/주의/양호 숫자가 실제 필터링 결과와 일치 | Must | ⬜ |
| MLS-UI-006 | HIGH 필터 | — | "위험" 탭 클릭 | HIGH 수강생만 노출 | Must | ⬜ |
| MLS-UI-007 | LOW 필터 — 빈 상태 | LOW 0명 | "양호" 탭 | `EmptyState` "해당 수강생이 없습니다" | Should | ⬜ |
| MLS-UI-008 | 3-신호 인디케이터 색상 | `risk_signals.low_accuracy = true` | 카드 | "정답률 X%" 빨간 폰트 | Must | ⬜ |
| MLS-UI-009 | 응답 속도 신호 | `risk_signals.speed_increase = true` | 카드 | "응답 느림" 빨간 폰트 | Must | ⬜ |
| MLS-UI-010 | 결석 신호 | `risk_signals.absence = true` | 카드 | "결석 N회" 빨간 폰트 | Must | ⬜ |
| MLS-UI-011 | 카드 클릭 | — | 수강생 카드 클릭 | `/mentor/students/{student_id}`로 이동 | Must | ⬜ |
| MLS-UI-012 | 아바타 이니셜 | `display_name="홍길동"` | — | "홍" 첫 글자, 위험도별 배경색 | Should | ⬜ |
| MLS-UI-013 | 위험도 배지 색상 | HIGH/MEDIUM/LOW | — | `risk_high`/`risk_medium`/`risk_low` variant, 각각 위험/주의/양호 라벨 | Should | ⬜ |
| MLS-UI-014 | summary 텍스트 | `summary`가 긴 문자열 | — | `truncate`로 1줄 축약 | Should | ⬜ |

---

## 2. API 계약

| TC ID | 엔드포인트 | 요청 | 기대응답 | RLS/인가 | 우선순위 | 상태 |
|-------|-----------|------|---------|---------|---------|------|
| MLS-API-001 | `GET /api/mentor/students` 정상 | 멘토 쿠키 | `200 { data: StudentRisk[] }`, 각 행에 `risk_level`, `risk_signals`, `recent_accuracy`, `consecutive_absences`, `summary` | 본인 학원 수강생만 | Must | ⬜ |
| MLS-API-002 | `RISK_SPEED_INCREASE_RATIO` 상수 사용 | 응답 속도 계산 로직 | `src/lib/constants.ts`의 상수 기반 (커밋 `06ed4d2` — 매직 넘버 1.3 상수화) | — | Must | ⬜ |
| MLS-API-003 | 타 학원 수강생 격리 | A 학원 멘토 | B 학원 수강생 미노출 (RLS) | academy_id 격리 | Must | ⬜ |
| MLS-API-004 | 수강생 0명 | 학원 신규 상태 | `200 { data: [] }` | — | Should | ⬜ |
| MLS-API-005 | 강사/수강생 role 접근 | — | `403` 또는 리다이렉트 (멘토 전용) | role 체크 | Must | ⬜ |
| MLS-API-006 | risk_level 계산 임계값 | 신호 3개 중 몇 개로 HIGH? | 정책: HIGH=신호 2개 이상, MEDIUM=1개, LOW=0개 (확인 필요) | — | Should | ⬜ |

---

## 3. Realtime

N/A — 1회 fetch. 상담 후 상태 갱신을 위해서는 수동 새로고침 필요 (추후 Could).

---

## 4. 에러 / 엣지

| TC ID | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|------|
| MLS-ERR-001 | `GET /api/mentor/students` 실패 | 500 응답 | `students = []` 빈 상태 (silent) — **에러 토스트 추가 권장** | Should | ⬜ |
| MLS-ERR-002 | `display_name` 빈 문자열 | 이니셜 로직 | `.charAt(0)`이 빈 문자열 → 빈 원 (크래시 없음) | Could | ⬜ |
| MLS-ERR-003 | `consecutive_absences` null | — | 출석 양호로 표시 (falsy 가드) | Should | ⬜ |
| MLS-ERR-004 | 알 수 없는 `risk_level` | 서버 이상 | `RISK_CONFIG[level]` undefined 접근 크래시 가능성 → **가드 필요** | Should | ⬜ |
| MLS-ERR-005 | 멘토 role 부재 — `/mentor` 직접 접근 | memory 기록: home/login/register에 mentor 분기 없음 | 레이아웃 가드 또는 RLS로 차단 필요 — **회귀 리스크** | Must | ⬜ |
| MLS-ERR-006 | 매우 긴 `summary` | — | `truncate` 클래스로 1줄 제한 | Could | ⬜ |

---

## 5. 경계값 테스트

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| MLS-BND-001 | 수강생 정확히 1명 | — | 진입 | 카드 1개 렌더, 탭 카운트 1 | Should | ⬜ |
| MLS-BND-002 | 수강생 100명 이상 | — | 진입 | 전체 카드 렌더 또는 페이지네이션, 성능 이슈 없음 | Could | ⬜ |
| MLS-BND-003 | 신호 0개 (LOW) | `risk_signals = { low_accuracy: false, speed_increase: false, absence: false }` | 카드 | 3개 신호 모두 초록, "양호" 배지 | Must | ⬜ |
| MLS-BND-004 | 신호 정확히 1개 (MEDIUM) | `low_accuracy: true` 만 | 카드 | "주의" 배지, 나머지 2개 신호 초록 | Must | ⬜ |
| MLS-BND-005 | 신호 정확히 2개 (HIGH 기준 확인) | `low_accuracy: true`, `absence: true` | 카드 | 정책에 따라 "위험" 또는 "주의" — **정책 SSoT 확인 필요** | Must | ⬜ |
| MLS-BND-006 | 신호 3개 모두 (HIGH) | 모든 신호 true | 카드 | "위험" 배지, 3개 신호 모두 빨강 | Must | ⬜ |
| MLS-BND-007 | `recent_accuracy = 0` | — | 카드 | "정답률 0%" 빨간 폰트 (LOW_ACCURACY_THRESHOLD 미만) | Should | ⬜ |
| MLS-BND-008 | `recent_accuracy = 100` | — | 카드 | "정답률 100%" 초록 폰트 | Should | ⬜ |
| MLS-BND-009 | `consecutive_absences = 0` | — | 카드 | 결석 신호 미표시 (출석 양호) | Should | ⬜ |
| MLS-BND-010 | HIGH 배너 카운트 N = 1 | HIGH 1명 | 배너 | "오늘 상담이 필요한 수강생이 1명 있습니다" (단수 처리) | Should | ⬜ |
| MLS-BND-011 | HIGH 배너 카운트 N = 50 | HIGH 50명 | 배너 | "50명" 올바른 숫자 표시 | Could | ⬜ |
| MLS-BND-012 | `display_name` 1글자 | `"A"` | 아바타 | "A" 이니셜, 크래시 없음 | Could | ⬜ |

---

## 6. 인증 컨텍스트

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| MLS-AUTH-001 | 비인증 접근 | 쿠키 없음 | `/mentor` 직접 접근 | `/login`으로 리다이렉트 | Must | ⬜ |
| MLS-AUTH-002 | teacher role 접근 | teacher 쿠키 | `/mentor` 접근 | `/instructor`로 리다이렉트 (mentor layout guard) | Must | ⬜ |
| MLS-AUTH-003 | student role 접근 | student 쿠키 | `/mentor` 접근 | `/student` 또는 `/login`으로 리다이렉트 | Must | ⬜ |
| MLS-AUTH-004 | owner role 접근 | owner 쿠키 | `/mentor` 접근 | `/owner`로 리다이렉트 | Must | ⬜ |
| MLS-AUTH-005 | mentor 인증 후 `/api/mentor/students` | mentor 쿠키 | GET 요청 | `200` 정상 응답 | Must | ⬜ |
| MLS-AUTH-006 | `GET /api/mentor/students` — teacher 토큰 | teacher 쿠키 | API 직접 호출 | `403` (mentor 전용) | Must | ⬜ |
| MLS-AUTH-007 | `GET /api/mentor/students` — student 토큰 | student 쿠키 | API 직접 호출 | `403` | Must | ⬜ |
| MLS-AUTH-008 | 세션 만료 후 대시보드 새로고침 | 쿠키 만료 | F5 | `/login`으로 리다이렉트 | Should | ⬜ |

---

## 7. 네트워크 에러

| TC ID | 시나리오 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| MLS-NET-001 | `GET /api/mentor/students` 타임아웃 | 진입 | 로딩 스피너 → 타임아웃 후 빈 상태 또는 에러 안내 | Should | ⬜ |
| MLS-NET-002 | `GET /api/mentor/students` 500 | 진입 | `students = []` 빈 상태, 에러 토스트 표시 (또는 silent — 패턴 확인) | Should | ⬜ |
| MLS-NET-003 | 오프라인 상태 진입 | 진입 | 에러 바운더리 또는 "데이터를 불러올 수 없습니다" 빈 상태 | Should | ⬜ |
| MLS-NET-004 | 부분 응답 (응답 도중 끊김) | 진입 | JSON 파싱 실패 처리, 크래시 없음 | Could | ⬜ |

---

## 8. 접근성

| TC ID | 시나리오 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| MLS-A11Y-001 | 키보드 탭 이동 | Tab 키 | 탭(전체/위험/주의/양호) → 카드들 → 각 카드 클릭 가능 | Should | ⬜ |
| MLS-A11Y-002 | Enter/Space로 카드 클릭 | 카드에 포커스 후 Enter | `/mentor/students/{id}`로 이동 | Should | ⬜ |
| MLS-A11Y-003 | 위험도 색 외 구분 | 색맹 사용자 | HIGH/MEDIUM/LOW가 텍스트 라벨("위험/주의/양호")로도 구분 | Should | ⬜ |
| MLS-A11Y-004 | `data-testid` 존재 | — | `[data-testid="mentor-dashboard"]`, `[data-testid="high-alert-banner"]`, `[data-testid="student-risk-card-{id}"]`, `[data-testid="tab-{level}"]` | Must | ⬜ |
| MLS-A11Y-005 | 알림 배너 ARIA | — | 배너에 `role="alert"` 또는 `aria-live="assertive"` | Could | ⬜ |
| MLS-A11Y-006 | 빈 상태 안내 | 탭 내 데이터 없음 | `aria-label` 또는 텍스트로 "해당 수강생이 없습니다" — 스크린리더 전달 | Should | ⬜ |

---

## 9. 한국어 에러 메시지

| TC ID | 시나리오 | 기대 에러 문구 | 우선순위 | 상태 |
|-------|---------|--------------|---------|------|
| MLS-KO-001 | API 실패 토스트 | "수강생 데이터를 불러오는 중 오류가 발생했습니다." | Should | ⬜ |
| MLS-KO-002 | 빈 상태 안내 | "담당 수강생이 없습니다." | Should | ⬜ |
| MLS-KO-003 | 탭 빈 상태 | "해당 수강생이 없습니다." | Should | ⬜ |
| MLS-KO-004 | 권한 없음 | "멘토 권한이 필요합니다." | Must | ⬜ |

---

## 10. RLS 교차 검증

| TC ID | 시나리오 | 전제조건 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|---------|------|
| MLS-RLS-001 | 타 학원 멘토 — 수강생 리스트 격리 | A 학원 mentor가 GET /api/mentor/students | B 학원 수강생 미노출 — `academy_id` RLS 격리 | Must | ⬜ |
| MLS-RLS-002 | `academy_id` 쿼리 분기 확인 | mentor의 academy_id 기반 세션 쿼리 | DB 레벨 + API 레벨 이중 격리 | Must | ⬜ |
| MLS-RLS-003 | 수강생 직접 URL 접근 차단 | mentor가 `/mentor/students/{타학원_id}` 직접 접근 | `404` 또는 빈 상태 (RLS 차단) | Must | ⬜ |
| MLS-RLS-004 | `profiles` 테이블 mentor RLS | mentor가 profiles SELECT | 본인 학원 프로필만 조회 가능 | Must | ⬜ |
| MLS-RLS-005 | `sessions` 테이블 격리 | mentor의 academy_id 기반 세션 필터링 | 타 학원 세션 데이터 기반 위험도 계산 불가 | Must | ⬜ |

---

## 11. XSS / SQL 인젝션

| TC ID | 시나리오 | 입력 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| MLS-SEC-001 | `display_name` XSS | DB에 `<script>alert(1)</script>` 저장 | React escape로 텍스트 렌더, 스크립트 실행 없음 | Must | ⬜ |
| MLS-SEC-002 | `summary` XSS | `<img onerror=alert(1)>` | truncate + escape 처리 | Must | ⬜ |
| MLS-SEC-003 | API 쿼리 파라미터 — GET에 주입 | `/api/mentor/students?filter='; DROP TABLE--` | Supabase 파라미터 바인딩으로 차단 | Must | ⬜ |
| MLS-SEC-004 | `consecutive_absences` 조작 | 음수 또는 문자열 전달 시 | API 응답 Zod 검증 — 크래시 없음 | Should | ⬜ |

---

## 12. 레이트 리밋

| TC ID | 시나리오 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| MLS-RL-001 | 빠른 탭 전환 | 4개 탭 연속 클릭 | 각 탭 필터링 즉시 적용 (API 재호출 없이 클라이언트 필터) | Should | ⬜ |
| MLS-RL-002 | 대시보드 빠른 새로고침 | 5초 내 5회 새로고침 | 매번 정상 렌더, 서버 과부하 없음 | Could | ⬜ |
| MLS-RL-003 | 여러 멘토 동시 접근 | A, B 멘토 동시 접속 | 각자 독립 데이터 조회, 간섭 없음 | Could | ⬜ |

---

## 13. 브라우저 네비게이션 복구

| TC ID | 시나리오 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| MLS-NAV-001 | 수강생 상세 → 뒤로가기 | 카드 클릭 → 뒤로 | 대시보드 재렌더, 탭 상태 유지 여부 확인 | Should | ⬜ |
| MLS-NAV-002 | 대시보드 새로고침 | F5 | 데이터 재페칭, 탭은 기본값("전체") 으로 초기화 | Must | ⬜ |
| MLS-NAV-003 | 뒤로 → 앞으로 | 브라우저 앞/뒤 반복 | 대시보드 정상 렌더, 데이터 꼬임 없음 | Should | ⬜ |
| MLS-NAV-004 | 로그인 → 대시보드 진입 | 최초 로그인 후 | `/mentor`로 정상 리다이렉트 | Must | ⬜ |
| MLS-NAV-005 | 세션 만료 중 카드 클릭 | 쿠키 만료 후 클릭 | `/login`으로 리다이렉트 | Should | ⬜ |
