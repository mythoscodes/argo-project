---
type: test
id: test-e2e-strategy
related:
  - "[[process-qa-regression]]"
  - "[[test-ai-mocking]]"
  - "[[test-rls-cross-check]]"
  - "[[lib-supabase-server]]"
  - "[[api-ai-quiz]]"
sources:
  - "playwright.config.ts"
  - "tests/e2e/global-setup.ts"
  - "docs/scrum/acceptance-criteria.md#AC-6"
  - "docs/scrum/e2e-results.md"
updated: 2026-04-11
owner: team-lead
---

# E2E 테스트 전략

## Summary

Playwright webServer 기반 local dev + storageState 인증 + `page.route` AI 스텁 조합. Cycle 1에서 26 tests 100% PASS, Cycle 2는 1024 TC 자동화 목표.

## Key Claims

- `playwright.config.ts`의 `workers: process.env.CI ? 1 : 4` 설정으로 로컬 병렬 4워커, CI 순차 1워커. (playwright.config.ts)
- `tests/e2e/global-setup.ts`는 실제 UI 로그인 후 `context.storageState()`로 인증 상태를 저장하며, T14-Patch1에서 `waitForLoadState('networkidle')` warm-up을 추가했다.
- 모든 `/api/ai/**` 호출은 `page.route()` 로 **스텁**한다 — Gemini 실호출 0건. (tests/e2e/fixtures/helpers.ts)
- `tests/e2e/` 하위는 `ui/ api/ realtime/ regression/` 4개 서브디렉토리로 재편 예정(T11). 현재 Cycle 1 기준 flat 4개 스펙.
- Cycle 1 기준: 26 tests in 24.1s. Cycle 2 목표: 1024 tests in <5분 (workers: 4).

## Intuition / Why

**왜 실제 UI 로그인인가**: Supabase JWT를 수동 조작하는 것보다 실제 브라우저 로그인이 stateful 테스트에 가장 강건하다. 세션 쿠키의 domain/path/expires 속성이 정확히 세팅되어 Server Component도 정상 인식한다. T14-Patch1 warm-up 추가 이유는 [[rls-profiles]] 무한재귀 이슈 회귀 시 flaky 방지.

**왜 AI 스텁인가**: Gemini 실호출은 ① 느림(수 초), ② 비결정적(매번 다른 응답), ③ 비용. Playwright `page.route('/api/ai/**')` 로 Zod 스키마 준수하는 고정 응답을 반환 → 결정적·빠름·무료. 상세는 [[test-ai-mocking]].

**왜 workers=4인가**: Next dev 서버 1대 + Chromium 4 context → CPU 유틸 최대치. Supabase 연결 공유는 문제없음(연결풀).

## Details

```ts
// playwright.config.ts 핵심
{
  testDir: './tests/e2e',
  workers: process.env.CI ? 1 : 4,
  reporter: 'list',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
}
```

`global-setup.ts`가 4개 계정(teacher/student/mentor/owner)을 순차 등록 → 로그인 → storageState 저장.

## Connections

- [[process-qa-regression]] — upstream: QA 5사이클 회귀 방지 프로세스가 이 전략을 요구
- [[test-ai-mocking]] — downstream: AI 스텁 전략 상세
- [[test-rls-cross-check]] — downstream: RLS 교차 검증 테스트 방식
- [[lib-supabase-server]] — uses: E2E가 이 클라이언트의 getAll-only 패턴을 검증
- [[api-ai-quiz]] — uses: E2E가 이 API를 스텁으로 차단 후 응답 검증

## Gotchas

- **원격 Supabase RLS 상태 의존**: Cycle 1 Round 1에서 migration 00006이 원격 DB에 미적용이라 ERR_TOO_MANY_REDIRECTS 발생. 이후 MCP로 원격 적용 → 해결. **교훈**: 로컬 테스트 전 원격 DB 마이그레이션 최신화 확인 필수.
- **storageState TTL**: JWT 만료(1시간) 이후에는 재로그인 필요. `global-setup.ts`가 매 실행마다 새로 저장하므로 일반적으로 문제없으나, CI에서 step 간 시간차가 크면 만료 가능.
- **`webServer.reuseExistingServer`**: 로컬에서 수동으로 `npm run dev` 실행 중이면 Playwright가 재사용. 포트 충돌 시 `lsof -i :3000` 확인.

## Changelog

- 2026-04-11 — 초판. Cycle 1 26/26 PASS 기록 + Cycle 2 전략 정리 (team-lead)
