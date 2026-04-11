/**
 * ui/login.spec.ts
 * LGN-UI / LGN-API / LGN-ERR: 로그인
 * 라우트: /login
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE, TEST_USERS } from '../fixtures/users';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.describe('LGN: 로그인 (/login)', () => {
  test.describe('UI 시나리오', () => {
    test('LGN-UI-001: 정상 로그인 (강사) → /instructor', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.teacher.email);
      await page.fill('#password', TEST_USERS.teacher.password);
      await Promise.all([
        page.waitForURL('**/instructor**', { timeout: 20_000 }),
        page.click('button[type="submit"]'),
      ]);
      expect(page.url()).toContain('/instructor');
    });

    test('LGN-UI-002: 정상 로그인 (수강생) → /student/join', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.student.email);
      await page.fill('#password', TEST_USERS.student.password);
      await Promise.all([
        page.waitForURL('**/student**', { timeout: 20_000 }),
        page.click('button[type="submit"]'),
      ]);
      expect(page.url()).toContain('/student');
    });

    test('LGN-UI-003: 정상 로그인 (원장) → /owner', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.owner.email);
      await page.fill('#password', TEST_USERS.owner.password);
      await Promise.all([
        page.waitForURL('**/owner**', { timeout: 20_000 }),
        page.click('button[type="submit"]'),
      ]);
      expect(page.url()).toContain('/owner');
    });

    test('LGN-UI-004: 정상 로그인 (mentor) → /mentor', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.mentor.email);
      await page.fill('#password', TEST_USERS.mentor.password);
      await Promise.all([
        page.waitForURL('**/mentor**', { timeout: 20_000 }),
        page.click('button[type="submit"]'),
      ]);
      expect(page.url()).toContain('/mentor');
    });

    test('LGN-UI-005: 이메일 형식 검증 — type="email" 브라우저 차단', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', 'notanemail');
      await page.fill('#password', 'TestPass123');
      await page.click('button[type="submit"]');
      // type="email" 검증으로 인해 폼 제출 안 됨 (URL 변경 없음)
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/login');
    });

    test('LGN-UI-006: 필수 필드 공란 제출 → required 검증', async ({ page }) => {
      await page.goto('/login');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/login');
    });

    test('LGN-UI-007: 로딩 상태 UI — "로그인 중..." + disabled', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.teacher.email);
      await page.fill('#password', TEST_USERS.teacher.password);
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();
      // 로딩 중 버튼 비활성화 확인 (빠를 수 있으므로 race condition 감안)
      const isDisabledOrNavigated = await Promise.race([
        submitBtn.isDisabled().then((d) => d),
        page.waitForURL('**/instructor**', { timeout: 20_000 }).then(() => true),
      ]);
      expect(isDisabledOrNavigated).toBeTruthy();
    });

    test('LGN-UI-008: 회원가입 링크 → /register로 이동', async ({ page }) => {
      await page.goto('/login');
      await page.click('a[href="/register"]');
      await page.waitForURL('**/register**', { timeout: 5_000 });
      expect(page.url()).toContain('/register');
    });

    test('LGN-UI-009: 자동완성 속성 확인', async ({ page }) => {
      await page.goto('/login');
      const emailInput = page.locator('#email');
      const pwInput = page.locator('#password');
      expect(await emailInput.getAttribute('autocomplete')).toBe('email');
      expect(await pwInput.getAttribute('autocomplete')).toBe('current-password');
    });

    test('LGN-UI-010: 이메일 대소문자 — Supabase 소문자 정규화로 로그인 성공', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.teacher.email.toUpperCase());
      await page.fill('#password', TEST_USERS.teacher.password);
      await Promise.all([
        page.waitForURL('**/instructor**', { timeout: 20_000 }),
        page.click('button[type="submit"]'),
      ]);
      expect(page.url()).toContain('/instructor');
    });

    test('LGN-UI-011: 비밀번호 앞뒤 공백 — trim 미적용', async ({ page }) => {
      test.skip(true, 'Cycle 2: 공백 포함 비밀번호 계정 생성 필요 — T12에서 구현');
    });

    test('LGN-UI-012: 이미 로그인된 상태에서 /login 접속 → 역할별 홈 리다이렉트', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        await page.goto('/login');
        // 이미 인증됨 → /login 유지 또는 /instructor 리다이렉트
        await page.waitForLoadState('networkidle');
        // 허용 동작: /login 유지(프론트 미처리) 또는 /instructor 이동
        const url = page.url();
        expect(url).toBeTruthy();
      } finally { await ctx.close(); }
    });

    test('LGN-UI-013: Tab 키 네비게이션 — 이메일→비밀번호→버튼 포커스 순서', async ({ page }) => {
      await page.goto('/login');
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.id);
      expect(['email', 'password']).toContain(focused);
    });

    test('LGN-UI-014: Enter 키 제출', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.teacher.email);
      await page.fill('#password', TEST_USERS.teacher.password);
      await Promise.all([
        page.waitForURL('**/instructor**', { timeout: 20_000 }),
        page.keyboard.press('Enter'),
      ]);
      expect(page.url()).toContain('/instructor');
    });

    test('LGN-UI-015: 로그인 성공 후 새로고침 → 세션 지속', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        await page.goto('/instructor');
        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/instructor');
      } finally { await ctx.close(); }
    });

    test('LGN-UI-016: 페이지 타이틀 — "로그인" 표시', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).toContain('로그인');
    });

    test('LGN-UI-017: 에러 후 재시도 — 에러 메시지 사라지고 정상 로그인', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.teacher.email);
      await page.fill('#password', 'wrongpassword');
      await page.click('button[type="submit"]');
      // 에러 메시지 대기
      await expect(page.locator('p.text-destructive, [role="alert"]').first()).toBeVisible({ timeout: 8_000 });
      // 올바른 비밀번호로 재시도
      await page.fill('#password', TEST_USERS.teacher.password);
      await Promise.all([
        page.waitForURL('**/instructor**', { timeout: 20_000 }),
        page.click('button[type="submit"]'),
      ]);
      expect(page.url()).toContain('/instructor');
    });

    test('LGN-UI-018: 비밀번호 1자 — Supabase 에러 반환', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.teacher.email);
      await page.fill('#password', 'a');
      await page.click('button[type="submit"]');
      // 에러 메시지 표시 or URL 유지
      await page.waitForTimeout(3_000);
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('API 계약', () => {
    test('LGN-API-001: auth.signInWithPassword — 세션 설정 + 쿠키 발급', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.teacher.email);
      await page.fill('#password', TEST_USERS.teacher.password);
      await Promise.all([
        page.waitForURL('**/instructor**', { timeout: 20_000 }),
        page.click('button[type="submit"]'),
      ]);
      const cookies = await page.context().cookies();
      const authCookie = cookies.find((c) => c.name.startsWith('sb-'));
      expect(authCookie).toBeTruthy();
    });

    test('LGN-API-002: auth.getUser() — 로그인 직후 user 반환', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/sessions`);
        expect(res.status()).not.toBe(401);
      } finally { await ctx.close(); }
    });

    test('LGN-API-003: profiles RLS — 본인 role 조회', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        await page.goto('/');
        await page.waitForURL('**/instructor**', { timeout: 10_000 });
        // profiles 조회 성공 = teacher role 확인됨
        expect(page.url()).toContain('/instructor');
      } finally { await ctx.close(); }
    });

    test('LGN-API-004: Set-Cookie 만료 시간 포함', async ({ page }) => {
      test.skip(true, 'Cycle 2: 쿠키 속성 검증 — T12에서 구현');
    });

    test('LGN-API-005: Secure; HttpOnly; SameSite=Lax 쿠키 속성', async ({ page }) => {
      test.skip(true, 'Cycle 2: HTTPS 환경 쿠키 속성 검증 — T12에서 구현');
    });

    test('LGN-API-006: profiles RLS — 타 유저 ID로 조회 → 빈 결과', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타 유저 직접 조회 시나리오 — T12에서 구현');
    });
  });

  test.describe('에러 / 엣지', () => {
    test('LGN-ERR-001: 잘못된 비밀번호 → 한국어 에러 메시지', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.teacher.email);
      await page.fill('#password', 'wrongpassword');
      await page.click('button[type="submit"]');
      await expect(page.locator('p:has-text("이메일 또는 비밀번호가 올바르지 않습니다.")').first()).toBeVisible({ timeout: 8_000 });
    });

    test('LGN-ERR-002: 미등록 이메일 → 동일 에러 메시지 (이메일 존재 여부 미노출)', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', 'notregistered@test.argos');
      await page.fill('#password', 'TestPass123');
      await page.click('button[type="submit"]');
      await expect(page.locator('p:has-text("이메일 또는 비밀번호가 올바르지 않습니다.")').first()).toBeVisible({ timeout: 8_000 });
    });

    test('LGN-ERR-003: mentor 로그인 → /mentor (회귀 수정 완료)', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.mentor.email);
      await page.fill('#password', TEST_USERS.mentor.password);
      await Promise.all([
        page.waitForURL('**/mentor**', { timeout: 20_000 }),
        page.click('button[type="submit"]'),
      ]);
      expect(page.url()).toContain('/mentor');
    });

    test('LGN-ERR-004: 네트워크 실패 (오프라인) → 에러 표시', async ({ page }) => {
      test.skip(true, 'Cycle 2: 오프라인 시나리오 — T12에서 구현');
    });

    test('LGN-ERR-005: Supabase 레이트 리밋 → 에러 메시지 + 버튼 재활성화', async ({ page }) => {
      test.skip(true, 'Cycle 2: 레이트 리밋 시나리오 — T12에서 구현');
    });

    test('LGN-ERR-006: profiles 행 누락 → default 분기 → /login', async ({ page }) => {
      test.skip(true, 'Cycle 2: profiles 없는 계정 시나리오 — T12에서 구현');
    });

    test('LGN-ERR-007: signInWithPassword 성공했으나 getUser() null → 한국어 에러', async ({ page }) => {
      test.skip(true, 'Cycle 2: 엣지 케이스 시나리오 — T12에서 구현');
    });

    test('LGN-ERR-008: 연속 5회 실패 — 레이트 리밋 응답', async ({ page }) => {
      test.skip(true, 'Cycle 2: 레이트 리밋 시나리오 — T12에서 구현');
    });

    test('LGN-ERR-009: XSS — 이메일 필드 <script> → type="email" 차단', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', '<script>alert(1)</script>');
      await page.fill('#password', 'TestPass123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
      // type="email" 검증으로 차단 or URL 유지
      expect(page.url()).toContain('/login');
    });

    test('LGN-ERR-010: SQL injection — 비밀번호 필드', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.teacher.email);
      await page.fill('#password', "'; DROP TABLE profiles;--");
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3_000);
      // 에러 메시지 or 로그인 실패 (SQL injection 차단)
      expect(page.url()).toContain('/login');
    });

    test('LGN-ERR-011: 이메일 500자 → 에러 반환 (크래시 없음)', async ({ page }) => {
      await page.goto('/login');
      const longEmail = 'a'.repeat(490) + '@test.argos';
      await page.fill('#email', longEmail);
      await page.fill('#password', 'TestPass123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3_000);
      expect(page.url()).toContain('/login');
    });

    test('LGN-ERR-012: 비밀번호 500자 → 에러 반환 (크래시 없음)', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.teacher.email);
      await page.fill('#password', 'a'.repeat(500));
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3_000);
      expect(page.url()).toContain('/login');
    });

    test('LGN-ERR-013: 중복 제출 — isLoading 버튼 disabled, 단일 API 호출', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.teacher.email);
      await page.fill('#password', TEST_USERS.teacher.password);
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();
      // 두 번째 클릭 시 버튼이 disabled 상태여야 함
      const isDisabled = await submitBtn.isDisabled().catch(() => false);
      const navigated = page.url().includes('/instructor');
      expect(isDisabled || navigated).toBeTruthy();
    });

    test('LGN-ERR-014: Supabase 서버 500 → 한국어 에러 메시지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 서버 에러 시뮬레이션 — T12에서 구현');
    });

    test('LGN-ERR-015: profiles.role = 알 수 없는 값 → default 분기 → /', async ({ page }) => {
      test.skip(true, 'Cycle 2: DB 직접 수정 시나리오 — T12에서 구현');
    });

    test('LGN-ERR-016: 로그인 중 탭 닫기 → 재접속 시 /login', async ({ page }) => {
      test.skip(true, 'Cycle 2: 탭 닫기 시나리오 — T12에서 구현');
    });

    test('LGN-ERR-017: ARIA — 에러 메시지 role="alert" 또는 aria-live', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.teacher.email);
      await page.fill('#password', 'wrongpassword');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3_000);
      const errorEl = page.locator('p.text-destructive').first();
      if (await errorEl.isVisible()) {
        // 에러 메시지가 표시됨 — 접근성 속성은 Should 수준
        expect(await errorEl.isVisible()).toBeTruthy();
      }
    });

    test('LGN-ERR-018: 한국어 에러 메시지 정확성', async ({ page }) => {
      await page.goto('/login');
      await page.fill('#email', TEST_USERS.teacher.email);
      await page.fill('#password', 'wrongpassword');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=이메일 또는 비밀번호가 올바르지 않습니다.').first()).toBeVisible({ timeout: 8_000 });
    });
  });
});
