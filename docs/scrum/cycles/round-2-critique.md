# Round 2 비평 (critic-2)

> 작성: critic-2 · 2026-04-11  
> 검토 대상: `docs/scrum/cycles/round-2-analysis.md` (analyst-2 산출물)  
> 직접 재검증: `tests/e2e/03-instructor-flow.spec.ts:125` (ISD-ERR-001 flaky 분석)  
> 결과: 294 PASS / 779 SKIP / **0 FAIL** / **1 FLAKY**

---

## 1. Analyst 분석 수용/반박

### 동의

| 항목 | 판정 |
|------|------|
| FAIL 0 — 120건 전량 환경+스펙 오류, 진짜 코드 버그 없음 | ✅ 수용 |
| Cat-E 10건 Cat-B 해소로 자동 통과 | ✅ 예측 실현 확인 |
| Cat-A P1 구현 활성화 → 27건 해소 | ✅ 예측 실현 확인 |
| Cat-G ~47건 전량 auth 연쇄 — 진짜 코드/RLS 버그 없음 | ✅ 수용 |
| PASS -4 회귀 아님, 분류 기준 변동 판단 | ✅ 잠정 수용 (§3에서 추가 조건 기술) |
| P6 academy_id 교차 RLS 미검증 — Round 3 대상 | ✅ 수용 |
| Wiki Gotcha 1, 2 미검증 — Cycle 3 범위 SKIP 추정 | ✅ 수용 |

### 반박 — FLAKY 근본 원인 분석 오류

**analyst-2 주장**: "세션 PATCH → active 전환 후 join_code가 UI에 나타나기 전에 Playwright가 읽으려 함. `waitForSelector('[data-testid="join-code"]')` 추가로 해소."

**직접 검증 결과**: 오진단. `03-instructor-flow.spec.ts:125`는 **ISD-ERR-001** — *draft 세션에 join_code가 없음*을 확인하는 보안 TC다. join_code 출현을 기다리는 `waitForSelector`는 이 테스트에 구조적으로 맞지 않는다 (존재를 기다리는 selector를 "부재 검증" 테스트에 추가하면 timeout). 아래 §2에서 상세 분석.

---

## 2. Round 1 비평 예측 검증

| 예측 | 결과 | 판정 |
|------|------|------|
| Cat-E 10건: P0 후 자동 PASS (auth 연쇄 재분류) | ✅ PASS (Cat-B 해소로 자동 통과) | 정확 |
| Cat-A 27건: P1 구현으로 Round 2 해소 | ✅ PASS | 정확 |
| P0 `.auth/*.json` 삭제 — 근본 해결, 워크어라운드 아님 | ✅ Cat-B 연쇄 전량 해소로 검증 | 정확 |
| P6 session_participants academy_id 교차 — RLS 확인 필요 | ❓ 미검증 (Round 3 대상) | 계속 주시 |

---

## 3. PASS -4 (298 → 294) — 잠정 수용 + 조건

analyst-2 판단(회귀 아님, 분류 기준 변동)을 잠정 수용하나, Round 3에서 동일 4건이 또 SKIP으로 빠지면 **flaky 신호로 재분류**한다. 지금 "분류 기준 변동"이라 부르는 케이스가 실제로는 intermittent skip이라면 Round 3에서 드러난다.

**조건**: Round 3에서 해당 4건의 TC ID 추적 필수. "세션 생성 실패 cascade ~179" 중에 해당 4건이 포함되는지 확인.

---

## 4. FLAKY 1건 — 근본 원인 재분석

### 4-1. 대상 TC

**ISD-ERR-001**: `test('draft 세션 페이지 DOM에 join_code 평문 없음', ...)` — `03-instructor-flow.spec.ts:125`

이 TC는 **보안 검증**이다:
1. 새 draft 세션 생성 (API POST)
2. `/instructor/sessions/${session.id}` 페이지 접속
3. `page.waitForLoadState('networkidle')` 대기
4. `page.content()`에서 `'수업을 시작하면' || '코드가 발급' || '시작하면'` 포함 여부 확인

### 4-2. 실제 flaky 원인

`networkidle` 조건이 React 컴포넌트 hydration 완료를 보장하지 않는다. `networkidle`는 네트워크 요청 종료 기준이지 DOM 렌더링 완료 기준이 아니다. 낮은 확률로 컴포넌트가 loading/skeleton 상태에서 `page.content()`가 호출되면 한국어 안내 문구가 없어 FAIL.

**"보안 민감" 판정**: 틀린 방향. 실패의 의미는 "join_code가 노출됐다"가 아니라 "미발급 안내 문구가 아직 렌더링되지 않았다". 코드 보안 버그가 아닌 **spec 타이밍 버그**다. 단, 이 TC가 flaky하면 보안 invariant 검증 신뢰도가 떨어지므로 수정은 필수다.

