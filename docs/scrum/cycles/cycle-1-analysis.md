# Cycle 1 분석 (analyst-2)

실행일: 2026-04-11  
Cycle 범위: T1–T7 (mentor 라우팅 fix + 회귀 4건 + 기본 26 E2E tests)  
데이터 소스: `e2e-results.md`, `dev-changelog.md`, `critique.md`, `acceptance-criteria.md`

---

## 1. 성과 요약

| 항목 | 수치 |
|------|------|
| E2E 통과율 | **26/26 = 100%** (2회 연속 확인) |
| AC 달성률 | **AC-1~8 전부 GREEN** |
| 총 소요시간 (T1→T7) | ~36시간 (2026-04-10 시작 → 2026-04-11 24.1s 최종 실행) |
| 변경 파일 수 | **14개** (코드 11 + 마이그레이션 1 + 테스트 스펙 3) |
| 신규 마이그레이션 | 1건 (`00007_add_mentor_role.sql`) |
| AC-8 위반 신규 도입 | **0건** (`any` 0, `console.log` 0, 매직넘버 0) |
| 문서화 TC 수 | 381 (사전 작성) |
| 자동화 TC 수 | **26** (6.8%) |

---

## 2. 결과 상세

### 2-1. mentor 라우팅 fix (AC-1~4)

**수정 파일 목록** (T4 + T4-hotfix 합산):

| 파일 | 핵심 변경 |
|------|-----------|
| `supabase/migrations/00007_add_mentor_role.sql` | `profiles.role` CHECK에 `'mentor'` 추가, `consultation_notes` INSERT RLS role 복원 + mentor SELECT 범위 추가 |
| `src/app/api/auth/register/route.ts` | Zod enum `"mentor"` 추가 |
| `src/app/register/page.tsx` | `ROLE_OPTIONS` mentor 항목 + `/mentor` 리다이렉트 |
| `src/app/login/page.tsx` | switch `case "mentor": router.push("/mentor")` |
| `src/app/page.tsx` | switch `case "mentor": redirect("/mentor")` |
| `src/app/mentor/layout.tsx` | Server Component 전환 + role guard (비-mentor → 각자 홈) |
| `src/app/owner/layout.tsx` | 동일 role guard (T4 범위 확장) |
| `src/app/instructor/layout.tsx` | 동일 role guard (T4 범위 확장) |
| `src/app/student/layout.tsx` | 동일 role guard (T4 범위 확장) |

**E2E 검증 결과 (`01-mentor-auth.spec.ts`)**:

| 테스트 | AC | 결과 |
|--------|----|------|
| mentor 계정 `/` 접속 → `/mentor` 리다이렉트 | CMN-UI-002 | ✅ PASS |
| `/mentor` 대시보드 렌더링 | MNT-UI-001 | ✅ PASS |
| mentor → `/instructor` 접근 시 리다이렉트 | MNT-UI-003 | ✅ PASS |
| `/api/sessions` GET — mentor 접근 가능 | MNT-API-001 | ✅ PASS |
| `/api/sessions/:id` GET — mentor 접근 가능 | MNT-API-002 | ✅ PASS |
| `/api/mentor/consultation-notes` GET/POST | MNT-API-003/004 | ✅ PASS |
| `/api/sessions` POST — mentor 생성 불가 403 | MNT-SEC-001 | ✅ PASS |
| `consultation_notes` INSERT RLS role 체크 | MNT-SEC-002 | ✅ PASS |

**잔여 gap / 인정 사항:**

- analyst 초기 스캔(`analysis.md`)은 `/api/mentor/` 하위 3개 파일만 커버. `/api/ai/mentor-briefing`, `/api/ai/analysis`, `/api/ai/report` 3개 파일의 mentor role 차단은 critic-2가 N-1~N-3으로 발견 → dev-2가 T4에서 처리 완료.
- `owner/instructor/student layout.tsx` role guard 누락은 analyst가 `mentor/layout.tsx`만 지적했으나 dev-2가 QA 실행 중 전체 layout 점검을 통해 일괄 추가 (T4 범위 자체 확장). **analyst 초기 스캔의 구조적 갭** — Cycle 2에서는 `src/app/*/layout.tsx` 전체가 스캔 체크리스트에 포함되어야 함.

