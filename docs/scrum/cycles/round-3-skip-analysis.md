# Cycle 3 SKIP 781건 분류 재확인 — 2026-04-11

작성자: analyst-2  
데이터 소스: Round 2.5 final (313/0/0/781), `test.skip` 직접 grep 조사  
목적: Cycle 3에서 실제 해제 가능한 건수 추정 (cycle-3-backlog.md A-2 재검증)

---

## 1. 핵심 발견 — 두 가지 다른 SKIP 유형

SKIP 781건은 **성격이 다른 두 유형**이 혼재. backlog 분류표와 실제 코드 상태가 다름.

| 유형 | 건수 | 해제 방법 |
|------|------|----------|
| **유형 A: 조건부 cascade skip** | ~186 | 선행 fixture(세션/수강생) 성공 시 자동 실행 |
| **유형 B: 의도적 플레이스홀더 skip** | ~612 | 테스트 코드 작성 필요 (skip 제거만으로 해제 불가) |
| 기타 (02-regression 등) | ~3 | 개별 확인 필요 |

**결론**: backlog가 "기타 의도적 skip ~569"로 분류한 범주의 실체는 `test.skip(true, 'Cycle 2: ... T12에서 구현')` 플레이스홀더 612건. `test.skip`을 제거해도 테스트 본문이 없으므로 실행 불가. **qa가 실제 단언 코드를 작성해야 활성화 가능.**

---

## 2. 유형 A — 조건부 cascade skip (~186건)

### 특징
```ts
if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
// 이 아래에 실제 테스트 로직 있음
```
선행 fixture(세션 생성, 수강생 조회)가 성공하면 자동 실행. 테스트 로직은 이미 완성됨.

### 파일별 분포

| 파일 | cascade skip 수 | 선행 fixture |
|------|----------------|-------------|
| `ui/instructor-session-detail.spec.ts` | ~48 | 세션 생성 (teacher auth) |
| `ui/mentor-student-detail.spec.ts` | ~37 | 수강생 조회 (mentor auth) |
| `api/participants.spec.ts` | 21 | 세션 생성 + 참여 |
| `ui/student-session.spec.ts` | ~12 | 세션 생성 + 참여 |
| `realtime/quiz-broadcast.spec.ts` | 12 | 세션 + 퀴즈 + 수강생 |
| `realtime/heatmap-update.spec.ts` | ~19 | 세션 생성 |
| `ui/student-join.spec.ts` | ~12 | 세션 생성 |
| `api/ai.spec.ts` | 7 | 세션 생성 |
| `api/sessions.spec.ts` | 6 | 세션 생성 |
| `ui/instructor-session-reports.spec.ts` | ~9 | 세션 생성 |
| `ui/student-result.spec.ts` | 2 | 세션 생성 |
| `ui/student-report.spec.ts` | 1 | 세션 생성 |

### 해제 조건
cascade의 대부분은 **세션 생성 실패** 또는 **수강생 조회 실패**. Round 2.5에서 ISN의 `beforeAll` fresh 로그인 패턴이 효과적이었으므로, 다른 spec들도 동일 패턴으로 fixture 안정화 시 해제 가능.

**예상 해제 건수**: ~120~150건 (전체 186 중 일부는 cascading chain — 하나 fixture 성공으로 다수 해제)

---

## 3. 유형 B — 의도적 플레이스홀더 (~612건)

### 특징
```ts
test.skip(true, 'Cycle 2: 리포트 생성 후 화면 확인 — T12에서 구현');
// 테스트 본문 없음 — 단순 플레이스홀더
```
T12에서 구현 예정이었으나 T12가 FAIL 0 달성 집중 → 실제 테스트 코드 미작성.

### 파일별 분포 + 해제 난이도

| 파일 | 플레이스홀더 수 | 주요 카테고리 | 인프라 필요 | 해제 난이도 |
|------|-------------|------------|----------|----------|
| `ui/instructor-session-detail.spec.ts` | 93 | F2 퀴즈 UI, F4 히트맵, F5 코칭 | AI 호출 포함 | 중~고 |
| `ui/mentor-student-detail.spec.ts` | 73 | F9 멘토 브리핑·상담 | AI 브리핑 포함 | 중 |
| `ui/student-session.spec.ts` | 79 | F3 응답·Realtime | Realtime 필요 | 고 |
| `ui/student-report.spec.ts` | 58 | F7 AI 리포트 | AI 호출 필요 | 고 |
| `ui/student-result.spec.ts` | 53 | F6 결과·피드백 | 없음 | **낮음** |
| `ui/student-join.spec.ts` | 35 | F1 join_code | 없음 | **낮음** |
| `ui/instructor-session-reports.spec.ts` | 35 | F7 리포트 분석 | AI 포함 | 중 |
| `ui/register.spec.ts` | 26 | 회원가입 시나리오 | 없음 | **낮음** |
| `ui/mentor-list.spec.ts` | 56 | F8/F9 멘토 목록 | 없음 | **낮음** |
| `ui/owner-dashboard.spec.ts` | 31 | F8 대시보드 | 없음 | **낮음** |
| `ui/instructor-dashboard.spec.ts` | 18 | F1 강사 목록 | 없음 | **낮음** |
| `ui/login.spec.ts` | 12 | 인증 시나리오 | 없음 | **낮음** |
| `ui/common-home.spec.ts` | 14 | 인증·역할 리다이렉트 | 없음 | **낮음** |
| `ui/instructor-session-new.spec.ts` | 19 | F1 세션 생성 | 없음 | **낮음** |
| `realtime/heatmap-update.spec.ts` | 8 | Realtime 이벤트 | Realtime | 고 |
| `api/participants.spec.ts` | 2 | P6 RLS 추가 검증 | 없음 | **낮음** |

