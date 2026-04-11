# Round 1 비평 (critic-2)

> 작성: critic-2 · 2026-04-11  
> 데이터 소스: `docs/scrum/cycles/round-1-analysis.md` + `docs/scrum/cycles/round-1-failures.md` (qa)  
> 직접 재검증: `src/app/api/participants/route.ts`, `src/app/mentor/layout.tsx`, `src/app/instructor/layout.tsx`, `src/app/student/layout.tsx`

---

## 1. Analyst 분석 수용/반박

### 1-1. qa 카테고리 분류의 정확도

| 카테고리 | 평가 | 판정 |
|---------|------|------|
| Cat-B storageState 만료 22건 | 원인 정확. 계정 자체 문제 아닌 storageState 만료 → global-setup 재실행으로 해소 | ✅ 수용 |
| Cat-C `request` fixture auth 상속 8건 | Playwright storageState 상속 메커니즘 정확히 파악. 비인증 TC는 `playwright.request.newContext()` 필요 | ✅ 수용 |
| Cat-D camelCase 불일치 6건 | `/api/dashboard` 직접 응답 확인 포함. Wiki 선제 발견 연결 정확 | ✅ 수용 |
| Cat-F 상태코드 범위 8건 | API가 더 방어적인 응답 반환 → spec 오류. 수정 방향 정확 | ✅ 수용 |
| Cat-A `/api/participants` 미존재 27건 | **정정 필요** — 아래 §2-2 참조 | ⚠️ 정정 |
| Cat-E role redirect 미구현 10건 | **정정 필요** — 아래 §3 참조 | ⚠️ 정정 |

### 1-2. 725 SKIP 원인 추정의 타당성

3개 원인 추정(beforeAll cascade, explicit skip, 의존성 cascade) 모두 타당하다. `--list` 플래그로 재분류하는 Round 2 대책 수용. `pid 20345` 병렬 실행은 §4(flaky 위험)에서 별도 검토.

### 1-3. Wiki 선제 발견 3건 검증 가치

Cat-D 1건 Round 1에서 실제 6건 FAIL로 확정됨. Wiki 작성 시 코드 정밀 읽기가 실제 버그를 사전 식별하는 효과 검증됨. 나머지 2건(DeltaChart snake_case, studentId 누락)은 P0 복구 후 Round 2에서 재검증. **이 패턴(Wiki Gotcha → TC ID 매핑)을 Round 2 이후 표준 절차로 고정할 것을 권장한다.**

---

## 2. dev-2 P0/P1 사후 검증

### 2-1. P0 계정 복구 — 워크어라운드 여부

**dev-2 조치**: Supabase MCP로 계정 존재 확인 → `.auth/*.json` 삭제 → global-setup 재실행.

**판정: 근본 해결 (워크어라운드 아님)** ✅

근거: 문제의 실제 원인은 계정 비밀번호 변경이 아니라 **access token 만료로 인한 storageState 무효화**였다. 계정 자체는 유효 상태로 존재했음. 따라서 만료된 `.auth/*.json` 삭제 + 재로그인은 증상 덮기가 아니라 정확한 원인 제거다.

**잔여 리스크**: storageState는 token 만료(기본 1시간)마다 재실행이 필요한 구조. `global-setup.ts`가 만료 시점 감지 없이 단순 저장만 하면 장시간 테스트 세션에서 재발 가능. Round 2 에서 재발 시 `global-setup.ts`에 token 유효성 사전 체크 로직 추가 필요.

### 2-2. P1 `/api/participants` — 구현 품질

**직접 Read 결과 (`src/app/api/participants/route.ts`):**

| 검증 항목 | 결과 |
|---------|------|
| Zod 검증 — POST `joinCode: z.string().length(6)` | ✅ |
| Zod 검증 — GET `sessionId: z.string().uuid()` | ✅ |
| 인증 확인 — `supabase.auth.getUser()` | ✅ |
| POST role 체크 — `student`만 허용, 그 외 403 | ✅ |
| GET role 체크 — `teacher/owner`만 허용, 그 외 403 | ✅ |
| GET academy_id 소유권 확인 — 타 학원 세션 403 | ✅ |
| 중복 참여 방지 — `maybeSingle()` + 409 | ✅ |
| 에러 처리 — insertError 시 500 반환 | ✅ |
| `any` 타입 도입 | ✅ 0건 |
| `console.log` | ✅ 0건 |
| 매직 넘버 | ✅ 0건 |
| tsc/build 성공 (dev-2 확인) | ✅ |

**판정: 워크어라운드 없음, 구현 품질 양호** ✅

**단, 추가 리스크 1건 발견**: `POST /api/participants`에서 수강생 academy_id와 세션 academy_id를 교차 검증하지 않는다. 현재 `join_code`로 세션을 조회하고 active 여부만 확인 — 이론적으로 타 학원 join_code를 입수한 수강생이 타 학원 세션에 참여 가능하다. RLS 정책에서 이를 막는지 별도 확인 필요 (§5 Round 조건 참조).

---

## 3. P5 (Cat-E role redirect) — Option B 수용 + 핵심 정정

### 3-1. 코드 현황 (직접 검증)

직접 Read한 layout 파일들에서 **양방향 ROLE_HOME redirect가 이미 구현돼 있음**을 확인했다:

| 파일 | 조건 | ROLE_HOME 맵 포함 여부 |
|------|------|---------------------|
| `mentor/layout.tsx:31` | `role !== "mentor"` → redirect | `teacher: "/instructor"` 포함 ✅ |
| `instructor/layout.tsx:31` | `role !== "teacher"` → redirect | `mentor: "/mentor"` 포함 ✅ |
| `student/layout.tsx:31` | `role !== "student"` → redirect | `teacher: "/instructor"` 포함 ✅ |

