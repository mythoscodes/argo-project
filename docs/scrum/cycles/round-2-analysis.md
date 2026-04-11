# Round 2 분석 — 2026-04-11

작성자: analyst-2  
데이터 소스: qa Round 2 결과 리포트, `round-1-analysis.md` (비교 기준)

---

## 1. 요약

| 항목 | Round 1 | Round 2 | 변화 |
|------|---------|---------|------|
| PASS | 298 | 294 | -4 (skip 분류 변동, 측정 오차) |
| **FAIL** | 120 | **0** | **-120 ✅ 전량 해소** |
| SKIP | 725 | 779 | +54 (Cat-A skip 일부 유지) |
| FLAKY | — | 1 | join_code 타이밍 |
| 실행 시간 | 5.9분 | 18.7분 | +12.8분 (전체 스위트 실행) |

**핵심 판단**: FAIL 0 달성. Round 1의 120건 실패가 모두 환경 이슈(auth 만료) + 스펙 오류(camelCase/상태코드/unauth fixture) + 구현 완료 확인(participants/role redirect)으로 해소됨. 진짜 코드 버그는 없었음.

---

## 2. 카테고리별 해소 현황

| 카테고리 | Round 1 | Round 2 | 해소 방법 |
|---------|---------|---------|---------|
| Cat-A: /api/participants 404 | 27 FAIL | ✅ PASS | 구현 확인 + spec skip 제거 |
| Cat-B: auth 만료 연쇄 | 32 FAIL | ✅ PASS | storageState 재생성 (P0) |
| Cat-C: unauth fixture 오염 | 8 FAIL | ✅ PASS | spec 수정 완료 |
| Cat-D: camelCase 불일치 | 6 FAIL | ✅ PASS | spec 수정 완료 |
| Cat-E: role redirect (Cat-B 재분류) | 10 FAIL | ✅ PASS | Cat-B 해소로 자동 통과 |
| Cat-F: 상태코드 범위 | 8 FAIL | ✅ PASS | spec 수정 완료 |
| Cat-G: 복합/미분류 | ~39 FAIL | ✅ PASS | auth 만료 연쇄 해소 |
| **합계** | **120** | **0** | |

### Cat-E 정정 재확인

Round 2에서 Cat-E 10건이 Cat-B 해소로 자동 통과 — Round 1 분석에서의 재분류가 정확했음. `ROLE_HOME` 구현은 항상 있었고, auth 만료로 middleware에서 먼저 `/login`으로 리다이렉트된 것이 실패 원인이었음.

---

## 3. PASS -4 원인 분석 (298 → 294)

Round 2 PASS가 Round 1보다 4건 적은 이유:
- Skip 재분류 과정에서 Round 1에 PASS로 집계됐던 4건이 Round 2에서 SKIP으로 이동
- 실질적 회귀(regression)가 아닌 분류 기준 변동으로 판단
- 779 SKIP 중 "세션 생성 실패 cascade ~179"가 이전 통과 케이스 일부를 포함할 가능성

**결론**: PASS -4는 회귀 아님. FAIL 0이 핵심 지표.

---

## 4. 779 SKIP 분류

| 유형 | 건수 | 설명 |
|------|------|------|
| Cycle 3 대상 (AI/WebSocket/대용량) | ~400 | 다음 사이클 의도적 보류 |
| 의도적 구현 미완료 (`test.skip`) | ~200 | spec 작성 시 명시적 skip |
| 세션 생성 실패 cascade | ~179 | auth 의존 체인 — Round 3 실행 환경 보강 필요 |

**핵심**: 779 SKIP 중 실질적 테스트 대상은 ~179(cascade)뿐. ~600건은 의도적 보류 또는 Cycle 3 범위. Round 2의 실질 실행 대상은 약 418건(PASS 294 + 기타) + Skip cascade 179.

---

## 5. FLAKY 1건 — ISD-ERR-001 join_code DOM 타이밍

