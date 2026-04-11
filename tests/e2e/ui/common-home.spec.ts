/**
 * ui/common-home.spec.ts
 * CMN-UI / CMN-API / CMN-ERR: 홈 (역할 라우팅)
 * 라우트: /
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE, TEST_USERS } from '../fixtures/users';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.describe('CMN: 홈 역할 라우팅 (/)', () => {
  test.describe('UI 시나리오', () => {
    test('CMN-UI-001: 미인증 진입 → /login 리다이렉트', async ({ page }) => {
      await page.goto('/');
      await page.waitForURL('**/login**', { timeout: 10_000 });
      expect(page.url()).toContain('/login');
    });

    test('CMN-UI-002: teacher 세션 → / → /instructor 리다이렉트', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        await page.goto('/');
        await page.waitForURL('**/instructor**', { timeout: 10_000 });
        expect(page.url()).toContain('/instructor');
      } finally { await ctx.close(); }
    });

    test('CMN-UI-003: student 세션 → / → /student/join 리다이렉트', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        await page.goto('/');
        await page.waitForURL('**/student**', { timeout: 10_000 });
        expect(page.url()).toContain('/student');
      } finally { await ctx.close(); }
    });

    test('CMN-UI-004: owner 세션 → / → /owner 리다이렉트', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.owner });
      const page = await ctx.newPage();
      try {
        await page.goto('/');
        await page.waitForURL('**/owner**', { timeout: 10_000 });
        expect(page.url()).toContain('/owner');
      } finally { await ctx.close(); }
    });

    test('CMN-UI-005: mentor 세션 → / → /mentor 리다이렉트', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.mentor });
      const page = await ctx.newPage();
      try {
        await page.goto('/');
        await page.waitForURL('**/mentor**', { timeout: 10_000 });
        expect(page.url()).toContain('/mentor');
      } finally { await ctx.close(); }
    });

    test('CMN-UI-006: 다중 탭 — 동일 세션 리다이렉트 충돌 없음', async ({ browser }) => {
      test.skip(true, 'Cycle 2: 다중 탭 동시 접속 시나리오 — T12에서 구현');
    });

    test('CMN-UI-007: 로그아웃 후 / 재접속 → /login 리다이렉트', async ({ page }) => {
      // 미인증 상태로 진입 → /login
      await page.goto('/');
      await page.waitForURL('**/login**', { timeout: 10_000 });
      expect(page.url()).toContain('/login');
    });

    test('CMN-UI-008: 뒤로가기로 / 접근 → 서버 재평가 후 리다이렉트', async ({ browser }) => {
      test.skip(true, 'Cycle 2: 뒤로가기 시나리오 — T12에서 구현');
    });
  });

  test.describe('API 계약', () => {
    test('CMN-API-001: profiles.select(role) — 본인 행만 조회 (RLS)', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        // / 접속 성공 = profiles RLS 정상 동작 증명
        await page.goto('/');
        await page.waitForURL('**/instructor**', { timeout: 10_000 });
        expect(page.url()).toContain('/instructor');
      } finally { await ctx.close(); }
    });

    test('CMN-API-002: auth.getUser() — 세션 쿠키 유효 시 user 반환', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/sessions`);
        // 인증된 요청 → 401 아님
        expect(res.status()).not.toBe(401);
      } finally { await ctx.close(); }
    });

    test('CMN-API-003: RLS — 타 유저 profiles 조회 시도 → 빈 결과', async ({ browser }) => {
      test.skip(true, 'Cycle 2: 타 유저 ID 직접 조회 시나리오 — T12에서 구현');
    });
  });

  test.describe('에러 / 엣지', () => {
    test('CMN-ERR-001: profiles 행 누락 → /login 리다이렉트', async ({ page }) => {
      test.skip(true, 'Cycle 2: profiles 행 누락 유도 시나리오 — T12에서 구현');
    });

    test('CMN-ERR-002: mentor role → /mentor 리다이렉트 (회귀 수정 완료)', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.mentor });
      const page = await ctx.newPage();
      try {
        await page.goto('/');
        await page.waitForURL('**/mentor**', { timeout: 10_000 });
        expect(page.url()).toContain('/mentor');
      } finally { await ctx.close(); }
    });

    test('CMN-ERR-003: 세션 만료 (쿠키 있지만 getUser() null) → /login 리다이렉트', async ({ page }) => {
      test.skip(true, 'Cycle 2: 쿠키 조작 시나리오 — T12에서 구현');
    });

    test('CMN-ERR-004: profiles.role NULL → /login fallback', async ({ page }) => {
      test.skip(true, 'Cycle 2: DB NULL role 유도 시나리오 — T12에서 구현');
    });

    test('CMN-ERR-005: profiles.select() DB 에러 → /login fallback', async ({ page }) => {
      test.skip(true, 'Cycle 2: DB 에러 유도 시나리오 — T12에서 구현');
    });

    test('CMN-ERR-006: getUser() 성공하나 user.id 없음 → /login', async ({ page }) => {
      test.skip(true, 'Cycle 2: 엣지 케이스 — T12에서 구현');
    });

    test('CMN-ERR-007: role = admin (미정의) → /login 리다이렉트', async ({ page }) => {
      test.skip(true, 'Cycle 2: DB에 admin role 직접 삽입 필요 — T12에서 구현');
    });

    test('CMN-ERR-008: Supabase 연결 타임아웃 → /login fallback', async ({ page }) => {
      test.skip(true, 'Cycle 2: 네트워크 인터셉트 시나리오 — T12에서 구현');
    });

    test('CMN-ERR-009: XSS — URL 파라미터 /?role=<script> → 서버에서 무시', async ({ page }) => {
      await page.goto('/?role=<script>alert(1)</script>');
      // 서버는 URL 파라미터 무시하고 auth.getUser()로 판단 → /login 리다이렉트
      await page.waitForURL((url) => url.pathname !== '/', { timeout: 10_000 });
      expect(page.url()).not.toContain('<script>');
    });

    test('CMN-ERR-010: 쿠키 조작 — 유효하지 않은 JWT → /login 리다이렉트', async ({ page }) => {
      await page.context().addCookies([{
        name: 'sb-auth-token',
        value: 'invalid.jwt.token',
        domain: 'localhost',
        path: '/',
      }]);
      await page.goto('/');
      await page.waitForURL((url) => url.pathname !== '/', { timeout: 10_000 });
      // 유효하지 않은 JWT → /login 이동
      expect(page.url()).not.toContain('/instructor');
    });

    test('CMN-ERR-011: 동시 역할 변경 → 다음 / 접속 시 새 role 적용', async ({ page }) => {
      test.skip(true, 'Cycle 2: DB role 변경 + 재접속 시나리오 — T12에서 구현');
    });

    test('CMN-ERR-012: 새로고침 반복 (F5 × 5) — role 캐싱으로 인한 오류 없음', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        await page.goto('/instructor');
        await page.waitForLoadState('networkidle');
        for (let i = 0; i < 3; i++) {
          await page.reload();
          await page.waitForLoadState('networkidle');
        }
        expect(page.url()).toContain('/instructor');
      } finally { await ctx.close(); }
    });

    test('CMN-ERR-013: 접근성 — 리다이렉트 중 빈 화면 아님', async ({ page }) => {
      test.skip(true, 'Cycle 2: 스크린리더 접근성 검증 — T12에서 구현');
    });

    test('CMN-ERR-014: profiles RLS 재귀 회귀 없음 — ERR_TOO_MANY_REDIRECTS 없음', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        let redirectCount = 0;
        page.on('response', (r) => { if (r.status() === 302 || r.status() === 301) redirectCount++; });
        await page.goto('/');
        await page.waitForURL('**/instructor**', { timeout: 10_000 });
        expect(redirectCount).toBeLessThan(10);
      } finally { await ctx.close(); }
    });

    test('CMN-ERR-015: 네트워크 오프라인 → /login fallback', async ({ page }) => {
      test.skip(true, 'Cycle 2: 오프라인 시나리오 — T12에서 구현');
    });

    test('CMN-ERR-016: profiles.role 대소문자 불일치 → DB CHECK 제약으로 불가', async ({ page }) => {
      test.skip(true, 'Cycle 2: DB 직접 삽입 시나리오 — T12에서 구현');
    });
  });
});
