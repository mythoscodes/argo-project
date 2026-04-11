import { defineConfig } from '@playwright/test';

/**
 * E2E_STUB_MODE=true — AI 엔드포인트(/api/ai/**) 자동 스텁 모드
 * Gemini cold start 없이 결정론적 응답 보장. CI 또는 로컬 빠른 실행 시 사용.
 * 적용 방법: E2E_STUB_MODE=true npm run test:e2e
 * 프로덕션 코드 변경 없음 — tests/e2e/fixtures/index.ts Playwright fixture 레벨 동작.
 */
export default defineConfig({
  globalSetup: './tests/e2e/global-setup.ts',
  testDir: './tests/e2e',
  fullyParallel: false, // Supabase 상태 공유로 인해 파일 내 순차 실행
  retries: process.env.CI ? 0 : 1, // 로컬 dev 서버 부하로 인한 일시적 flaky 대응
  workers: process.env.CI ? 1 : 4,
  timeout: 45_000,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  // ISD(세션 상세)가 먼저 완전히 종료된 뒤 ISN(세션 생성)이 시작되도록 의존성 설정.
  // ISD는 130개 세션을 생성하므로 동시 실행 시 dev 서버 과부하로 ISN 타임아웃 발생.
  projects: [
    {
      name: 'instructor-session-detail',
      testMatch: ['**/ui/instructor-session-detail.spec.ts'],
    },
    {
      name: 'instructor-session-new',
      testMatch: ['**/ui/instructor-session-new.spec.ts'],
      dependencies: ['instructor-session-detail'],
    },
    {
      name: 'default',
      testMatch: /^(?!.*ui\/instructor-session-(detail|new)).*\.spec\.ts$/,
    },
  ],
});