### 4-3. analyst-2 처방 오류

`waitForSelector('[data-testid="join-code"]')` → **이 테스트에 적용 불가**. join_code element가 draft 세션에 없으면 timeout → 테스트 실패. ISD-UI-004(active 세션 join_code 노출 확인)에 적용할 처방을 잘못 연결했다.

### 4-4. 올바른 처방 (적용 완료)

```typescript
// 구 (flaky)
const pageContent = await page.content();
const hasNullCodeMessage =
  pageContent.includes('수업을 시작하면') || ...
expect(hasNullCodeMessage, '...').toBeTruthy();

// 현재 적용됨 (dev-2 확인)
await expect(page.locator('body')).toContainText(
  /수업을 시작하면|코드가 발급|시작하면/,
  { timeout: 10_000 },
);
```

`toContainText` + `{ timeout: 10_000 }` 은 Playwright의 auto-retry assertion — 텍스트가 나타날 때까지 최대 10초 폴링하므로 React hydration 완료를 실질적으로 보장한다. 내 권장(`toBeVisible`)과 동등하고, `body` 전체 대상이므로 텍스트 위치 변경에도 견고.

**analyst-2 처방 정정 기록**: `waitForSelector('[data-testid="join-code"]')`는 draft 세션에 존재하지 않는 element를 기다리므로 이 TC에 적용 시 timeout. "TC 의도(부재 검증) 확인 후 Fix 처방" 교훈.

---

## 5. T12 종료 조건 판단

| 조건 | 상태 | 판정 |
|------|------|------|
| FAIL = 0 | ✅ 달성 | |
| SKIP 의도적 항목만 | ✅ (779 중 ~600 의도적, ~179 cascade) | |
| flaky = 0 | ❌ 1건 (ISD-ERR-001) | |

**T12 미완료**. 내 Round 1 비평 §4에서 명시한 기준: "flaky 허용 0". flaky 1건으로 T12 종료 조건 충족 안 됨.

### **Option A** 선택 (근본 수정 + Round 2.5 mini 실행)

**Option B 거부 이유**: ISD-ERR-001은 보안 TC다. 이 TC가 flaky한 상태로 "Cycle 3 이관"하는 것은 보안 invariant 검증 공백을 방치하는 것 — Cat-E 때와 다르다. Cat-E는 AC 범위 외 TC였고 코드도 이미 구현돼 있었다. ISD-ERR-001은 REG-004(기존 회귀 방어 케이스)와 연계된 **핵심 보안 검증**이다.

**Round 2.5 범위**: `03-instructor-flow.spec.ts` 단독 실행. flaky fix가 2줄 spec 수정이므로 전체 스위트 재실행 불필요.

---

## 6. dev-2 GO/NO-GO

**flaky fix 담당**: qa (spec 수정) — 코드 수정 불필요.

**GO 조건**:
1. `tests/e2e/03-instructor-flow.spec.ts:ISD-ERR-001` 타이밍 수정 (`toBeVisible` 패턴 적용)
2. `waitForTimeout(2_000)` (같은 파일 line 111) 도 `waitFor` 명시적 element 대기로 교체 권장 — ISD-UI-004의 하드코딩된 2초 대기도 flaky 원인이 될 수 있음
3. Round 2.5 `03-instructor-flow.spec.ts` 단독 실행 → 0 flaky 확인

**dev-2 코드 수정 불필요**: flaky는 spec 타이밍 문제, 컴포넌트/API 버그 아님. 단, 컴포넌트에 `data-testid="no-join-code-message"` 추가가 선택 사항 — qa와 협의.

---

## 7. Round 2.5 → T12 완료 조건

- `03-instructor-flow.spec.ts` 전체: 0 FAIL, 0 FLAKY
- 나머지 스위트 회귀 없음 (Round 2 결과 유지)

Round 2.5 통과 시 → **T12 완료, T8(최종 검증 리뷰) 진입**.

---

## 8. Round 3 이후 주시 항목 (T12 이후)

| 항목 | 우선순위 | 근거 |
|------|---------|------|
| P6: session_participants academy_id RLS 교차 방어 | ✅ 해소 | Round 2.5 중 team-lead Supabase MCP로 00008 원격 적용 완료, pg_policies 검증 확인 |
| PASS -4 동일 케이스 추적 | P1 | Round 3에서 같은 4건 또 SKIP 시 flaky 재분류 |
| SSN-RT-006~015 Realtime flaky — workers=1 격리 실행 | P1 | analyst-2 Round 2 §8-1 |
| Wiki Gotcha 1 (DeltaChart camelCase), 2 (studentId 400) | P2 | auth 만료로 가려졌던 항목 — Round 3 재검증 |