즉, teacher가 `/mentor`에 접근하면 `mentor/layout.tsx`의 ROLE_HOME에 의해 `/instructor`로 리다이렉트된다. **Cat-E "역방향 redirect 미구현"은 사실과 다르다.**

**Cat-E 10건 실패의 실제 원인 추정**: Cat-B(auth 만료) 연쇄. teacher storageState가 만료된 상태에서 `/mentor` 접근 → 인증 실패 → `/login`으로 리다이렉트 → spec이 `/instructor`를 기대 → FAIL. P0 복구 후 Round 2에서 자동 해소 예상.

### 3-2. Option B 수용 (team-lead 최종 결정)

team-lead 최종 결정(Option B + Cycle 3 이관) 수용. 이유:

1. AC-1~AC-8 범위 외 TC다 — 구현 요구가 아닌 analyst가 추가한 TC
2. 코드가 이미 올바르게 구현돼 있으므로 실제 코드 수정 없이 P0 후 해소 예상
3. 명시적 이관(skip + Cycle 3 공식 등록)은 workaround가 아닌 legitimate deferral

**실행 방식**:
- qa: Cat-E 10건 TC를 `test.skip('Cycle 3 이관: role redirect — layout ROLE_HOME 구현 확인 필요')` 로 변경
- `docs/scrum/cycles/cycle-3-backlog.md` 신규 생성: Cat-E 10건 TC ID, 해당 layout 파일 경로, P0 후 재검증 결과 포함

**단서**: Round 2에서 P0 해소 후 Cat-E 해당 TC를 1회 비공식 실행해 **실제 코드가 올바르게 동작하는지 확인**한다. PASS → spec skip 해제 후 Cycle 3 TC에 포함. FAIL → 진짜 미구현 가능성으로 재조사.

---

## 4. flaky 위험

**pid 20345 `--workers=1` 재실행 이슈**:

Round 1에서 `pid 20345`가 병렬(workers=4) 실행 도중 별도 `--workers=1` 재실행이 발생했다. qa가 team-lead 승인 없이 자율 진행한 것으로 analyst가 프로세스 이슈로 지적. 이 재실행이 Round 1 FAIL 건수에 영향을 줬을 가능성 있음 — **어느 실행 결과를 기준으로 하는지 명확히 해야 한다.**

**Round 2 flaky 위험 항목**:

| 항목 | 위험 | 대책 |
|------|------|------|
| SSN-RT-006~015 (CHANNEL_ERROR/TIMED_OUT) | Round 1에서 auth 만료로 실행 안 됨 → flaky 여부 미확인 | `--workers=1 --retries=2` 별도 구간 실행 |
| SSP-RL-001, MSD-RL-001 (더블클릭 방지) | 동일, 미실행 | 동일 |
| beforeAll 실패 → describe cascade skip | P0 복구 후 재발 가능성 낮으나, global-setup token 유효성 체크 부재 | §2-1 잔여 리스크 참조 |

**flaky 허용 기준**: 0. Round 2에서 동일 TC가 2회 이상 재실행 시 다른 결과를 내면 즉시 flaky 분류 + workers=1 격리 재실행 필수.

---

## 5. Round 2 → Round 3 진입 조건 (조건부 GO)

### Round 2 실행 전 선행 조건 (현재 상태)

| 항목 | 상태 |
|------|------|
| P0 계정 복구 + global-setup 재실행 | ✅ dev-2 완료 |
| P1 `/api/participants` 구현 | ✅ dev-2 완료 |
| P2 ODB camelCase spec 수정 | qa 진행 중 |
| P3 request fixture unauth 교체 | qa 진행 중 |
| P4 상태코드 범위 확장 | qa 진행 중 |
| P5 Cat-E spec skip (Option B) | qa 진행 예정 |

### Round 2 → Round 3 진입 기준

다음 조건을 **모두** 충족 시 Round 3 진입 허용:

1. **FAIL ≤ 30건** — 플래너 제안 수용. 근거: P0+P1+P2~P4 해소 예상(~89건) 후 잔여는 Cat-G RLS 실제 버그 및 미분류 케이스. 30건 초과 시 추가 코드 버그 존재 가능성.
2. **RLS 교차 학원 TC 0 FAIL** — MLS-RLS, MSD-RLS 계열이 P0 복구 후에도 FAIL이면 실제 RLS 취약점. 즉시 No-Go.
3. **`session_participants` INSERT RLS 교차 academy 방어 확인** — §2-2 추가 리스크. Pass 확인 후 Round 3 진입. > **Round 2.5 Update**: migration 00008 (`participants_insert_student_academy_active`) team-lead Supabase MCP로 원격 적용 완료. P6 해소.
4. **flaky 0건** — SSN-RT 계열 Realtime TC 결과 안정 확인.
5. **T12 루프 종료 조건 달성 시**: FAIL 0, SKIP 의도적 항목만 → T12 완료 처리.

### Round 3 없이 T12 종료 가능 조건

Round 2 결과: FAIL = 0 + SKIP = 의도적 `test.skip()` 항목만 → T12 즉시 종료, T8(최종 검증 리뷰) 진입.

---

## 6. 요약 판정

| 항목 | 판정 |
|------|------|
| analyst-2 분석 전반 | ✅ 수용 (Cat-A/E 2건 정정 포함) |
| dev-2 P0 — 근본 해결 | ✅ 워크어라운드 없음 |
| dev-2 P1 — 구현 품질 | ✅ CLAUDE.md §16~20 위반 0건 |
| Cat-E Option B 수용 | ✅ (코드 이미 구현됨 — 자동 해소 예상) |
| Round 2 GO | ✅ **조건부 GO** — P2~P5 qa 수정 완료 후 실행 |
