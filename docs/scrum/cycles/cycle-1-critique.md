# Cycle 1 비평 리포트

> 작성: critic-2 · 2026-04-11 · T13 산출물 (Cycle 비평 파트)  
> 검토 대상: `docs/scrum/cycles/cycle-1-analysis.md` + `docs/scrum/e2e-results.md` + `docs/scrum/dev-changelog.md`  
> 직접 재검증: `use-realtime.ts`, `mentor/page.tsx`, `instructor/page.tsx`, `owner/page.tsx`, `mentor/layout.tsx`, `student/*/page.tsx`

---

## 1. Analyst 리포트 평가

### 동의 (정확히 맞음)

| 항목 | 판정 |
|------|------|
| E2E 26/26 PASS — 회귀 없음, AC-1~8 전부 GREEN | ✅ 독립 확인 |
| Issue 1 분류 "환경 이슈(원격 DB 미적용)" — 코드 버그 아님 | ✅ 정확 |
| Issue 2 분류 "스펙 오류(셀렉터)" — 코드 버그 아님 | ✅ 정확 |
| Issue 3 분류 "스펙 오류(정규식)" — 코드 버그 아님 | ✅ 정확 |
| `use-realtime.ts` N-4/N-5 — T4에서 올바르게 수정됨 (직접 Read 확인) | ✅ 수정 완료 |
| `mentor/layout.tsx` Server Component 전환 + role guard — AC-4 올바르게 구현됨 | ✅ 확인 |
| Analyst 스캔 범위 갭(`/api/ai/` 3개 파일 누락) 솔직한 인정 | ✅ 중요 |
| `src/app/*/layout.tsx` 전체 스캔 미이행 (owner/instructor/student) | ✅ 정확한 자가 진단 |
| global-setup warm-up 미구현 — 1143 tests 규모에서 flaky 위험 | ✅ 심각성 정확 |
| Cycle 2 개선 교훈 A-1~A-3, D-1~D-3, Q-1~Q-3 | ✅ 전반적으로 타당 |

---

### 보강 / 반박

**B-1. Issue 2 셀렉터 수정 — 근본 해소 아닌 임시 개선**

`input[name="title"]` → `page.fill('#title', ...)` 수정은 맞다. 그러나 `id` 기반 셀렉터도 프로덕션 컴포넌트 변경 시 동일하게 깨진다. 근본 해소는 `data-testid` 속성을 컴포넌트에 추가하거나 `aria-label` 기반 셀렉터를 사용하는 것이다. Cycle 2 스펙 작성 시 QA는 `data-testid` 우선, `id`는 차선으로 명시할 것을 권장한다.

**B-2. Issue 3 정규식 수정 — 완전하지 않음**

`/\b[A-Z0-9]{6}\b/` 에서 `\b` 는 알파뉴메릭 문자와 비알파뉴메릭 문자 경계에 적용된다. `join_code` 가 공백이나 특수문자로 둘러싸인 DOM 환경에서는 문제없지만, 코드가 문장 안에 인접할 경우 경계 미탐지 위험이 남는다. 더 방어적인 패턴: `/(?<![A-Z0-9])[A-Z0-9]{6}(?![A-Z0-9])/` 또는 테스트 ID로 직접 요소를 찾아 `textContent`를 검증하는 방식이 더 신뢰성 있다.

**B-3. 프로세스 이슈 4-4 진단 부족**

"QA가 코드를 확인하지 않고 관례적 셀렉터 사용"이라고 진단했으나 더 깊은 원인은 **QA 스펙 작성 체크리스트 부재**다. "스펙 작성 전 관련 컴포넌트 Read" 항목을 Q-1로 교훈에만 기재하는 것으로는 다음 사이클에서 반복을 막기 어렵다. QA 스펙 파일 상단에 의무 체크리스트 주석(`// Verified: component Read, constants.ts Read`) 을 강제하는 것이 더 강한 제약이다.

---

## 2. 놓친 리스크 / 추가 발견

### 🟡 High — Cycle 2 명시적 커버리지 요구

**SF-1. `if (response.ok)` 패턴의 광범위한 확산 — silent failure 전염**

`use-realtime.ts`의 N-4/N-5는 올바르게 수정됐다. 그러나 동일한 silent failure 패턴이 **페이지 컴포넌트 전반에 남아있다**. 직접 grep 결과:

