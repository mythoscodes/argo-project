# Round 1 분석 — 2026-04-11

작성자: analyst-2  
데이터 소스: `docs/scrum/cycles/round-1-failures.md` (qa), team-lead 사전 검증, Wiki T15 작성 중 식별 리스크  

---

## 1. 요약

| 항목 | 수치 |
|------|------|
| 전체 TC | **1143** |
| PASS | **298** (26.1%) |
| FAIL | **120** (10.5%) |
| SKIP | **725** (63.4%) |
| 실행 시간 | **5.9분** |
| 자동화 범위 대비 실제 실행 | 418/1143 = 36.6% |

**핵심 판단**: 120 FAIL 중 40건 이상이 단일 환경 이슈(Supabase test 계정 패스워드 만료)에 의한 연쇄 실패. P0 환경 복구 전까지 코드 수정 효과 측정 불가. 725 SKIP의 구조적 원인 파악이 Round 2 설계의 핵심 과제.

---

## 2. 실패 카테고리 분류 (qa 분류 수용 + 보강)

### Cat-A: `/api/participants` 엔드포인트 없음 — **27건** ⚠️ 정정 (critic-2)

**원인 (Round 1 당시)**: Round 1 실행 시점에 `src/app/api/participants/route.ts` 부재 → 모든 요청 404.

**critic-2 정정 (2026-04-11)**: 현재 `src/app/api/participants/route.ts` **완전 구현 존재** 확인. POST(join_code 참여, student 전용) + GET(sessionId별 목록, teacher/owner 전용) 모두 Zod 검증 + role 체크 + 에러 처리 포함. 커밋 e313a83 이후 추가된 것으로 판단.

**현재 상태**: Round 1 당시엔 유효한 Cat-A였으나 **현재 해소**. Round 2에서 실제 응답 확인으로 재분류.

**dev-2 P1 "신규 구현" 액션 취소** — 구현 완료 상태.

**추가 리스크 (critic-2 발견)**: `POST /api/participants`의 session_participants INSERT에 academy_id 교차 참여 방어 없음 — 타 학원 수강생이 join_code만 알면 참여 가능. RLS 정책에서 막히는지 확인 필요 (Round 2 RLS 검증 대상).

**예상 해소**: ~27건 (환경 복구 후)

---

### Cat-B: storageState 만료 — auth 실패 연쇄 — **22건 (+ Cat-G 다수)**

**원인**: global-setup에서 저장된 access token이 2026-04-10 22:32 UTC 만료. middleware `updateSession`은 페이지 로드 시 쿠키 갱신에 성공하지만, React 클라이언트의 `fetch()` 호출은 갱신 전 쿠키를 사용해 401 반환.

**실제 P0 블로커**: 계정 패스워드 자체가 변경됨 → `global-setup.ts` 재실행 불가. dev-2가 Supabase 콘솔에서 비밀번호 확인/재설정 필요.

**연쇄 영향**:
- ISN-UI-001~020 (20건): 세션 생성 폼 제출 → API 401
- IDB-UI-006/017, IDB-API-001/002, IDB-ERR-001/010 (6건): 강사 대시보드 인증 실패
- CMN-ERR-012/014, LGN-UI-015, LGN-API-002/003 등 (추가)
- Cat-G의 MLS/MSD/SSP/SSR/SSN 다수: 동일 auth 만료 연쇄

**P0 완료 시 해소 예상**: ~40건 (Cat-B 22건 + Cat-G 중 auth 기인분)

**담당**: dev-2 (Supabase 콘솔 계정 복구)

---

### Cat-C: `request` fixture storageState 상속 — 스펙 설계 오류 — **8건**

**원인**: `test.use({ storageState: AUTH_STATE.teacher })` 파일 레벨 선언 시 `request` fixture도 해당 auth를 상속. "미인증" 테스트에서 실제로는 authenticated 상태로 요청 → 기대 401이 아닌 200/400/403 반환.

**보강 분석**: Playwright `request` fixture와 브라우저 컨텍스트는 storageState를 공유한다. 미인증 API 테스트는 반드시 `apiRequestContext = await playwright.request.newContext()` (storageState 없음)로 별도 컨텍스트 생성 필요. 이는 스펙 레벨 설계 오류 — `playwright.config.ts`의 기본값과 `test.use()` 상속 규칙에 대한 팀 공유 지식 부재.

**담당**: qa (spec 수정)  
**예상 해소**: ~8건

---

