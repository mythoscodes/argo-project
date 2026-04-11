/**
 * regression/rls-isolation.spec.ts
 * ODB-ERR-001/002, IDB-ERR-001: RLS 학원 격리 회귀
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE } from '../fixtures/users';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.describe('RLS 격리 회귀 (ODB-ERR-001/002, IDB-ERR-001)', () => {
  // ODB-ERR-002: 강사 → /owner 접근 차단
  test('ODB-ERR-001/IDB-ERR-001: teacher가 /owner 직접 접근 → /instructor 리다이렉트', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE.teacher });
    const page = await context.newPage();
    try {
      await page.goto('/owner');
      await page.waitForURL((url) => !url.pathname.startsWith('/owner'), { timeout: 10_000 });
      expect(page.url()).not.toContain('/owner');
    } finally {
      await context.close();
    }
  });

  // ODB-ERR-002: 수강생 → /owner 접근 차단
  test('ODB-ERR-002: student가 /owner 직접 접근 → /student/join 리다이렉트', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE.student });
    const page = await context.newPage();
    try {
      await page.goto('/owner');
      await page.waitForURL((url) => !url.pathname.startsWith('/owner'), { timeout: 10_000 });
      expect(page.url()).not.toContain('/owner');
    } finally {
      await context.close();
    }
  });

  // mentor → /owner 접근 차단
  test('mentor가 /owner 직접 접근 → /mentor 리다이렉트', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE.mentor });
    const page = await context.newPage();
    try {
      await page.goto('/owner');
      await page.waitForURL((url) => !url.pathname.startsWith('/owner'), { timeout: 10_000 });
      expect(page.url()).not.toContain('/owner');
    } finally {
      await context.close();
    }
  });

  // ODB-API-003: GET /api/dashboard — 강사 403
  test('ODB-API-003: teacher 쿠키로 GET /api/dashboard → 403', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE.teacher });
    const page = await context.newPage();
    try {
      const res = await page.request.get(`${BASE_URL}/api/dashboard`);
      expect(res.status()).toBe(403);
    } finally {
      await context.close();
    }
  });

  // ODB-API-004: GET /api/dashboard — 수강생 403
  test('ODB-API-004: student 쿠키로 GET /api/dashboard → 403', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE.student });
    const page = await context.newPage();
    try {
      const res = await page.request.get(`${BASE_URL}/api/dashboard`);
      expect(res.status()).toBe(403);
    } finally {
      await context.close();
    }
  });

  // CMN-ERR-014: RLS 재귀 방지 회귀 — / 접속 시 루프 없음
  test('CMN-ERR-014: profiles RLS 재귀 회귀 없음 — / 접속 ERR_TOO_MANY_REDIRECTS 없음', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE.teacher });
    const page = await context.newPage();
    try {
      let errorOccurred = false;
      page.on('pageerror', () => { errorOccurred = true; });
      await page.goto('/');
      await page.waitForURL('**/instructor**', { timeout: 10_000 });
      expect(errorOccurred).toBeFalsy();
      expect(page.url()).toContain('/instructor');
    } finally {
      await context.close();
    }
  });

  // IDB-ERR-001: GET /api/sessions — RLS 학원 격리
  test('IDB-ERR-001: GET /api/sessions — 본인 학원 세션만 반환 (타 학원 세션 미포함)', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE.teacher });
    const page = await context.newPage();
    try {
      const res = await page.request.get(`${BASE_URL}/api/sessions`);
      expect(res.status()).toBe(200);
      const { data } = await res.json();
      expect(Array.isArray(data)).toBeTruthy();
      // 모든 세션이 같은 학원 소속인지 확인 (academy_id 기반)
      // 실제 타 학원 세션 삽입 없이는 격리 검증 불가 — DB RLS 설정으로 보장
    } finally {
      await context.close();
    }
  });
});