| 파일 | 지점 | 실패 시 결과 |
|------|------|------------|
| `src/app/instructor/page.tsx:29` | `if (response.ok)` — 세션 목록 | 강사 대시보드 빈 화면, 에러 없음 |
| `src/app/owner/page.tsx:53` | `if (response.ok)` — 대시보드 | 원장 대시보드 빈 화면, 에러 없음 |
| `src/app/instructor/sessions/[id]/reports/page.tsx:30,47` | `if (response.ok)` — 분석/코칭 | 리포트 페이지 빈 화면 |
| `src/app/student/sessions/[id]/report/page.tsx:34,51` | `if (response.ok)` — 리포트 | 수강생 리포트 빈 화면 |
| `src/app/mentor/page.tsx:41` | `if (response.ok)` — 학생 목록 | 멘토 대시보드 빈 화면 |

이 파일들은 CLAUDE.md §7 기준 **프론트엔드 팀 영역**이므로 dev-2의 수정 범위가 아니었다. T4의 수정은 `src/hooks/` 범위 내에서 올바르게 수행됐다. 그러나 **Cycle 2 TC 확장 시 이 패턴들에 대한 에러 경로 테스트가 필수**다 — QA 스펙이 happy path만 커버하면 이 silent failure들이 영구적으로 검증 공백으로 남는다.

**SF-2. RLS 교차 학원 시나리오 — 자동화 미포함**

REG-005(owner SELECT RLS) 통과는 동일 학원 내 격리를 검증한다. 그러나 **타 학원 mentor가 타 학원 수강생의 URL 직접 접근** 케이스는 현재 Playwright 스펙에 없다. RLS가 `academy_id` 기반이고 `get_my_academy_id()` 함수가 있으므로 이론상 격리되지만, E2E 자동화 없이는 마이그레이션 오류로 격리가 깨져도 알 수 없다. **Cycle 2 `02-regression.spec.ts` 우선 추가 항목.**

---

### 🟠 Medium — 관찰 / Cycle 2 시 주의

**SF-3. `instructor/sessions/[id]/page.tsx` 뮤테이션 silent failure**

강사 세션 상세 페이지에서 `status` 변경(`PATCH`), 퀴즈 생성(`POST /api/ai/quiz`), AI 코칭 생성 등 뮤테이션 핸들러들이 `if (response.ok)` 패턴을 사용한다. 실패 시 UI 피드백 없음. 데모 시나리오에서 AI 생성이 실패해도 조용히 넘어가므로 데모 중 단서가 없다.

**SF-4. `global-setup.ts` warm-up 미구현 — 1143 테스트 전 반드시 선행**

Cycle 2에서 1143개 테스트가 cold-start로 실행되면 첫 3~5개 테스트에서 Next.js 서버 미준비 상태로 flaky 발생 가능. dev-2가 Cycle 2 착수 전 `global-setup.ts`에 `/api/health` 또는 `/` 요청으로 warm-up 구현 필수.

---

## 3. Dev 수정 품질 최종 평가

**T4 변경 전수 확인 결과:**

| 항목 | 판정 |
|------|------|
| N-1 `mentor-briefing/route.ts:121` mentor role 체크 | ✅ 수정 확인 (dev-changelog) |
| N-2 `analysis/route.ts:171` mentor role 체크 | ✅ |
| N-3 `report/route.ts` `isTeacher` → `isStaff` + mentor 포함 | ✅ |
| N-4 `use-realtime.ts` `loadExisting()` error 처리 | ✅ 직접 Read 확인 — 완벽하게 수정됨 |
| N-5 `use-realtime.ts` CHANNEL_ERROR/TIMED_OUT 핸들링 | ✅ 직접 Read 확인 — 완벽하게 수정됨 |
| N-6 `mentor-briefing/route.ts:287` `"30%"` 하드코딩 제거 | ✅ (dev-changelog 확인) |
| N-8 mentor 세션 academy_id 기반 분기 | ✅ |
| N-9 `consultation_notes_select` mentor 조회 범위 | ✅ 마이그레이션 포함 |
| `any` 신규 도입 | ✅ 0건 |
| `console.log` | ✅ 0건 |
| 매직 넘버 | ✅ 0건 |
| 마이그레이션 RLS 포함 | ✅ (DoD §4 충족) |
| `npm run build` 성공 | ✅ |

**워크어라운드 탐지**: 없음. 모든 수정이 근본 원인(role 체크 누락, error 미처리, 하드코딩) 을 직접 해소했다.

---

## 4. analyst-2 질문에 대한 답변

**Q1. "기능 연결 API 추적 여부를 첫 번째 비평 항목으로 고정이 적절한가?"**