### Cat-D: ODB API camelCase vs snake_case — **6건** ✅ Wiki 선제 발견 확정

**원인**: `/api/dashboard` 응답이 camelCase 반환 (`totalSessions`, `activeSessions`, `atRiskStudents`)하나 spec은 snake_case (`total_sessions`, `active_sessions`)로 검증.

**Wiki 선제 발견 검증**: ✅ **확정**. `docs/wiki/api-dashboard.md` Gotcha 섹션에서 "DashboardData 타입 키와 API 응답 키 불일치 가능"으로 사전 식별. 실제 6건 실패로 확인 — Wiki 작성 단계의 코드 정밀 읽기가 실제 버그를 발견.

**실제 응답 구조 (qa 확인)**:
```json
{ "summary": { "totalSessions": 0, "activeSessions": 0, ... }, "atRiskStudents": [], "sessionStats": [] }
```

**픽스 방향**: spec을 camelCase로 수정 (API 응답이 정상, spec 오류).

**담당**: qa (spec 수정)  
**예상 해소**: 6건

---

### Cat-E: role-based redirect 미구현 — **10건** ⚠️ 오분류 정정 (critic-2)

**원래 분류**: teacher가 `/mentor`, `/student/*` 접근 시 역방향 redirect 미구현.

**critic-2 정정 (2026-04-11)**: `mentor/layout.tsx`, `instructor/layout.tsx`, `student/layout.tsx` 모두 `ROLE_HOME` 맵 기반 **양방향 redirect 완전 구현** 확인.

```ts
// src/app/mentor/layout.tsx
const ROLE_HOME: Record<string, string> = {
  teacher: "/instructor",
  student: "/student/join",
  owner: "/owner",
};
if (!profile || profile.role !== "mentor") {
  redirect(ROLE_HOME[profile?.role ?? ""] ?? "/login");
}
```

**재분류**: Cat-E 10건은 Cat-B(auth 만료) 연쇄 실패로 판단 — P0(계정 복구) 후 자동 해소 예상. "역방향 redirect 미구현" 오분류였음.

**P5 코드 추가 액션 취소** — 이미 구현 완료.  
**예상 해소**: P0 후 ~10건 자동 해소 (Cat-B 연쇄)

---

### Cat-F: 상태코드 허용 범위 누락 — **8건**

**원인**: spec이 좁은 상태코드 세트를 기대. 실제 구현이 스펙보다 더 방어적인 응답을 반환.

| TC ID | 실제 코드 | 현재 기대 | 수정 기대 |
|-------|---------|---------|---------|
| RT-QBR-005 | 400 | 200 | [200, 400] |
| RT-QBR-015 | 400 | 200 | [200, 400] |
| MSD-ERR-001 | 400 | [200, 404] | [200, 400, 404] |
| RT-HMU-010 | 400 | [400, 422] | 원인 재조사 필요 |

**보강 분석**: RT-QBR-005/015는 빈 sessionId 파라미터 처리 — API가 400 반환은 정상. spec이 200(빈 목록)을 기대한 것은 오설계. 스펙 수정이 맞음.

**담당**: qa (spec 수정)  
**예상 해소**: ~8건

---

### Cat-G: 복합 원인 미분류 — **추정 39건**

Cat-A~F 합계(27+22+8+6+10+8 = 81)를 뺀 나머지(120-81=39건). 주로:
- auth 만료(Cat-B 연쇄) + role redirect(Cat-E) 복합
- MLS-RLS-001/003/004, MSD-RLS-001/002/008: RLS 교차 검증 — P0(auth 복구) 후 재실행으로 실제 RLS 버그 여부 확인 필요
- MLS-A11Y-003: 텍스트 라벨 selector 불일치 — 스펙 또는 UI 텍스트 확인 필요
- SSP/SSR/SSN 다수: auth 만료 연쇄로 추정

**P0 복구 후 재분류 대상**: Cat-G 39건 중 auth 기인분이 해소되면 진짜 코드/RLS 버그가 드러남.

---

## 3. Wiki 선제 발견 3건 검증

| # | Wiki Gotcha | 실패 확인 | 상태 |
|---|------------|---------|------|
| 1 | DeltaChart `understanding_scores` snake_case vs API camelCase | ISD spec 재실행 대기 중 (pid 20345) | **Pending** — Round 2에서 재검증 |
| 2 | `/api/ai/report` studentId 누락 시 강사 400 | ISR-ERR-011 실패 — Cat-B(auth 만료) 기인으로 1차 분류 | **Pending** — P0 복구 후 확인 |
| 3 | `DashboardData` 타입 키 camelCase/snake_case 불일치 | ODB-UI-006, ODB-UI-013, ODB-API-001/005/008, ODB-ERR-010 6건 FAIL | ✅ **확정** |

