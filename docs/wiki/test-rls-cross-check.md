---
type: test
id: test-rls-cross-check
related:
  - "[[test-e2e-strategy]]"
  - "[[concept-academy-isolation]]"
  - "[[rls-profiles]]"
  - "[[rls-sessions]]"
  - "[[rls-responses]]"
  - "[[rls-consultation-notes]]"
sources:
  - "tests/e2e/regression/"
  - "supabase/migrations/00006_fix_profiles_rls_recursion.sql"
  - "supabase/migrations/00007_add_mentor_role.sql"
updated: 2026-04-11
owner: team-lead
---

# RLS 교차 검증 테스트 전략

## Summary

다계정 storageState 전환으로 "A 학원 사용자가 B 학원 데이터에 접근 불가"를 직접 검증. 각 테이블별 RLS 정책을 스펙화된 시나리오로 고정.

## Key Claims

- `tests/e2e/regression/` 하위에 테이블별 RLS 교차 검증 spec이 존재한다 (Cycle 2 T11 재편 후).
- 4개 계정(teacher/student/mentor/owner)이 **같은 학원** 소속으로 전제되며, 타 학원 데이터 접근 차단은 **별도 학원** fixture로 테스트한다.
- RLS 정책 위반이 발견되면 즉시 코드 버그로 분류 — flaky 허용 0.
- Cycle 1 migration 00006 무한재귀 이슈(원격 미적용 상태)가 T7 중 재발견되어 MCP로 원격 적용 → 이후 RLS 교차 테스트 통과. 이 회귀는 상시 검증 대상.

## Intuition / Why

Supabase RLS는 DB 레벨 보안이지만, 실제 프로덕션에서 오작동하는 경로는:
1. RLS 정책 자체 버그 (e.g., profiles 자기참조 무한재귀)
2. API Route가 `service_role` 키로 RLS 우회 (의도적이나 범위 오남용)
3. `SECURITY DEFINER` 함수의 권한 상승 (get_my_academy_id)
4. client-side에서 Supabase 직접 쿼리 시 RLS는 동작하지만 응답 필드 필터 누락 (join_code)

E2E에서 이 4가지를 모두 검증하려면 **다계정 전환**이 필요하다. 단일 계정 테스트로는 RLS 격리를 증명할 수 없다.

## Details

검증 패턴 (개념):
```ts
// 다계정 storageState 전환
test('A 학원 teacher가 B 학원 session 조회 불가', async ({ browser }) => {
  const ctxA = await browser.newContext({ storageState: 'auth/teacherA.json' });
  const pageA = await ctxA.newPage();
  const res = await pageA.request.get('/api/sessions');
  const body = await res.json();
  expect(body.data.every(s => s.academy_id === ACADEMY_A_ID)).toBe(true);
  // B 학원 session이 응답에 섞여있으면 실패
});
```

테이블별 검증 대상:
- `profiles` — 본인 row만 조회 가능
- `sessions` — `academy_id = get_my_academy_id()`
- `responses` — 본인 session 참여자만
- `consultation_notes` — mentor/owner만 INSERT, 동 학원만 SELECT
- `academies` — `id = get_my_academy_id()`

## Connections

- [[test-e2e-strategy]] — upstream: E2E 전략이 이 RLS 교차 검증을 명시
- [[concept-academy-isolation]] — implements: 학원 격리 개념의 테스트 구현
- [[rls-profiles]] / [[rls-sessions]] / [[rls-responses]] / [[rls-consultation-notes]] — uses: 각 테이블 RLS 정책을 검증

## Gotchas

- **MCP 원격 적용 누락**: 로컬 마이그레이션만 적용하고 원격 Supabase에 누락되면 E2E가 로컬은 통과하지만 CI/staging에서 실패. Cycle 1 Round 1에서 이 회귀 발생. 해결: `supabase db push` 를 Round 시작 전 표준 절차로 포함 (Cycle 2 plan §9).
- **`get_my_academy_id()` SECURITY DEFINER**: 이 함수가 `auth.uid()` 컨텍스트에서 실행되므로, 테스트 시 반드시 **로그인 후** 호출해야 함. 익명 context에서는 NULL 반환.
- **`service_role` 우회 금지**: 테스트 코드가 `SUPABASE_SECRET_KEY` 를 직접 사용하면 RLS 우회로 false negative. 오직 **로그인한 세션 쿠키**로만 검증.

## Changelog

- 2026-04-11 — 초판. Cycle 1 migration 00006 회귀 교훈 정리 (team-lead)