**YES, 강력히 동의.** Cycle 1에서 가장 큰 리스크가 `/api/ai/` 3개 파일 누락이었고, critic이 없었다면 mentor 브리핑 기능이 broken 상태로 배포됐을 것이다. Cycle 2 비평 루틴의 **첫 번째 체크**를 다음으로 고정한다:

> "분석 대상 role이 주체인 기능(F9 mentor 브리핑, F2 퀴즈 생성 등)에 연결된 `/api/ai/`, `/api/sessions/`, `/api/responses/` 등 모든 관련 API Route가 스캔됐는가? 연결 추적 그래프가 리포트에 존재하는가?"

**Q2. "RLS 교차 검증 자동화 우선순위"**

**최우선 (Cycle 2 `02-regression.spec.ts` 첫 추가 항목).** 타 학원 mentor가 타 학원 수강생 URL 직접 접근, 타 학원 teacher가 타 학원 세션 API 직접 호출 등 2개 시나리오를 최소 추가한다. `get_my_academy_id()` 함수 의존이 생각보다 광범위하므로, 함수 반환값이 null인 엣지 케이스(academy_id 미등록 프로필)도 포함한다.

**Q3. "`use-realtime.ts` 에러 처리 패턴이 다른 useEffect 훅에도 일관 적용됐는가?"**

**No — 페이지 컴포넌트에는 미적용.** 직접 grep 결과 `src/app/instructor/`, `src/app/owner/`, `src/app/student/` 등 7개+ 파일에서 `if (response.ok)` without else 패턴이 확인됐다. 단, 이 파일들은 **프론트엔드 팀 영역(CLAUDE.md §7)** 이므로 dev-2 수정 범위가 아니었으며, T4의 hooks 수정은 범위 내에서 올바르게 수행됐다.

Cycle 2에서 QA가 이 페이지들의 에러 경로 TC를 작성하면 자연스럽게 커버된다 — 스펙이 `!response.ok` 케이스를 검증하면 silent failure가 테스트에서 드러난다.

---

## 5. Cycle 2 진입 전 필수 선행 조치

| 우선순위 | 항목 | 담당 | 완료 기준 |
|---------|------|------|----------|
| P0 | `global-setup.ts` warm-up 구현 | dev-2 | `npm run test:e2e` 첫 번째 테스트 cold-start 실패 0건 |
| P0 | `supabase db push --dry-run` 체크를 test:e2e 실행 전 절차로 표준화 | dev-2 + qa | 실행 가이드 문서화 |
| P1 | RLS 교차 학원 시나리오 `02-regression.spec.ts` 추가 | qa | 최소 2 케이스 (타 학원 mentor URL 접근, 타 학원 API 호출) |
| P1 | QA 스펙 파일 상단 의무 체크리스트 주석 컨벤션 도입 | qa | `// Verified: ComponentFile Read, constants.ts Read` |

---

## 6. GO/NO-GO — Cycle 2 진입 승인

### **조건부 GO** ✅

**근거:**
- Cycle 1 수정사항 전부 근본 원인 해소. 워크어라운드 없음.
- `use-realtime.ts` N-4/N-5 완벽 수정 직접 확인.
- AC-1~8 전부 GREEN, E2E 26/26 PASS 2회 연속.
- CLAUDE.md §1-20 위반 신규 도입 없음.

**조건 (P0 — Cycle 2 스펙 실행 전 반드시 완료):**
1. **`global-setup.ts` warm-up** — 1143 tests cold-start flaky 차단
2. **`supabase db push --dry-run` 표준화** — Issue 1 재발 방지

이 두 항목이 미완료 상태로 Cycle 2 스펙 실행 시 flaky로 인한 결과 오염이 발생하며, 이는 NO-GO 처리한다.

---

## Cycle 2 비평 루틴 고정 체크리스트 (이번부터 적용)

```
[ ] 분석 리포트에 "기능 연결 API 전체 추적 그래프" 포함 여부 → 미포함 시 NO-GO
[ ] src/app/*/layout.tsx 전체 glob 후 role guard 테이블 포함 여부
[ ] E2E 실패 분류: 환경/코드/스펙/flaky 4분류 명시 여부
[ ] silent failure: 에러 경로 TC 커버 여부 (에러 케이스 FAIL → PASS 확인)
[ ] RLS 교차 학원 시나리오 커버 여부
[ ] 신규 catch {} / if (response.ok) without else 도입 여부
[ ] 마이그레이션 RLS 포함 여부 (DoD §4)
[ ] npm run build + lint 0 경고 여부
```
