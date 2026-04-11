/**
 * 01-mentor-auth.spec.ts
 *
 * AC-1~4: mentor 라우팅 검증
 *  - AC-1: mentor 계정이 회원가입 가능 (POST /api/auth/register role=mentor → 201)
 *  - AC-2: mentor 로그인 → /mentor 리다이렉트
 *  - AC-3: / 진입 시 mentor → /mentor 리다이렉트
 *  - AC-4: /mentor 레이아웃 role 가드 (다른 role은 각자의 홈으로 리다이렉트)
 */
import { test, expect } from '@playwright/test';
import { TEST_USERS, AUTH_STATE } from './fixtures/users';

// ─── AC-1: mentor 회원가입 API ───────────────────────────────────────────────

test.describe('AC-1: mentor 회원가입 API', () => {
  test('POST /api/auth/register role=mentor → 201, 응답에 join_code 없음', async ({ request }) => {
    await test.step('유니크 이메일로 mentor 계정 생성', async () => {
      const uniqueEmail = `e2e-mentor-unique-${Date.now()}@test.argos`;

      const res = await request.post('/api/auth/register', {
        data: {
          email: uniqueEmail,
          password: 'TestPass123',
          display_name: '테스트 멘토',
          role: 'mentor',
        },
      });

      expect(res.status(), 'mentor 가입은 HTTP 201이어야 한다').toBe(201);
      const body = await res.json();
      expect(body.data.role, '응답 role이 mentor여야 한다').toBe('mentor');
      expect(
        JSON.stringify(body),
        '응답 JSON에 join_code가 포함되면 안 된다 (REG-ERR-001 회귀)',
      ).not.toContain('join_code');
    });
  });

  test('POST /api/auth/register role=admin → 400 (유효하지 않은 role)', async ({ request }) => {
    await test.step('admin role은 Zod 검증에서 거부', async () => {
      const res = await request.post('/api/auth/register', {
        data: {
          email: `e2e-bad-role-${Date.now()}@test.argos`,
          password: 'TestPass123',
          display_name: '잘못된 역할',
          role: 'admin',
        },
      });
      expect(res.status()).toBe(400);
    });
  });
});

// ─── AC-2: mentor 로그인 → /mentor ──────────────────────────────────────────

test.describe('AC-2: mentor 로그인 리다이렉트', () => {
  test('mentor 계정 로그인 후 /mentor로 이동', async ({ page }) => {
    await test.step('/login 페이지 접속', async () => {
      await page.goto('/login');
    });

    await test.step('mentor 계정으로 로그인', async () => {
      await page.fill('#email', TEST_USERS.mentor.email);
      await page.fill('#password', TEST_USERS.mentor.password);
      await Promise.all([
        page.waitForURL('**/mentor**', { timeout: 15_000 }),
        page.click('button[type="submit"]'),
      ]);
    });

    await test.step('/mentor 경로로 리다이렉트 확인', async () => {
      expect(page.url()).toContain('/mentor');
      expect(page.url()).not.toContain('/login');
    });
  });
});

// ─── AC-3: / 진입 시 mentor → /mentor ───────────────────────────────────────

test.describe('AC-3: 홈(/) mentor 리다이렉트', () => {
  test.use({ storageState: AUTH_STATE.mentor });

  test('mentor 세션으로 / 접속 → /mentor 리다이렉트', async ({ page }) => {
    await test.step('/ 접속', async () => {
      await page.goto('/');
    });

    await test.step('/mentor로 리다이렉트 확인', async () => {
      await page.waitForURL('**/mentor**', { timeout: 10_000 });
      expect(page.url()).toContain('/mentor');
    });
  });
});

// ─── AC-4: /mentor role 가드 ─────────────────────────────────────────────────

test.describe('AC-4-a: /mentor 직접 접근 — teacher 세션 → /instructor 리다이렉트', () => {
  test.use({ storageState: AUTH_STATE.teacher });

  test('teacher가 /mentor 직접 접근 → /instructor로 리다이렉트', async ({ page }) => {
    await test.step('/mentor 직접 접속 시도', async () => {
      await page.goto('/mentor');
    });

    await test.step('/instructor로 리다이렉트 확인', async () => {
      await page.waitForURL('**/instructor**', { timeout: 10_000 });
      expect(page.url()).toContain('/instructor');
      expect(page.url()).not.toContain('/mentor');
    });
  });
});

test.describe('AC-4-b: /mentor 직접 접근 — student 세션 → /student/join 리다이렉트', () => {
  test.use({ storageState: AUTH_STATE.student });

  test('student가 /mentor 직접 접근 → /student/join으로 리다이렉트', async ({ page }) => {
    await test.step('/mentor 직접 접속 시도', async () => {
      await page.goto('/mentor');
    });

    await test.step('/student/join으로 리다이렉트 확인', async () => {
      await page.waitForURL('**/student**', { timeout: 10_000 });
      expect(page.url()).toContain('/student');
      expect(page.url()).not.toContain('/mentor');
    });
  });
});

test.describe('AC-4-c: /mentor 직접 접근 — owner 세션 → /owner 리다이렉트', () => {
  test.use({ storageState: AUTH_STATE.owner });

  test('owner가 /mentor 직접 접근 → /owner로 리다이렉트', async ({ page }) => {
    await test.step('/mentor 직접 접속 시도', async () => {
      await page.goto('/mentor');
    });

    await test.step('/owner로 리다이렉트 확인', async () => {
      await page.waitForURL('**/owner**', { timeout: 10_000 });
      expect(page.url()).toContain('/owner');
      expect(page.url()).not.toContain('/mentor');
    });
  });
});

test.describe('AC-4-d: /mentor 직접 접근 — 미인증 → /login 리다이렉트', () => {
  // storageState 없음 (빈 컨텍스트)

  test('미인증 상태로 /mentor 직접 접근 → /login으로 리다이렉트', async ({ page }) => {
    await test.step('/mentor 직접 접속 시도 (미인증)', async () => {
      await page.goto('/mentor');
    });

    await test.step('/login으로 리다이렉트 확인', async () => {
      await page.waitForURL('**/login**', { timeout: 10_000 });
      expect(page.url()).toContain('/login');
    });
  });
});

// ─── AC-4 하위 경로 가드 확인 ────────────────────────────────────────────────

test.describe('AC-4-e: /mentor/students/[id] 직접 접근 — teacher → 리다이렉트', () => {
  test.use({ storageState: AUTH_STATE.teacher });

  test('teacher가 /mentor/students/fake-id 직접 접근 → /instructor로 리다이렉트', async ({ page }) => {
    await page.goto('/mentor/students/fake-student-id');
    await page.waitForURL('**/instructor**', { timeout: 10_000 });
    expect(page.url()).not.toContain('/mentor');
  });
});