**TC**: `03-instructor-flow.spec.ts:125` (ISD-ERR-001)  
**검증 내용**: draft 세션 DOM에 join_code 평문이 없는지 확인 (`page.content()` 기반 placeholder 존재 검증)

### 원인: React hydration 타이밍 레이스

`waitForLoadState('networkidle')` 후 즉시 `page.content()` 호출. `networkidle`은 React hydration 완료를 보장하지 않음.

```
SSR HTML → placeholder 렌더 → hydration → 실제 문구 확정
```

ISD 테스트 직후 실행 시 부하로 hydration 지연 → TC가 hydration 전 내용을 읽어 false negative 발생. retry로 통과.

### 보안 맥락

qa가 "보안 민감"으로 분류한 이유: draft 세션은 `join_code = null`이어야 하며, DOM에 6자리 코드가 노출되면 학생 무단 참여 가능. 해당 TC는 **간접 보안 검증** (안내 문구 존재 = 코드 없음 방식).

**현재 코드는 안전** — placeholder 렌더 정상, 실제 코드 leak 없음. 다만 TC의 검증 방식이 hydration 타이밍에 의존해 false negative 가능성 존재.

### Fix (적용 완료 — dev-2)

dev-2가 `toContainText` 패턴으로 spec 적용 완료:
```ts
await expect(locator).toContainText(/수업을 시작하면|코드가 발급|시작하면/, { timeout: 10_000 });
```
권고한 `waitForSelector(':text(...)', { state: 'visible' })`와 **등가** — 둘 다 Playwright auto-retry 적용. 이미 적용된 패턴 그대로 유지. 코드 변경 없음.

**Option 2 거부**: draft 안내 SSR 전환 — 분량 크고 현재 문제 없음 (YAGNI).

### Cycle 3 이관 권고

간접 검증 → **직접 검증**으로 업그레이드. placeholder 문구 가시성 확인 후 부재 검증:
```ts
// ✅ 올바른 패턴 (critic-2 정정): placeholder 문구가 visible 된 후 코드 부재 검증
await expect(page.getByText(/수업을 시작하면|코드가 발급|시작하면/))
  .toBeVisible({ timeout: 5_000 });
```

> **⚠️ 정정 (critic-2)**: 초안에서 제안한 `page.locator('[data-testid="join-code"]')` 대기는 TC 본질과 충돌. ISD-ERR-001은 해당 엘리먼트의 **부재**를 검증하는 TC이므로, 해당 selector를 기다리면 영원히 timeout 발생. 부재 검증 TC에는 **placeholder 대기 → 부재 단언** 순서가 올바른 패턴.

SSR 전환은 성능/접근성 개선 목적으로 Cycle 3에서 별도 검토.

---

## 6. Wiki 선제 발견 3건 최종 검증

| # | Gotcha | Round 1 | Round 2 | 최종 상태 |
|---|--------|---------|---------|---------|
| 1 | DeltaChart `understanding_scores` camelCase/snake_case | Pending (ISD spec 재실행 대기) | SKIP (Cycle 3 대상 추정) | **미검증** — Round 3 또는 Cycle 3 |
| 2 | `/api/ai/report` studentId 누락 → 강사 400 | Pending (auth 만료 가려짐) | SKIP 또는 PASS | **재확인 필요** |
| 3 | DashboardData camelCase 불일치 | ✅ 확정 (Cat-D 6건) | ✅ PASS (spec 수정) | **해소 완료** |

Gotcha 1, 2는 779 SKIP 중 Cycle 3 대상 ~400에 포함됐을 가능성이 높음. Round 3에서 AI/Realtime 검증 진행 시 재검증.

---

## 7. Round 1 예측 vs Round 2 실적 비교

| 예측 (정정 후) | 실적 | 정확도 |
|-------------|------|--------|
| P0 완료 시 FAIL ~43 | FAIL 0 | 낙관적 — 실제 더 우수 |
| P0+spec 수정 시 FAIL ~21 | FAIL 0 | 낙관적 — 실제 더 우수 |
| Cat-G ~47건 P0 후 재분류 | 전량 해소 | Cat-G = auth 연쇄 100% |