---

## 4. Cycle 3 단계별 해제 권고

### Round 3.1~3.2: 유형 A 해제 (cascade fix)
**담당: qa/dev-2 fixture 안정화**
- 예상 해제: ~120~150건 PASS 전환
- 방법: `beforeAll` fresh 로그인 패턴 전파 (ISN 성공 패턴 적용)
- 위험: Realtime 관련 cascade (quiz-broadcast 12건) — `--workers=1` 별도 실행 권고

### Round 3.3: 유형 B 해제 (테스트 코드 작성)
**우선순위 1 — 인프라 불필요 (~251건):**
- `student-result.spec.ts` 53건: F6 결과 페이지, 구현 완료, 테스트만 작성
- `student-join.spec.ts` 35건: join_code 입력 시나리오, 구현 완료
- `mentor-list.spec.ts` 56건: 멘토 목록·위험 신호 배지, 구현 완료
- `owner-dashboard.spec.ts` 31건: F8 대시보드, 구현 완료
- `register.spec.ts` 26건: 회원가입 시나리오
- `instructor-dashboard.spec.ts` 18건: F1 강사 목록
- `login.spec.ts` 12건: 인증 시나리오
- `common-home.spec.ts` 14건: 역할 리다이렉트
- `instructor-session-new.spec.ts` 19건: 세션 생성 폼
- `participants.spec.ts` 2건: P6 RLS

**우선순위 2 — AI 스텁 후 해제 (~186건):**
- `instructor-session-detail.spec.ts` 93건 (AI 퀴즈 생성 관련)
- `student-report.spec.ts` 58건 (F7 AI 리포트)
- `instructor-session-reports.spec.ts` 35건 (분석 LineChart)
- → A-1 AI 스텁 모드 (E2E_STUB_MODE) 도입 후 해제 가능

**우선순위 3 — Realtime 격리 후 해제 (~87건):**
- `student-session.spec.ts` 79건 (F3 Realtime 응답)
- `realtime/heatmap-update.spec.ts` 8건
- → B-3 Realtime flaky 격리 CI 구축 후 단계적 해제

**우선순위 4 — 멘토 상세 (~73건):**
- `mentor-student-detail.spec.ts` 73건: AI 브리핑 + 상담 CRUD 혼합
- 순수 CRUD 부분(상담 기록)은 우선순위 1과 동일 난이도로 조기 해제 가능

---

## 5. Backlog 분류 정정 권고 (planner 참고)

| Backlog 항목 | 기존 수치 | 실제 수치 | 정정 이유 |
|-------------|---------|---------|---------|
| 기타 의도적 skip | ~569 | **~612** | 직접 grep 결과 |
| 세션 생성 실패 cascade | ~179 | **~186** | 조건부 skip grep 결과 |
| WebSocket Realtime | ~40 | **~87** (Realtime 포함 cascade + 플레이스홀더) | student-session 79건 재분류 |
| AI 응답 검증 | ~80 | **~186** | AI 의존 플레이스홀더 재집계 |
| 인프라 불필요 | 미기재 | **~251** | Round 3.3 우선순위 1 |

---

## 6. 요약

| 범주 | 건수 | Cycle 3 해제 가능 시점 |
|------|------|-------------------|
| Cascade fixture 실패 | ~186 | Round 3.1~3.2 (fixture 안정화) |
| 인프라 불필요 플레이스홀더 | ~251 | Round 3.3 (테스트 코드 작성) |
| AI 스텁 의존 | ~186 | Round 3.3 (A-1 스텁 모드 후) |
| Realtime 의존 | ~87 | Round 3.3 (B-3 격리 CI 후) |
| 멘토 상세 (혼합) | ~73 | Round 3.3 (부분 조기 가능) |
| **합계** | **~783** | (중복 가능성으로 실제 781과 근사) |

**Cycle 3에서 단계적 all-pass 진행 시 최대 달성 가능 PASS: ~251+186 = ~437건 추가** (Round 3.3 인프라 불필요 + cascade 해제 기준).