**평가**: 3건 중 1건 Round 1에서 직접 확정. 나머지 2건은 auth 환경 문제로 인한 가려짐(masking) — P0 복구 후 Round 2에서 재검증 예정. Wiki 작성 단계의 코드 정밀 읽기가 실제 버그 사전 식별에 기여함.

---

## 4. 725 SKIP 패턴 분석

725 SKIP = 전체 1143의 **63.4%** — 구조적 문제 신호.

**원인 추정**:

1. **beforeAll 실패 연쇄** (~300건 추정): auth 계정 패스워드 만료 → `beforeAll` 로그인 실패 → describe 블록 내 모든 test가 skip으로 처리. 특히 ISN/IDB/SSP/SSR/SSN 파일에서 발생.

2. **explicit `test.skip()` 선언** (~200건 추정): T11에서 Playwright 스펙 100% 자동화 확장 시 미구현 기능(F6~F9 일부) 또는 CI 불안정 TC에 `.skip()` 선언. TC 시트에는 존재하나 자동화 범위 밖.

3. **의존 테스트 체인 실패** (~150건 추정): Cat-A(/api/participants) 실패로 해당 엔드포인트 의존 TC 전체 cascade skip. RT-HMU, RT-QBR 시리즈가 대표적.

4. **storageState 기반 describe 전체 skip** (~75건 추정): Cat-C 원인(request fixture auth 상속)으로 미인증 describe 블록 전체가 조건부 skip 처리된 경우.

**대책**: Round 2 전 `--list` 플래그로 skip 이유 분류 (`test.skip()` vs `beforeAll failure` vs worker cascade). SKIP 725를 3가지로 재분류: [의도적 skip] / [환경 실패 cascade] / [의존성 실패 cascade].

---

## 5. 패턴 발견

### P-1: 단일 환경 이슈가 40건 이상 오염
Supabase 계정 1개의 패스워드 만료가 Cat-B 22건 + Cat-G auth 기인분 ~20건을 오염. P0 없이 Round 2 실행 시 동일 패턴 반복.

**레슨**: global-setup에서 auth 상태를 저장하는 방식은 token 만료에 취약. Round 2부터는 각 테스트 직전 fresh login 또는 만료 체크 로직 추가 권고.

### P-2: spec-구현 동기화 갭
Cat-A(/api/participants), Cat-C(request fixture), Cat-F(상태코드)는 모두 스펙 작성 시점에 구현체와 동기화되지 않은 케이스. TC 시트 → Playwright 변환 과정에서 실제 엔드포인트 존재 여부, auth 상속 규칙, 허용 상태코드를 검증하는 pre-automation 체크리스트가 없음.

### P-3: RLS 교차 검증 아직 불투명
MLS-RLS-001/003/004, MSD-RLS-001/002/008이 Cat-G에 남아 있음 — auth 만료로 RLS 접근 자체가 되지 않아 실제 RLS 버그 여부 미확인. P0 후 이 케이스들이 FAIL로 남으면 **진짜 보안 결함** 가능성.

### P-4: flaky 잠재 (미검출)
SSN-RT-006~015 (CHANNEL_ERROR/TIMED_OUT), 더블클릭 방지 SSP-RL-001/MSD-RL-001은 Round 1 auth 문제로 실행조차 안 됨 → flaky 여부 미확인. Round 2에서 별도 `--workers=1 --retries=2` 재실행 구간 설정 권고.

---

## 6. 권장 fix 우선순위 (critic-2에게 제안)

| 순위 | 액션 | 담당 | critic-2 GO | 예상 해소 |
|------|------|------|------------|---------|
| P0 | Supabase 콘솔 계정 패스워드 복구 + global-setup 재실행 | dev-2 | 불필요 (환경 복구) | ~50건 (Cat-B 22 + Cat-E 10 재분류 + Cat-G auth 기인) |
| P1 | ~~`/api/participants` 신규 구현~~ → **취소** (구현 완료) | — | 취소 | 0건 (Round 2 재확인) |
| P2 | spec: ODB camelCase 수정 (Cat-D) | qa | 불필요 (spec) | 6건 |
| P3 | spec: `browser.newContext()` unauth 교체 (Cat-C) | qa | 불필요 (spec) | ~8건 |
| P4 | spec: 상태코드 범위 확장 (Cat-F) | qa | 불필요 (spec) | ~8건 |
| P5 | ~~role redirect 코드 추가~~ → **취소** (구현 완료) | — | 취소 | 0건 (P0 후 자동 해소) |
| P6 | RLS: session_participants academy_id 교차 참여 방어 확인 | dev-2 | **필요** | 보안 블로커 후보 |

