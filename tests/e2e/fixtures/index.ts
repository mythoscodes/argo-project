/**
 * Playwright 커스텀 fixture — AI 스텁 자동 적용 지원
 *
 * E2E_STUB_MODE=true 환경변수 설정 시 /api/ai/** 전체를 자동 스텁으로 대체.
 * 실제 Gemini 호출 없이 결정론적 응답을 보장하여 cold start 기반 flaky 차단.
 *
 * 사용법:
 *   import { test, expect } from '../fixtures';
 *   // 기존 @playwright/test 임포트를 교체. API 및 동작은 동일.
 *
 * 프로덕션 코드 변경 없음 — Playwright 레이어에서만 동작 (page.route 인터셉트).
 * E2E_STUB_MODE=false (기본) 시 기존 동작과 동일.
 */
import { test as base, expect } from '@playwright/test';
import { stubAiRoutes } from './helpers';

type AutoStubFixtures = {
  /** 내부 전용 — E2E_STUB_MODE=true 시 자동으로 AI 라우트를 스텁 처리 */
  _autoStubAi: void;
};

const test = base.extend<AutoStubFixtures>({
  _autoStubAi: [
    async ({ page }, use) => {
      if (process.env.E2E_STUB_MODE === 'true') {
        stubAiRoutes(page);
      }
      await use();
    },
    { auto: true }, // 이 fixture를 명시적으로 요청하지 않아도 모든 테스트에 자동 적용
  ],
});

export { test, expect };