### 2-2. 회귀 4건 고정 (AC-5)

| 회귀 | 검증 방법 | 결과 |
|------|-----------|------|
| `mentor` role DB CHECK 제약 | REG-001a — `profiles.role CHECK` 포함 확인 | ✅ PASS |
| `consultation_notes` INSERT RLS role 체크 | REG-001b — migration 00007 복원 확인 | ✅ PASS |
| `teacher/student → /owner` 접근 거부 | REG-002a/002b — role guard 동작 | ✅ PASS |
| `NEXT_PUBLIC_` 접두사 키 노출 없음 | REG-003 | ✅ PASS |
| draft 세션 `join_code` DOM 미노출 | REG-004 / ISD-ERR-001 | ✅ PASS |
| `owner` SELECT RLS 격리 | REG-005 (부가) | ✅ PASS |

**T7-hotfix 추가 변경**: `join_code` 생성 시점을 POST(draft) → PATCH(active 전환) 시로 이동. `ISD-ERR-001` 테스트가 이 정책을 전제하고 있어 기존 코드 상태에서 테스트 실패 → dev-2가 핫픽스로 처리.

### 2-3. Playwright 인프라 (AC-6)

- `@playwright/test ^1.59.1` devDependencies 정상 등록
- `playwright.config.ts`: `baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'`, `testDir = 'tests/e2e'`, `reporter = 'list'` — AC-6 요건 전부 충족
- `npm run test:e2e` 스크립트 존재 확인
- `global-setup.ts` warm-up 미구현 상태에서도 26/26 통과. **원인**: 26개 테스트 규모가 소규모여서 cold-start 불안정성이 표면화되지 않음. 1143개 규모(Cycle 2)에서는 warm-up 없이 flaky 발생 가능 → Cycle 2 시작 전 패치 필요.

---

## 3. 실패 케이스 전수 분석

T7에서 발생한 실패는 최종 결과가 아닌 **실행 중 발생 후 수정된 이슈** 기준으로 분류한다.

### Issue 1: profiles RLS 무한재귀 — **환경 이슈**

| 항목 | 내용 |
|------|------|
| 분류 | 환경 (원격 DB 마이그레이션 미적용) |
| 증상 | 모든 인증 후 API 500, `ERR_TOO_MANY_REDIRECTS` |
| 근본 원인 | `00006_fix_profiles_rls_recursion.sql`이 로컬에만 있고 원격 Supabase에 미적용 상태 |
| 수정 | MCP `apply_migration`으로 원격 적용 |
| 코드 버그 여부 | 없음 — 마이그레이션 배포 프로세스 누락 |
| 재현 가능성 | CI/CD 없는 환경에서 구조적으로 반복 가능 |

**Cycle 2 방지 조치**: `npm run test:e2e` 실행 전 마이그레이션 상태 확인 절차 표준화. `supabase db push --dry-run`으로 로컬/원격 drift 체크.

### Issue 2: ISN-UI-001 셀렉터 불일치 — **스펙 오류 (테스트 코드 버그)**

| 항목 | 내용 |
|------|------|
| 분류 | 스펙 오류 |
| 증상 | `input[name="title"]` 셀렉터 미매칭 |
| 근본 원인 | 실제 DOM은 `id="title"` (name 속성 없음) — QA가 코드를 확인하지 않고 관례적 셀렉터 사용 |
| 수정 | `page.fill('#title', ...)` 로 수정 |
| 코드 버그 여부 | 없음 — 프로덕션 코드 정상 |

### Issue 3: join_code 정규식 오류 — **스펙 오류 (테스트 코드 버그)**

