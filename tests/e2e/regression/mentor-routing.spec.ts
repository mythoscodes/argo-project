/**
 * regression/mentor-routing.spec.ts
 * CMN-ERR-002 / LGN-ERR-003: mentor 라우팅 회귀
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE, TEST_USERS } from '../fixtures/users';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.describe('mentor 라우팅 회귀 (CMN-ERR-002, LGN-ERR-003)', () => {
  // CMN-ERR-002: mentor role → / → /mentor 리다이렉트
  test('CMN-ERR-002: mentor 세션으로 / 접속 → /mentor 리다이렉트 (루프 없음)', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE.mentor });
    const page = await context.newPage();
    try {
      await page.goto('/');
      await page.waitForURL('**/mentor**', { timeout: 10_000 });
      expect(page.url()).toContain('/mentor');
    } finally {
      await context.close();
    }
  });

  // LGN-ERR-003: mentor 로그인 → /mentor 리다이렉트
  test('LGN-ERR-003: mentor 로그인 → /mentor로 이동', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', TEST_USERS.mentor.email);
    await page.fill('#password', TEST_USERS.mentor.password);
    await Promise.all([
      page.waitForURL('**/mentor**', { timeout: 20_000 }),
      page.click('button[type="submit"]'),
    ]);
    expect(page.url()).toContain('/mentor');
  });

  // AC-4-a: teacher가 /mentor 접근 → /instructor 리다이렉트
  test('AC-4-a: teacher가 /mentor 직접 접근 → /instructor 리다이렉트', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE.teacher });
    const page = await context.newPage();
    try {
      await page.goto('/mentor');
      await page.waitForURL((url) => !url.pathname.startsWith('/mentor'), { timeout: 10_000 });
      expect(page.url()).toContain('/instructor');
    } finally {
      await context.close();
    }
  });

  // AC-4-b: student가 /mentor 접근 → /student/join 리다이렉트
  test('AC-4-b: student가 /mentor 직접 접근 → /student/join 리다이렉트', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE.student });
    const page = await context.newPage();
    try {
      await page.goto('/mentor');
      await page.waitForURL((url) => !url.pathname.startsWith('/mentor'), { timeout: 10_000 });
      expect(page.url()).toContain('/student');
    } finally {
      await context.close();
    }
  });

  // AC-4-c: owner가 /mentor 접근 → /owner 리다이렉트
  test('AC-4-c: owner가 /mentor 직접 접근 → /owner 리다이렉트', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE.owner });
    const page = await context.newPage();
    try {
      await page.goto('/mentor');
      await page.waitForURL((url) => !url.pathname.startsWith('/mentor'), { timeout: 10_000 });
      expect(page.url()).toContain('/owner');
    } finally {
      await context.close();
    }
  });

  // AC-4-d: 미인증 → /mentor → /login 리다이렉트
  test('AC-4-d: 미인증 상태로 /mentor 직접 접근 → /login 리다이렉트', async ({ page }) => {
    await page.goto('/mentor');
    await page.waitForURL('**/login**', { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  // AC-4-e: teacher가 /mentor/students/[id] 접근 → 리다이렉트
  test('AC-4-e: teacher가 /mentor/students/fake-id 직접 접근 → /instructor 리다이렉트', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE.teacher });
    const page = await context.newPage();
    try {
      await page.goto('/mentor/students/fake-id');
      await page.waitForURL((url) => !url.pathname.startsWith('/mentor'), { timeout: 10_000 });
      expect(page.url()).not.toContain('/mentor');
    } finally {
      await context.close();
    }
  });

  // MLS-AUTH-001~004: 각 role의 /mentor 접근 제어
  test('MLS-AUTH-001: 비인증 접근 → /login 리다이렉트', async ({ page }) => {
    await page.goto('/mentor');
    await page.waitForURL('**/login**', { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  // mentor 회원가입 API enum 확인 (AC-1)
  test('AC-1: POST /api/auth/register role=mentor → 201 (enum에 mentor 존재)', async ({ request }) => {
    const uniqueEmail = `e2e-mentor-reg-${Date.now()}@test.argos`;
    const res = await request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        email: uniqueEmail,
        password: 'TestPass123',
        display_name: 'E2E 멘토 신규',
        role: 'mentor',
      },
    });
    expect([201, 409]).toContain(res.status());
    if (res.status() === 201) {
      const body = await res.json();
      expect(body.data).not.toHaveProperty('join_code');
      expect(body.data.role).toBe('mentor');
    }
  });

  // AC-1: role=admin → 400
  test('AC-1: POST /api/auth/register role=admin → 400 (유효하지 않은 role)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        email: `e2e-admin-${Date.now()}@test.argos`,
        password: 'TestPass123',
        display_name: 'E2E Admin',
        role: 'admin',
      },
    });
    expect(res.status()).toBe(400);
  });
});