**Round 2 재예측 (critic-2 정정 반영)**:

| 시나리오 | PASS | FAIL | SKIP |
|---------|------|------|------|
| Round 1 실적 | 298 | 120 | 725 |
| P0 완료 후 (Cat-B 22 + Cat-E→Cat-B 10 + Cat-A 27 + Cat-G auth ~18) | +77 추정 | ~43 | ~725 |
| P0 + P2~P4 spec 수정 후 (Cat-C 8 + Cat-D 6 + Cat-F 8) | +99 추정 | ~21 | ~725 |

**P0 완료 시 최대 Pass**: 298 + 77 = ~375. FAIL ~43 예상.  
**P0 + spec 수정 완료 시**: PASS ~477. FAIL ~21 예상 (Cat-G 진짜 RLS/코드 버그 잔존).

---

## 7. 프로세스 이슈

**이슈-1**: qa가 Round 1 실행 후 팀 DM 없이 `round-1-failures.md` 작성까지 자율 진행. team-lead가 중간 상태를 모르는 상태에서 `pid 20345` 재실행이 병렬 발생.

**권고**: Round 2부터는 테스트 실행 완료 즉시 qa → team-lead DM, 분석 시작 전 승인 대기. 자율 루프는 실행 중 에러 자가 수정 범위로 한정.

**이슈-2 (교훈 — critic-2 정정에서)**: analyst-2의 Cat-A(endpoint 없음) + Cat-E(redirect 미구현) 초기 분류는 실행 로그 기반으로는 정확했으나, **실제 파일 상태와 연동 검증 미실시** — 결과적으로 P1(신규 구현) + P5(코드 추가) 두 액션을 잘못 권고. critic-2가 파일 직접 Read로 정정.

**Round 2 분석부터 적용할 이중 체크 프로세스**:
- 실패 로그 기반 분류 → **현재 파일 상태 grep/Read 교차 검증** → 분류 확정
- "구현 없음" 주장 전 반드시 `Glob + Read` 확인 후 기술
- 특히 최근 커밋(e313a83 등)으로 추가된 파일은 Round 실행 시점과 현재 상태가 다를 수 있음

---

## 8. 다음 Round 레슨 (planner에게 제안)

1. **Round 2 선행 조건**: P0(계정 복구) 완료 확인 후 시작. 완료 DM 없이 Round 2 실행 금지.
2. **SKIP 재분류**: `--list` + skip 이유 집계로 725 SKIP을 [의도적/환경/의존성]으로 분류. 실질 PASS율 재계산.
3. **flaky 격리**: SSN-RT Realtime 계열 + 더블클릭 방지 TC는 `--workers=1 --retries=2` 별도 구간 실행.
4. **pre-automation 체크리스트**: spec 작성 전 (a) 엔드포인트 존재 확인, (b) auth 상속 규칙 확인, (c) 허용 상태코드 코드 기반 확인. Cat-A/C/F 재발 방지.
5. **Wiki 연동 강화**: Wiki 작성 시 발견한 코드 리스크를 TC ID와 매핑해 failure.md에 바로 연결. Gotcha 3건 중 1건 Round 1 확정 — 이 패턴을 Round 2 이후 표준 절차로.

---

## 부록: 카테고리별 건수 재집계

| 카테고리 | 건수 | 픽스 담당 |
|---------|------|---------|
| Cat-A /api/participants 없음 (Round 1 당시) | 27 | **현재 해소** (커밋 e313a83) |
| Cat-B auth 만료 연쇄 (+Cat-E 재분류 포함) | 32 | dev-2 (P0 환경) |
| Cat-C request fixture 설계 오류 | 8 | qa |
| Cat-D camelCase 불일치 ✅ Wiki 선제 발견 | 6 | qa |
| ~~Cat-E role redirect 미구현~~ → **Cat-B 재분류** | 0 | — |
| Cat-F 상태코드 범위 누락 | 8 | qa |
| Cat-G 복합/미분류 (P0 후 재분류) | ~47 | P0 후 재조사 |
| **합계** | **120** | |