| 항목 | 내용 |
|------|------|
| 분류 | 스펙 오류 |
| 증상 | `/\b\d{6}\b/` 패턴이 영숫자 혼합 코드 미탐지 |
| 근본 원인 | `generateJoinCode()` charset이 `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — 숫자 전용 정규식 오류 |
| 수정 | `/\b[A-Z0-9]{6}\b/` 로 변경 |
| 코드 버그 여부 | 없음 — 상수(`SESSION_CODE_LENGTH`) 이미 반영됨 |

### 잔여 이슈 (PASS 후 발견, 기능 동작 정상)

| ID | 분류 | 내용 | 심각도 |
|----|------|------|--------|
| REM-001 | 아키텍처 개선 | `owner/layout.tsx` role guard — T4-hotfix로 이미 추가됨, E2E 검증 완료 | 해소 |
| REM-002 | 비즈니스 로직 | `join_code` draft 시 사전 생성 → T7-hotfix로 `active` 전환 시 발급으로 수정, PASS | 해소 |

---

## 4. 프로세스 이슈

### 4-1. 팀 구성 혼선 (opus → sonnet 재스폰)

초기 opus 에이전트가 shutdown 후 sonnet 재스폰 시 `-2` suffix가 붙어 analyst-2 / critic-2 / dev-2로 분리됨. 초기 프롬프트의 팀원 이름과 실제 이름이 불일치해 첫 메시지 라운드에서 소통 지연 발생. **해소됨** (team-lead가 이름 매핑 정정).

### 4-2. Analyst 스캔 범위 갭 (가장 큰 프로세스 이슈)

분석(T2) 당시 스캔 범위가 `/api/mentor/**` 하위로 한정됨. `/api/ai/**` 3개 파일은 "mentor 브리핑 API"라는 기능적 연결이 명확함에도 관련 파일로 추적하지 않아 누락.

- **누락된 파일**: `mentor-briefing/route.ts`, `analysis/route.ts`, `report/route.ts`
- **탐지 주체**: critic-2 (N-1~N-3)
- **수정 주체**: dev-2 (T4 포함)
- **영향**: 스프린트 내 해결됐으나 만약 critic 단계가 없었다면 mentor가 자신의 핵심 기능(AI 브리핑)을 사용할 수 없는 상태로 배포됐을 것

**Cycle 2 개선**: 분석 체크리스트에 "기능 연결 추적" 항목 추가 — 특정 role이 주요 사용자인 API Route는 `/api/{role}/` 외에 `/api/ai/`에도 해당 기능이 있는지 연관 파일 추적 필수.

### 4-3. Layout guard 전수 스캔 누락

`mentor/layout.tsx` role guard 부재만 지적했으나 `owner/instructor/student/layout.tsx`도 동일 문제. **최소 전제**: 새 route가 추가되거나 layout이 변경될 때는 `src/app/*/layout.tsx` 전체 glob 후 role guard 유무를 테이블로 작성.

### 4-4. QA 스펙 작성 시 코드 미확인 (Issue 2, 3)

QA가 스펙을 작성할 때 실제 DOM 구조(id/name 속성), 실제 생성 로직(charset)을 확인하지 않고 관례로 셀렉터를 작성 → 첫 실행에서 실패. QA 스펙 작성 전 관련 컴포넌트 파일 Read 필수.

---

## 5. 통계

| 항목 | Cycle 1 | Cycle 2 목표 |
|------|---------|--------------|
| 문서화 TC | 381 | **1,143** (3배) |
| 자동화 TC | 26 | **1,143** (100%) |
| 자동화 커버리지 | 6.8% | 100% |
| 스펙 파일 | 4개 | ~15개 (화면별) |
| 실패 → 수정 사이클 | 3건 (모두 환경/스펙) | 코드 버그 0 목표 |
| layout guard 커버 | 4/4 (mentor+owner+instructor+student) | 유지 |

---

## 6. Cycle 2 이월 교훈 + 체크리스트

### 분석 단계 개선 (analyst-2 적용 사항)

| # | 교훈 | Cycle 2 적용 방법 |
|---|------|-------------------|
| A-1 | `/api/*/` 스캔 시 연결된 `/api/ai/` 파일도 추적 | 분석 시 "기능 → 관련 API 전체" 그래프 추적 |
| A-2 | `src/app/*/layout.tsx` 전체 glob 필수 | 분석 체크리스트 첫 항목으로 고정 |
| A-3 | 실패 분류 시 환경/코드/스펙/flaky 4분류 즉시 적용 | 이번 cycle 기준 확립됨 |

### Dev 단계 개선

| # | 교훈 | Cycle 2 적용 방법 |
|---|------|-------------------|
| D-1 | 마이그레이션을 로컬/원격 동시 적용 후 테스트 | `npm run test:e2e` 전 `supabase db push` 체크 |
| D-2 | `join_code`는 draft에 null, active 전환 시 발급 정책 확정 | T7-hotfix로 코드 적용 완료 |
| D-3 | global-setup warm-up — 1143 tests 규모에서 flaky 방지 필수 | Cycle 2 시작 전 `global-setup.ts` 패치 |

### QA 단계 개선

| # | 교훈 | Cycle 2 적용 방법 |
|---|------|-------------------|
| Q-1 | 스펙 작성 전 관련 컴포넌트 `Read` 필수 (셀렉터 정확도) | QA 스펙 작성 전 해당 `.tsx` 파일 Read 체크 |
| Q-2 | charset/정규식은 실제 코드(`constants.ts`) 기반 작성 | 상수 파일 우선 참조 |
| Q-3 | RLS 교차 검증 자동화 — 타 학원/타 수강생 시나리오 | `02-regression.spec.ts`에 RLS 교차 케이스 추가 |

### silent failure 원칙 (Cycle 2 전역 적용)

- `catch {}` 또는 `catch (e) { /* empty */ }` 금지
- Supabase `{ data, error }` 구조분해 시 `error` 반드시 처리
- `useEffect` 내 async 함수에 에러 상태(`setError`) 필수
- `use-realtime.ts` 패턴: `CHANNEL_ERROR / TIMED_OUT` 핸들링 + `error` 필드 반환 (T4에서 적용 완료, 패턴으로 고정)

---

## 7. Cycle 2 작업 범위 예고

**T10 — TC 시트 3배 확장** (analyst-2 담당 6화면):

| 화면 | 현재 | 목표 | 주요 추가 케이스 |
|------|------|------|-----------------|
| `student-join.md` | 25 | 75 | 입력 경계값, ARIA, 인증 조합, rate limit |
| `student-session.md` | 33 | 99 | Realtime 역전/누락, Round 2 전환, 이중 제출 |
| `student-result.md` | 22 | 66 | RLS 교차 검증, 라운드 혼재, silent failure |
| `student-report.md` | 22 | 66 | AI 실패 처리, 중복 생성, 차트 과밀 |
| `mentor-list.md` | 26 | 78 | RISK_CONFIG 가드, mentor role 가드 검증, 3-신호 조합 |
| `mentor-student-detail.md` | 42 | 126 | AI 브리핑 silent, 상담 저장 silent, XSS, RadarChart 엣지 |
| **합계** | **170** | **510** | |

---

## 8. critic-2 / planner에게 전달할 키 포인트

### critic-2에게

1. **Cycle 1의 가장 큰 리스크**: analyst 초기 스캔 범위 갭(`/api/ai/` 누락). critic이 없었다면 mentor 브리핑 기능이 broken 상태로 배포됨. **Cycle 2 분석 리포트 검토 시 "기능 연결 API" 추적 여부를 첫 번째 비평 항목으로 고정 요청**.
2. **silent failure**: T4에서 `use-realtime.ts` 에러 처리가 추가됐으나, Cycle 2 TC 확장에서 이 패턴이 다른 `useEffect` 훅에도 일관 적용됐는지 확인 필요.
3. **RLS 교차 검증**: REG-005(owner SELECT RLS)는 통과했으나 "타 학원 mentor가 타 학원 수강생 URL 직접 접근" 케이스가 자동화 미포함. Cycle 2 회귀 스펙 추가 우선 검토.

### planner에게

1. **Cycle 2 우선 작업 순서**: global-setup warm-up 패치 → TC 3배 확장(T10) → Playwright 스펙 100% 자동화(T11) → 반복 실행(T12) 순이 의존성상 올바름.
2. **mentor 세션 접근 범위**: `mentor-briefing/route.ts` N-8 이슈는 T4에서 "academy_id 기반으로 분기"로 처리됐으나, 비즈니스 요건("mentor는 학원 내 전체 세션을 볼 수 있는가 vs 배정 세션만?")이 아직 명시적으로 결정되지 않음. Cycle 2 기획 시 mentor 세션 접근 정책 문서화 요청.
3. **자동화 커버리지 점프**: 6.8% → 100% 목표는 큰 점프. TC 1,143개 실행 시 소요시간 예상치(~24s × 44 = ~1,056s)와 병렬화 설정(`workers`) 고려 필요.
