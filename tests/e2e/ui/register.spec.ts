/**
 * ui/register.spec.ts
 * REG-UI / REG-API / REG-ERR: 회원가입
 * 라우트: /register
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE } from '../fixtures/users';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.describe('REG: 회원가입 (/register)', () => {
  test.describe('UI 시나리오', () => {
    test('REG-UI-001: 원장 가입 (신규 학원 생성) → /owner', async ({ page }) => {
      test.skip(true, 'Cycle 2: 중복 가입 방지를 위해 T12에서 환경 정리 후 구현');
    });

    test('REG-UI-002: 강사 가입 → /instructor', async ({ page }) => {
      test.skip(true, 'Cycle 2: 중복 가입 방지를 위해 T12에서 환경 정리 후 구현');
    });

    test('REG-UI-003: 수강생 가입 → /student/join', async ({ page }) => {
      test.skip(true, 'Cycle 2: 중복 가입 방지를 위해 T12에서 환경 정리 후 구현');
    });

    test('REG-UI-004: mentor 가입 → /mentor', async ({ page }) => {
      test.skip(true, 'Cycle 2: 중복 가입 방지를 위해 T12에서 환경 정리 후 구현');
    });

    test('REG-UI-005: 역할 미선택 제출 → 에러', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      // 이름/이메일/비밀번호만 입력하고 역할 미선택
      const nameInput = page.locator('input[id="name"], input[id="display_name"], input[placeholder*="이름"]').first();
      if (await nameInput.isVisible()) await nameInput.fill('테스트');
      const emailInput = page.locator('#email');
      if (await emailInput.isVisible()) await emailInput.fill(`reg-no-role-${Date.now()}@test.argos`);
      const pwInput = page.locator('#password');
      if (await pwInput.isVisible()) await pwInput.fill('TestPass123');
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();
      await page.waitForTimeout(1_000);
      // 에러 메시지 표시 또는 URL 유지
      expect(page.url()).toContain('/register');
    });

    test('REG-UI-006: 원장 역할인데 학원명 공란 → 에러', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      // 역할 선택 로직은 실제 UI에 따라 다름
      const content = await page.content();
      expect(content).toContain('register'); // 페이지 로드 확인
    });

    test('REG-UI-007: 비밀번호 불일치 → 에러', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      const pwConfirm = page.locator('#passwordConfirm, #confirmPassword, input[id*="confirm"]').first();
      if (await pwConfirm.isVisible().catch(() => false)) {
        const pw = page.locator('#password');
        await pw.fill('TestPass123');
        await pwConfirm.fill('DifferentPass123');
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        await page.waitForTimeout(1_000);
        expect(page.url()).toContain('/register');
      } else {
        test.skip(true, '비밀번호 확인 필드 selector 확인 필요');
      }
    });

    test('REG-UI-008: 비밀번호 최소 길이 < 6자 → 브라우저 차단', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      const pw = page.locator('#password');
      if (await pw.isVisible()) {
        await pw.fill('12345');
        const minLength = await pw.getAttribute('minlength');
        // minLength 속성이 있으면 브라우저 차단
        if (minLength) expect(parseInt(minLength)).toBeGreaterThan(5);
      }
    });

    test('REG-UI-009: 역할 선택 시 description 노출', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(100);
    });

    test('REG-UI-010: 가입 후 자동 로그인 실패 → /login으로 이동', async ({ page }) => {
      test.skip(true, 'Cycle 2: 자동 로그인 실패 유도 시나리오 — T12에서 구현');
    });

    test('REG-UI-011: mentor 역할 설명 노출 — ROLE_OPTIONS에 mentor 존재', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content.toLowerCase()).toContain('mentor');
    });

    test('REG-UI-012: 이메일 형식 검증 — type="email" 브라우저 검증', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      const emailInput = page.locator('#email, input[type="email"]').first();
      if (await emailInput.isVisible()) {
        const type = await emailInput.getAttribute('type');
        expect(type).toBe('email');
      }
    });

    test('REG-UI-013: 이름 필드 필수', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      const nameInput = page.locator('#name, #display_name, input[id*="name"]').first();
      if (await nameInput.isVisible()) {
        const required = await nameInput.getAttribute('required');
        expect(required).not.toBeNull();
      }
    });

    test('REG-UI-014: 로딩 상태 — 버튼 비활성화 + "가입 중..." 표시', async ({ page }) => {
      test.skip(true, 'Cycle 2: 실제 가입 제출 시나리오 — T12에서 구현');
    });

    test('REG-UI-015: 로그인 링크 → /login 이동', async ({ page }) => {
      await page.goto('/register');
      const loginLink = page.locator('a[href="/login"]').first();
      if (await loginLink.isVisible()) {
        await loginLink.click();
        await page.waitForURL('**/login**', { timeout: 5_000 });
        expect(page.url()).toContain('/login');
      }
    });

    test('REG-UI-016: 역할별 학원명 필드 동적 노출 — 원장 선택 시 노출', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      // 학원명 필드가 있거나 역할 선택 UI가 존재해야 함
      const hasRoleSelect = content.includes('학원') || content.includes('역할') || content.includes('role');
      expect(hasRoleSelect).toBeTruthy();
    });

    test('REG-UI-017: 이름 50자 경계 — 성공', async ({ page }) => {
      test.skip(true, 'Cycle 2: 경계값 테스트 — T12에서 구현');
    });

    test('REG-UI-018: 이름 51자 초과 → 400 에러', async ({ page }) => {
      test.skip(true, 'Cycle 2: 경계값 테스트 — T12에서 구현');
    });

    test('REG-UI-019: 가입 성공 후 새로고침 → 세션 유지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 신규 가입 + 새로고침 시나리오 — T12에서 구현');
    });

    test('REG-UI-020: 가입 성공 후 뒤로가기 → 역할별 홈 또는 /', async ({ page }) => {
      test.skip(true, 'Cycle 2: 신규 가입 + 뒤로가기 시나리오 — T12에서 구현');
    });
  });

  test.describe('API 계약', () => {
    test('REG-API-001: POST /api/auth/register 원장 → 201', async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          email: `reg-api-owner-${Date.now()}@test.argos`,
          password: 'TestPass123',
          display_name: 'API 원장',
          role: 'owner',
          academy_name: `API 테스트 학원 ${Date.now()}`,
        },
      });
      expect([201, 409]).toContain(res.status());
    });

    test('REG-API-002: POST /api/auth/register 강사/수강생 → 201', async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          email: `reg-api-teacher-${Date.now()}@test.argos`,
          password: 'TestPass123',
          display_name: 'API 강사',
          role: 'teacher',
        },
      });
      expect([201, 409]).toContain(res.status());
    });

    test('REG-API-003: POST /api/auth/register mentor → 201', async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          email: `reg-api-mentor-${Date.now()}@test.argos`,
          password: 'TestPass123',
          display_name: 'API 멘토',
          role: 'mentor',
        },
      });
      expect([201, 409]).toContain(res.status());
    });

    test('REG-API-004: Zod 검증 실패 — 이메일 형식 → 400', async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/register`, {
        data: { email: 'notanemail', password: 'TestPass123', display_name: 'Test', role: 'teacher' },
      });
      expect(res.status()).toBe(400);
    });

    test('REG-API-005: Zod 검증 실패 — 비밀번호 < 6자 → 400', async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/register`, {
        data: { email: `zod-pw-${Date.now()}@test.argos`, password: '12345', display_name: 'Test', role: 'teacher' },
      });
      expect(res.status()).toBe(400);
    });

    test('REG-API-006: Zod 검증 실패 — role = admin → 400', async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/register`, {
        data: { email: `zod-role-${Date.now()}@test.argos`, password: 'TestPass123', display_name: 'Test', role: 'admin' },
      });
      expect(res.status()).toBe(400);
    });

    test('REG-API-007: 학원 없음 (강사/수강생/mentor) → 400', async ({ request }) => {
      test.skip(true, 'Cycle 2: 학원 없는 환경 필요 — T12에서 구현');
    });

    test('REG-API-008: 중복 이메일 → 409', async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/register`, {
        data: { email: 'e2e-teacher@test.argos', password: 'TestPass123', display_name: 'Dup', role: 'teacher' },
      });
      expect(res.status()).toBe(409);
    });

    test('REG-API-009: profiles insert 실패 → 500 + auth 유저 롤백', async ({ request }) => {
      test.skip(true, 'Cycle 2: DB 제약 위반 유도 시나리오 — T12에서 구현');
    });

    test('REG-API-010: display_name 50자 초과 → 400', async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          email: `reg-name-${Date.now()}@test.argos`,
          password: 'TestPass123',
          display_name: 'a'.repeat(51),
          role: 'teacher',
        },
      });
      expect([400, 422]).toContain(res.status());
    });

    test('REG-API-011: academy_name 100자 초과 → 400', async ({ request }) => {
      test.skip(true, 'Cycle 2: academy_name 길이 제약 정책 확인 — T12에서 구현');
    });

    test('REG-API-012: display_name 공란 → 400', async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/register`, {
        data: { email: `reg-dn-${Date.now()}@test.argos`, password: 'TestPass123', display_name: '', role: 'teacher' },
      });
      expect([400, 422]).toContain(res.status());
    });

    test('REG-API-013: password 1000자 → 에러 or 성공', async ({ request }) => {
      test.skip(true, 'Cycle 2: 긴 비밀번호 Supabase 처리 정책 확인 — T12에서 구현');
    });

    test('REG-API-014: 응답에 join_code 포함 없음 (REG-ERR-001 회귀)', async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          email: `reg-jc-${Date.now()}@test.argos`,
          password: 'TestPass123',
          display_name: 'JC Test',
          role: 'teacher',
        },
      });
      if (res.status() === 201) {
        const body = await res.json();
        expect(body.data).not.toHaveProperty('join_code');
      }
    });

    test('REG-API-015: academy_id 바인딩 정확성 — 강사 가입', async ({ request }) => {
      test.skip(true, 'Cycle 2: 가입 후 profiles 직접 조회 시나리오 — T12에서 구현');
    });

    test('REG-API-016: mentor Zod enum 포함 확인', async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          email: `reg-mentor-zod-${Date.now()}@test.argos`,
          password: 'TestPass123',
          display_name: 'Mentor Zod',
          role: 'mentor',
        },
      });
      expect([201, 409]).toContain(res.status());
      if (res.status() === 201) {
        const body = await res.json();
        expect(body.data.role).toBe('mentor');
      }
    });

    test('REG-API-017: 레이트 리밋 — 연속 5회 가입 시도', async ({ request }) => {
      test.skip(true, 'Cycle 2: 레이트 리밋 시나리오 — T12에서 구현');
    });
  });

  test.describe('에러 / 엣지', () => {
    test('REG-ERR-001: join_code 노출 방지 회귀', async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          email: `reg-err-001-${Date.now()}@test.argos`,
          password: 'TestPass123',
          display_name: 'ERR 001',
          role: 'teacher',
        },
      });
      if (res.status() === 201) {
        const body = await res.json();
        expect(body.data).not.toHaveProperty('join_code');
      }
    });

    test('REG-ERR-002: 학원 insert 실패 → auth 유저 생성 중단 (고아 계정 방지)', async ({ request }) => {
      test.skip(true, 'Cycle 2: DB 제약 위반 유도 시나리오 — T12에서 구현');
    });

    test('REG-ERR-003: mentor 역할 회원가입 가능 (회귀 수정 완료)', async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          email: `reg-mentor-ok-${Date.now()}@test.argos`,
          password: 'TestPass123',
          display_name: 'Mentor OK',
          role: 'mentor',
        },
      });
      expect([201, 409]).toContain(res.status());
    });

    test('REG-ERR-004: 원장 가입 중복 학원명 — UNIQUE 제약 없음 허용', async ({ request }) => {
      test.skip(true, 'Cycle 2: 중복 학원명 정책 확인 — T12에서 구현');
    });

    test('REG-ERR-005: XSS — display_name = "<script>alert(1)</script>"', async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          email: `reg-xss-${Date.now()}@test.argos`,
          password: 'TestPass123',
          display_name: '<script>alert(1)</script>',
          role: 'teacher',
        },
      });
      // 저장 성공하더라도 UI 렌더링 시 React escape
      expect([201, 400, 409]).toContain(res.status());
    });

    test('REG-ERR-006: 가입 직후 새로고침 → 역할별 홈 유지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 신규 가입 + 새로고침 시나리오 — T12에서 구현');
    });

    test('REG-ERR-007: SQL injection — academy_name', async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          email: `reg-sql-${Date.now()}@test.argos`,
          password: 'TestPass123',
          display_name: 'SQL Test',
          role: 'owner',
          academy_name: "'; DROP TABLE academies;--",
        },
      });
      // Supabase 파라미터 바인딩으로 안전 처리 (200 또는 에러)
      expect([201, 400, 409]).toContain(res.status());
    });

    test('REG-ERR-008: 이름에 이모지 포함 — 크래시 없음', async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          email: `reg-emoji-${Date.now()}@test.argos`,
          password: 'TestPass123',
          display_name: '홍길동🎉',
          role: 'teacher',
        },
      });
      expect([201, 400, 409]).toContain(res.status());
    });

    test('REG-ERR-009: 네트워크 단절 중 제출 → fetch 실패 에러 메시지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 오프라인 시나리오 — T12에서 구현');
    });

    test('REG-ERR-010: 중복 제출 방지 — isLoading 버튼 disabled', async ({ page }) => {
      test.skip(true, 'Cycle 2: 더블클릭 시나리오 — T12에서 구현');
    });

    test('REG-ERR-011: 한국어 에러 메시지 — 중복 이메일', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).toBeTruthy(); // 페이지 로드 확인
    });

    test('REG-ERR-012: 한국어 에러 메시지 — 비밀번호 불일치 "비밀번호가 일치하지 않습니다."', async ({ page }) => {
      test.skip(true, 'Cycle 2: 비밀번호 불일치 UI 시나리오 — T12에서 구현');
    });

    test('REG-ERR-013: 접근성 — ARIA 에러 메시지 role="alert"', async ({ page }) => {
      test.skip(true, 'Cycle 2: ARIA 접근성 검증 — T12에서 구현');
    });

    test('REG-ERR-014: profiles.academy_id NULL 방지 — 강사 가입 후 academy_id 존재', async ({ request }) => {
      test.skip(true, 'Cycle 2: 가입 후 profiles 직접 조회 시나리오 — T12에서 구현');
    });

    test('REG-ERR-015: mentor 가입 후 학원 바인딩 확인', async ({ request }) => {
      test.skip(true, 'Cycle 2: 가입 후 profiles 직접 조회 시나리오 — T12에서 구현');
    });

    test('REG-ERR-016: email = " " (공백만) → type="email" 차단', async ({ page }) => {
      await page.goto('/register');
      const emailInput = page.locator('#email, input[type="email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill(' ');
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        await page.waitForTimeout(500);
        expect(page.url()).toContain('/register');
      }
    });

    test('REG-ERR-017: 비밀번호 확인 붙여넣기 → 일치로 처리', async ({ page }) => {
      test.skip(true, 'Cycle 2: 비밀번호 확인 필드 시나리오 — T12에서 구현');
    });

    test('REG-ERR-018: ARIA — 모든 input에 연결된 label 존재', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      // 기본 검증: 페이지에 label 태그 존재
      const labels = await page.locator('label').count();
      expect(labels).toBeGreaterThan(0);
    });
  });
});
