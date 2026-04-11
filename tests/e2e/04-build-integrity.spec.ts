/**
 * 04-build-integrity.spec.ts
 *
 * AC-8: 앱 무결성 기본 확인
 *
 * 참고: npm run build / npm run lint 무결성은 CI 스크립트에서 별도 확인하는 것이 권장됨.
 * 이 스펙은 런타임 앱 건강 상태(주요 페이지 로드, JS 에러 없음)를 Playwright로 확인한다.
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE } from './fixtures/users';

test.describe('AC-8: 앱 런타임 무결성', () => {
  // /login 페이지 — 미인증 진입점 정상 로드
  test('/login 페이지 정상 로드 — JS 콘솔 에러 없음', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await test.step('로그인 폼 핵심 요소 확인', async () => {
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    await test.step('콘솔 에러 없음 확인', async () => {
      // Next.js 하이드레이션 경고 등 알려진 무해한 에러는 필터링
      const fatalErrors = consoleErrors.filter(
        (e) =>
          !e.includes('Warning:') &&
          !e.includes('Download the React DevTools') &&
          !e.includes('favicon'),
      );
      expect(fatalErrors).toHaveLength(0);
    });
  });

  // /register 페이지 정상 로드
  test('/register 페이지 정상 로드', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
  });

  // 강사 대시보드 정상 로드
  test.describe('강사 대시보드 로드', () => {
    test.use({ storageState: AUTH_STATE.teacher });

    test('/instructor 페이지 정상 로드 — 빈 상태 또는 목록 렌더', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.goto('/instructor');
      await page.waitForLoadState('networkidle');

      // 크래시 없이 뭔가 렌더되어야 함
      const body = await page.locator('body').innerHTML();
      expect(body.length).toBeGreaterThan(100);

      const fatalErrors = consoleErrors.filter(
        (e) =>
          !e.includes('Warning:') &&
          !e.includes('Download the React DevTools'),
      );
      expect(fatalErrors).toHaveLength(0);
    });
  });

  // mentor 페이지 정상 로드
  test.describe('mentor 대시보드 로드', () => {
    test.use({ storageState: AUTH_STATE.mentor });

    test('/mentor 페이지 정상 로드 — 크래시 없음', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.goto('/mentor');
      await page.waitForLoadState('networkidle');

      const body = await page.locator('body').innerHTML();
      expect(body.length).toBeGreaterThan(100);

      const fatalErrors = consoleErrors.filter(
        (e) =>
          !e.includes('Warning:') &&
          !e.includes('Download the React DevTools'),
      );
      expect(fatalErrors).toHaveLength(0);
    });
  });

  // 404 처리 — 존재하지 않는 경로
  test('존재하지 않는 경로 → 404 또는 리다이렉트 (크래시 없음)', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-9999');
    await page.waitForLoadState('networkidle');

    // 크래시(500 에러 페이지 또는 빈 페이지)가 아닌 이상 통과
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});