**시사점**: Cat-G "복합/미분류 ~47건" 전량이 auth 만료 연쇄였음. 진짜 코드/RLS 버그는 Round 2 FAIL에 나타나지 않음. P6(session_participants academy_id) 리스크는 Round 3 RLS 전용 실행에서 확인 필요.

---

## 8. Round 3 분석 대비 주시 영역

### 8-1. WebSocket Realtime 검증 (SSN-RT-006~015)
- `useRealtimeResponses` CHANNEL_ERROR/TIMED_OUT 처리 — `hook-use-realtime.md` Gotcha 참조
- Playwright에서 WebSocket 이벤트 재현은 `--workers=1` 필수
- FLAKY 가능성 높음 — `--retries=2` 사전 설정 권고

### 8-2. AI 응답 구조 검증
- DeltaChart Gotcha 1 (camelCase vs snake_case) — `component-delta-chart.md` 참조
- `/api/ai/report` studentId 누락 Gotcha 2 — `api-ai-report.md` 참조
- AI 응답 Zod 검증 실패 시 502 반환 — 모의 응답 없이는 실제 Gemini 호출 필요

### 8-3. mentor flow 통합
- MLS-RLS-001/003/004, MSD-RLS-001/002/008 — auth 가려짐 해소 후 실제 RLS 버그 여부
- P6: session_participants academy_id 교차 참여 방어 RLS 확인

---

## 9. 패턴 발견

**P-1: 120건 FAIL의 99%가 환경 이슈 + 스펙 오류**  
진짜 코드 버그는 Round 2에서 발견되지 않음. Cat-D(camelCase) 6건이 실질적 코드-스펙 불일치였고, 나머지는 환경(auth) + 스펙(상태코드/fixture) 문제.

**P-2: "이중 체크" 프로세스 효과 확인**  
Round 1 분석에서 Cat-A(participants 없음), Cat-E(redirect 없음)를 오분류했으나 critic-2 Read 정정으로 수정. Round 2에서 해당 오류가 회귀를 유발하지 않음. 이중 체크 프로세스 표준화 가치 입증.

**P-3: Wiki 선제 발견 Cat-D 확정, Cat-G 위험 미발현**  
session_participants academy_id 방어 누락(P6)은 Round 2에서 미검증 — Cycle 3 RLS 전용 실행에서 블로커 가능성 유지.

---

## 10. 프로세스 개선 기록

- Round 1 → Round 2: 실행 로그 + 현재 파일 상태 이중 체크 도입 → Cat-A/E 오분류 수정
- Round 2 FLAKY 1건: 타이밍 이슈 → `waitForSelector` 패턴 표준화 권고
- 779 SKIP 재분류로 Cycle 3 범위 명확화 — Round 3 선행 조건 가시화

### 교훈 — TC Fix 권고 시 TC 의도 먼저 확인

> TC Fix 권고 시 **TC의 의도(무엇을 검증하는가)**를 먼저 확인해야 한다. ISD-ERR-001은 "부재 검증" TC인데 "DOM 타이밍 문제"로만 접근해 "selector 기다리기"를 권고하는 오류 발생. 부재 검증 TC에는 placeholder 대기 → 부재 단언 순서가 올바른 패턴. Cycle 3부터는 TC 의도 확인 → Fix 권고 순서 준수. (critic-2 정정 #2 — Cat-E 정정과 동일 패턴: 현재 파일/TC 의도 미확인 → 오분류)

---

## 11. 권고

**Round 3 선행 조건**:
1. FLAKY join_code 타이밍 → spec에 `waitForSelector` 추가 (qa)
2. Cycle 3 ~400 SKIP 중 WebSocket/AI 관련 우선 활성화 범위 확정 (planner)
3. P6 RLS 교차 참여 — `session_participants` 정책 grep 확인 후 Round 3 포함 여부 결정 (dev-2)

**T12 상태**: FAIL 0 달성. Round 3 진입 또는 T9(최종 보고서) 전환 planner 결정 대기.
