# Round 2.5 Plan — flaky fix 미니 루프

작성자: planner  
작성일: 2026-04-11  
배경: Round 2 결과 294 passed / 0 failed / 779 skipped / **1 flaky** — FAIL 0이나 flaky 1건으로 T12 완료 조건 미충족

---

## 단일 목표

`tests/e2e/03-instructor-flow.spec.ts` flaky 제거 (qa spec 수정 2줄 — 프로덕션 코드 변경 없음)

**원인 확정 (critic-2)**: ISD-ERR-001 `toBeVisible` 단언 패턴 미적용 + L111 `waitForTimeout(2_000)` 하드코딩. spec 레벨 수정으로 해소 가능.

**수정 대상**: `tests/e2e/03-instructor-flow.spec.ts` (qa 담당 — 프로덕션 코드 변경 없음)

**수정 패턴 (critic-2 GO: Option A — Playwright 공식 명시적 대기)**:

수정 1 — ISD-ERR-001 (L147-158 근방):
```typescript
// 현재 (flaky) — page.content() 문자열 검색
const pageContent = await page.content();
const hasNullCodeMessage = pageContent.includes('수업을 시작하면') || ...
expect(hasNullCodeMessage, '...').toBeTruthy();

// 수정 — React 렌더 완료 대기
await expect(
  page.getByText('수업을 시작하면').or(page.getByText('코드가 발급'))
).toBeVisible({ timeout: 5_000 });
```

수정 2 — L111 `waitForTimeout` (ISD-UI-004용):
```typescript
// 현재 (하드코딩)
await page.waitForTimeout(2_000);

// 수정 — join_code element 명시적 대기
await expect(
  page.locator('[class*="join"]').or(page.getByText(/[A-Z0-9]{6}/))
).toBeVisible({ timeout: 5_000 });
```

---

## 작업 순서

### Step 1 — qa spec 수정 (✅ critic-2 GO 완료)
- 대상: `tests/e2e/03-instructor-flow.spec.ts`
- 담당: **qa** (spec 타이밍 버그 — dev-2 관여 없음)
- 수정 2곳: ISD-ERR-001 단언 + L111 `waitForTimeout` 교체

### Step 2 — qa 단일 spec 재실행
```bash
npx playwright test tests/e2e/03-instructor-flow.spec.ts --workers=1 --retries=0
```
- 성공 기준: 0 FAIL, 0 flaky

### Step 3 — (선택) 전체 재실행
```bash
npm run test:e2e
```
- 단일 spec 통과 시 선택적으로 실행

---

## Round 3 선행 조건 (P6)

Round 2.5 완료 후 Round 3 진입 전 critic-2 GO 필요:
- **P6**: `session_participants` INSERT RLS — 타 학원 academy_id 교차 방어 검증
  - 현재 Round 2.5 범위 밖 (SKIP 779 내 포함)
  - critic-2 GO 후 Round 3 포함 여부 결정

---

## 통과 기준

| 지표 | 목표 |
|------|------|
| FAIL | 0건 |
| flaky | 0건 |

→ 통과 시 **T12 completed**, T8(critic-2 최종 검증 리뷰) 진입

---

## 예상 소요

| 단계 | 시간 |
|------|------|
| qa spec 수정 | ~5분 |
| qa 단일 spec 재실행 | ~1분 |
| **총** | **~6분** |

---

## 병렬 작업

Round 2.5 실행 중:
- **planner**: `docs/scrum/sprint-report.md` T9 초안 작성 (완료)

---

## 완료 조건

전체 재실행 FAIL=0, flaky=0 확인 → **T12 completed** → critic-2 T8 최종 검증 리뷰 → T9 commit

---

## Changelog

- 2026-04-11 초판 (planner) — Round 2 flaky 1건 처리를 위한 미니 루프 기획
- 2026-04-11 갱신 (planner) — critic-2 확인: dev-2 코드 변경 불필요, qa spec 2줄 수정으로 해소. 전체 스위트 재실행 불필요로 단순화
- 2026-04-11 갱신 (planner) — critic-2 GO 반영: Option A(toBeVisible timeout:5000) 구체적 코드 패턴 추가, Step 2 담당 qa로 명시, P6 Round 3 선행 조건 섹션 추가
