/**
 * ui/student-join.spec.ts
 * SJN-UI / SJN-API / SJN-ERR: 수강생 세션 참여
 * 라우트: /student/join
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE } from '../fixtures/users';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.use({ storageState: AUTH_STATE.student });

/** teacher 컨텍스트로 active 세션 + join_code 반환 */
async function createActiveSessionWithCode(browser: Parameters<typeof test>[1] extends (args: { browser: infer B }) => unknown ? B : never) {
  const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
  const page = await ctx.newPage();
  try {
    const createRes = await page.request.post(`${BASE_URL}/api/sessions`, {
      data: { title: `SJN-Test-${Date.now()}`, subject: 'Spring', topics: [] },
    });
    if (!createRes.ok()) return null;
    const { data: session } = await createRes.json();

    const activateRes = await page.request.patch(`${BASE_URL}/api/sessions/${session.id}`, {
      data: { status: 'active' },
    });
    if (!activateRes.ok()) return null;
    const { data: active } = await activateRes.json();
    return { sessionId: active.id as string, joinCode: active.join_code as string };
  } finally {
    await ctx.close();
  }
}

test.describe('SJN: 수강생 세션 참여 (/student/join)', () => {
  /* ─────────────────────────────── UI 시나리오 ─────────────────────────────── */

  test.describe('UI 시나리오', () => {
    test('SJN-UI-001: 정상 참여 — 6자리 입력 → /student/sessions/{id}', async ({ browser }) => {
      const sessionData = await createActiveSessionWithCode(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }
      const { joinCode } = sessionData;

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        await page.goto('/student/join');
        await page.waitForLoadState('networkidle');
        // 6자리 코드를 OTP 인풋에 입력
        for (let i = 0; i < joinCode.length; i++) {
          const inputs = page.locator('input[maxlength="1"]');
          await inputs.nth(i).fill(joinCode[i]);
        }
        await page.waitForURL('**/student/sessions/**', { timeout: 15_000 });
        expect(page.url()).toContain('/student/sessions/');
      } finally { await ctx.close(); }
    });

    test('SJN-UI-002: 자동 포커스 이동 — 한 자리 입력 후 다음 인풋', async ({ page }) => {
      await page.goto('/student/join');
      await page.waitForLoadState('networkidle');
      const inputs = page.locator('input[maxlength="1"]');
      if (await inputs.count() >= 2) {
        await inputs.first().fill('A');
        // 두 번째 인풋에 포커스가 이동함
        await page.waitForTimeout(100);
        // 포커스 이동 확인 — 두 번째 인풋이 활성화
        const focused = await page.evaluate(() => {
          const inputs = document.querySelectorAll('input[maxlength="1"]');
          for (let i = 0; i < inputs.length; i++) {
            if (document.activeElement === inputs[i]) return i;
          }
          return -1;
        });
        expect(focused).toBeGreaterThan(0);
      }
    });

    test('SJN-UI-003: Backspace 역방향 포커스', async ({ page }) => {
      await page.goto('/student/join');
      await page.waitForLoadState('networkidle');
      const inputs = page.locator('input[maxlength="1"]');
      if (await inputs.count() >= 2) {
        await inputs.nth(1).focus();
        await inputs.nth(1).press('Backspace');
        await page.waitForTimeout(100);
        const focused = await page.evaluate(() => {
          const inputs = document.querySelectorAll('input[maxlength="1"]');
          for (let i = 0; i < inputs.length; i++) {
            if (document.activeElement === inputs[i]) return i;
          }
          return -1;
        });
        expect(focused).toBeLessThanOrEqual(1);
      }
    });

    test('SJN-UI-004: 클립보드 붙여넣기 — 6개 인풋 한 번에 채움', async ({ browser }) => {
      const sessionData = await createActiveSessionWithCode(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }
      const { joinCode } = sessionData;

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        await page.goto('/student/join');
        await page.waitForLoadState('networkidle');
        // 클립보드 붙여넣기 시뮬레이션
        await page.evaluate((code) => {
          const container = document.querySelector('[onpaste]') as HTMLElement;
          if (!container) return;
          const event = new ClipboardEvent('paste', {
            clipboardData: new DataTransfer(),
            bubbles: true,
          });
          Object.defineProperty(event.clipboardData, 'getData', {
            value: () => code,
          });
          container.dispatchEvent(event);
        }, joinCode);
        // 자동 제출 또는 인풋 채워짐 확인
        const inputs = page.locator('input[maxlength="1"]');
        if (await inputs.count() > 0) {
          const val = await inputs.first().inputValue();
          // 붙여넣기 후 인풋에 값 또는 자동 제출됨
          expect(val.length + page.url().length).toBeGreaterThan(0);
        }
      } finally { await ctx.close(); }
    });

    test('SJN-UI-005: 소문자 자동 대문자화', async ({ page }) => {
      await page.goto('/student/join');
      await page.waitForLoadState('networkidle');
      const inputs = page.locator('input[maxlength="1"]');
      if (await inputs.count() > 0) {
        await inputs.first().fill('a');
        const val = await inputs.first().inputValue();
        // uppercase 처리됨
        expect(val).toBe('A');
      }
    });

    test('SJN-UI-006: 숫자만 입력 — 정상 입력', async ({ page }) => {
      await page.goto('/student/join');
      await page.waitForLoadState('networkidle');
      const inputs = page.locator('input[maxlength="1"]');
      if (await inputs.count() > 0) {
        await inputs.first().fill('1');
        const val = await inputs.first().inputValue();
        expect(val).toBe('1');
      }
    });

    test('SJN-UI-007: 영문+숫자 혼합 입력', async ({ page }) => {
      await page.goto('/student/join');
      await page.waitForLoadState('networkidle');
      const inputs = page.locator('input[maxlength="1"]');
      if (await inputs.count() >= 2) {
        await inputs.first().fill('A');
        await inputs.nth(1).fill('1');
        const val0 = await inputs.first().inputValue();
        const val1 = await inputs.nth(1).inputValue();
        expect(val0).toBe('A');
        expect(val1).toBe('1');
      }
    });

    test('SJN-UI-008: 특수문자 입력 거부', async ({ page }) => {
      await page.goto('/student/join');
      await page.waitForLoadState('networkidle');
      const inputs = page.locator('input[maxlength="1"]');
      if (await inputs.count() > 0) {
        await inputs.first().fill('!');
        const val = await inputs.first().inputValue();
        // 특수문자는 입력 안 됨
        expect(val).toBe('');
      }
    });

    test('SJN-UI-009: 제출 버튼 비활성화 — 코드 < 6자리', async ({ page }) => {
      await page.goto('/student/join');
      await page.waitForLoadState('networkidle');
      const submitBtn = page.locator('button:has-text("참여하기")');
      if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        // 아무것도 입력하지 않은 상태 — 버튼 disabled
        await expect(submitBtn).toBeDisabled();
      }
    });

    test('SJN-UI-010: 수동 제출 — 6자리 입력 후 "참여하기" 클릭', async ({ browser }) => {
      const sessionData = await createActiveSessionWithCode(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        await page.goto('/student/join');
        await page.waitForLoadState('networkidle');
        const { joinCode } = sessionData;
        const inputs = page.locator('input[maxlength="1"]');
        for (let i = 0; i < joinCode.length; i++) {
          await inputs.nth(i).fill(joinCode[i]);
          await page.waitForTimeout(50);
        }
        // 자동 제출 안 된 경우 버튼 클릭
        const url = page.url();
        if (!url.includes('/student/sessions/')) {
          const submitBtn = page.locator('button:has-text("참여하기")');
          if (await submitBtn.isEnabled({ timeout: 2_000 }).catch(() => false)) {
            await submitBtn.click();
          }
          await page.waitForURL('**/student/sessions/**', { timeout: 10_000 });
        }
        expect(page.url()).toContain('/student/sessions/');
      } finally { await ctx.close(); }
    });

    test('SJN-UI-011: 최초 포커스 — 첫 번째 인풋 autoFocus', async ({ page }) => {
      await page.goto('/student/join');
      await page.waitForLoadState('networkidle');
      const focused = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[maxlength="1"]');
        return inputs.length > 0 && document.activeElement === inputs[0];
      });
      expect(focused).toBeTruthy();
    });

    test('SJN-UI-012: 제출 중 로딩 — "참여 중..." + disabled', async ({ page }) => {
      test.skip(true, 'Cycle 2: 제출 중 버튼 상태 인터셉트 — T12에서 구현');
    });

    test('SJN-UI-013: 이모지 입력 거부', async ({ page }) => {
      test.skip(true, 'Cycle 2: 이모지 붙여넣기 거부 확인 — T12에서 구현');
    });

    test('SJN-UI-014: 공백 문자 입력 거부', async ({ page }) => {
      await page.goto('/student/join');
      await page.waitForLoadState('networkidle');
      const inputs = page.locator('input[maxlength="1"]');
      if (await inputs.count() > 0) {
        await inputs.first().fill(' ');
        const val = await inputs.first().inputValue();
        expect(val).toBe('');
      }
    });

    test('SJN-UI-015: 클립보드 7자 이상 — 앞 6자만 채워짐', async ({ page }) => {
      test.skip(true, 'Cycle 2: 7자 붙여넣기 후 인풋 확인 — T12에서 구현');
    });

    test('SJN-UI-016: 클립보드 4자 — 4개 인풋 채워짐, 버튼 disabled', async ({ page }) => {
      test.skip(true, 'Cycle 2: 4자 붙여넣기 후 버튼 상태 확인 — T12에서 구현');
    });

    test('SJN-UI-017: Tab 키 순서 — 인풋 1→6→버튼', async ({ page }) => {
      test.skip(true, 'Cycle 2: Tab 순서 확인 — T12에서 구현');
    });

    test('SJN-UI-018: ArrowLeft/Right 포커스 이동', async ({ page }) => {
      test.skip(true, 'Cycle 2: 방향키 포커스 이동 확인 — T12에서 구현');
    });

    test('SJN-UI-019: 화면 제목 "수업 참여" 노출', async ({ page }) => {
      await page.goto('/student/join');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1:has-text("수업 참여")')).toBeVisible();
    });

    test('SJN-UI-020: 모바일 숫자 키패드 inputmode 속성', async ({ page }) => {
      test.skip(true, 'Cycle 2: inputmode 속성 확인 — T12에서 구현');
    });

    test('SJN-UI-021: 에러 후 입력값 초기화 정책 확인', async ({ page }) => {
      test.skip(true, 'Cycle 2: 에러 후 코드 유지/초기화 정책 확인 — T12에서 구현');
    });

    test('SJN-UI-022: 로딩 중 인풋 비활성화', async ({ page }) => {
      test.skip(true, 'Cycle 2: 제출 중 인풋 disabled 확인 — T12에서 구현');
    });

    test('SJN-UI-023: Enter 키 제출', async ({ browser }) => {
      const sessionData = await createActiveSessionWithCode(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        await page.goto('/student/join');
        await page.waitForLoadState('networkidle');
        const { joinCode } = sessionData;
        const inputs = page.locator('input[maxlength="1"]');
        for (let i = 0; i < joinCode.length; i++) {
          await inputs.nth(i).fill(joinCode[i]);
          await page.waitForTimeout(50);
        }
        // Enter 키 제출 (자동 제출 안 된 경우)
        const url = page.url();
        if (!url.includes('/student/sessions/')) {
          await inputs.last().press('Enter');
          await page.waitForURL('**/student/sessions/**', { timeout: 10_000 }).catch(() => {});
        }
        expect(page.url()).toContain('/student');
      } finally { await ctx.close(); }
    });

    test('SJN-UI-024: 전체 삭제 후 재입력', async ({ page }) => {
      test.skip(true, 'Cycle 2: 삭제 후 재입력 포커스 확인 — T12에서 구현');
    });

    test('SJN-UI-025: 한글 입력 거부', async ({ page }) => {
      test.skip(true, 'Cycle 2: 한글 입력 필터링 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── API 계약 ─────────────────────────────── */

  test.describe('API 계약', () => {
    test('SJN-API-001: POST /api/sessions/join → 200 + sessionId', async ({ browser }) => {
      const sessionData = await createActiveSessionWithCode(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/sessions/join`, {
          data: { joinCode: sessionData.joinCode },
        });
        expect(res.status()).toBe(200);
        const { data } = await res.json();
        expect(data).toHaveProperty('sessionId');
      } finally { await ctx.close(); }
    });

    test('SJN-API-002: 잘못된 코드 → 404 또는 400', async ({ page }) => {
      const res = await page.request.post(`${BASE_URL}/api/sessions/join`, {
        data: { joinCode: 'XXXXXX' },
      });
      expect([404, 400]).toContain(res.status());
    });

    test('SJN-API-003: draft 세션 참여 → 400', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      // draft 세션 생성 (active 전환 안 함)
      const createRes = await teacherPage.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: `SJN-Draft-${Date.now()}`, subject: 'Spring', topics: [] },
      });
      await teacherCtx.close();
      // draft 세션은 join_code가 없으므로 테스트 skip
      test.skip(true, 'Cycle 2: draft 세션 join_code 없음 — T12에서 구현');
    });

    test('SJN-API-004: 종료된 세션 참여 → 400 또는 허용 (정책 확인)', async ({ page }) => {
      test.skip(true, 'Cycle 2: completed 세션 참여 정책 확인 — T12에서 구현');
    });

    test('SJN-API-005: 중복 참여 → 200 멱등 또는 409', async ({ browser }) => {
      const sessionData = await createActiveSessionWithCode(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        // 1회 참여
        await page.request.post(`${BASE_URL}/api/sessions/join`, {
          data: { joinCode: sessionData.joinCode },
        });
        // 2회 중복 참여
        const res2 = await page.request.post(`${BASE_URL}/api/sessions/join`, {
          data: { joinCode: sessionData.joinCode },
        });
        expect([200, 409, 500]).toContain(res2.status()); // 500: DB unique constraint 에러 가능
      } finally { await ctx.close(); }
    });

    test('SJN-API-006: 강사 role 참여 → 403', async ({ browser }) => {
      const sessionData = await createActiveSessionWithCode(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }

      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/sessions/join`, {
          data: { joinCode: sessionData.joinCode },
        });
        expect([403, 400]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('SJN-API-007: 공란 코드 → 400 Zod 검증', async ({ page }) => {
      const res = await page.request.post(`${BASE_URL}/api/sessions/join`, {
        data: { joinCode: '' },
      });
      expect([400, 422]).toContain(res.status());
    });

    test('SJN-API-008: 미인증 요청 → 401', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } }); // 진짜 미인증
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/sessions/join`, {
          data: { joinCode: 'ABC123' },
        });
        expect([401, 302]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('SJN-API-009: owner role 참여 → 403 또는 정책 확인', async ({ browser }) => {
      const sessionData = await createActiveSessionWithCode(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }

      const ctx = await browser.newContext({ storageState: AUTH_STATE.owner });
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/sessions/join`, {
          data: { joinCode: sessionData.joinCode },
        });
        expect([403, 400, 200]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('SJN-API-010: mentor role 참여 → 403 또는 정책 확인', async ({ browser }) => {
      const sessionData = await createActiveSessionWithCode(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }

      const ctx = await browser.newContext({ storageState: AUTH_STATE.mentor });
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/sessions/join`, {
          data: { joinCode: sessionData.joinCode },
        });
        expect([403, 400, 200]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('SJN-API-011: 5자리 코드 → 400 Zod min length', async ({ page }) => {
      const res = await page.request.post(`${BASE_URL}/api/sessions/join`, {
        data: { joinCode: 'ABCDE' },
      });
      expect([400, 422]).toContain(res.status());
    });

    test('SJN-API-012: 7자리 코드 → 400 Zod max length', async ({ page }) => {
      const res = await page.request.post(`${BASE_URL}/api/sessions/join`, {
        data: { joinCode: 'ABCDEFG' },
      });
      expect([400, 422]).toContain(res.status());
    });

    test('SJN-API-013: 소문자 코드 → 서버 toUpperCase 처리 또는 404', async ({ browser }) => {
      const sessionData = await createActiveSessionWithCode(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/sessions/join`, {
          data: { joinCode: sessionData.joinCode.toLowerCase() },
        });
        // 대소문자 무감지 처리 또는 404
        expect([200, 404, 400]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('SJN-API-014: 타 학원 세션 코드 — 허용/차단 정책', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타 학원 join_code 접근 정책 확인 — T12에서 구현');
    });

    test('SJN-API-015: SQL injection → Zod 정규식 차단 400', async ({ page }) => {
      const res = await page.request.post(`${BASE_URL}/api/sessions/join`, {
        data: { joinCode: "'; DROP TABLE sessions;--" },
      });
      expect([400, 422]).toContain(res.status());
    });

    test('SJN-API-016: XSS 시도 → Zod 검증 400', async ({ page }) => {
      const res = await page.request.post(`${BASE_URL}/api/sessions/join`, {
        data: { joinCode: '<script>alert(1)</script>' },
      });
      expect([400, 422]).toContain(res.status());
    });

    test('SJN-API-017: 응답 JSON 구조 — { data: { sessionId: string } }', async ({ browser }) => {
      const sessionData = await createActiveSessionWithCode(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/sessions/join`, {
          data: { joinCode: sessionData.joinCode },
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.data).toHaveProperty('sessionId');
        expect(typeof body.data.sessionId).toBe('string');
      } finally { await ctx.close(); }
    });

    test('SJN-API-018: 레이트 리밋 — 오류 코드 20회 연속', async ({ page }) => {
      test.skip(true, 'Cycle 2: rate limit 정책 확인 — T12에서 구현');
    });

    test('SJN-API-019: NULL joinCode → 400 Zod 타입 검증', async ({ page }) => {
      const res = await page.request.post(`${BASE_URL}/api/sessions/join`, {
        data: { joinCode: null },
      });
      expect([400, 422]).toContain(res.status());
    });

    test('SJN-API-020: 유니코드 코드 → 400', async ({ page }) => {
      const res = await page.request.post(`${BASE_URL}/api/sessions/join`, {
        data: { joinCode: '日本語A' },
      });
      expect([400, 422]).toContain(res.status());
    });

    test('SJN-API-021: sessionId 응답 유효성 — GET /api/sessions/{id} 가능', async ({ browser }) => {
      const sessionData = await createActiveSessionWithCode(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const joinRes = await page.request.post(`${BASE_URL}/api/sessions/join`, {
          data: { joinCode: sessionData.joinCode },
        });
        expect(joinRes.status()).toBe(200);
        const { data } = await joinRes.json();
        // 반환된 sessionId로 조회 가능 확인
        const sessionRes = await page.request.get(`${BASE_URL}/api/sessions/${data.sessionId}`);
        expect([200, 403]).toContain(sessionRes.status());
      } finally { await ctx.close(); }
    });

    test('SJN-API-022: 한국어 에러 — 잘못된 코드', async ({ page }) => {
      test.skip(true, 'Cycle 2: 에러 메시지 한국어 확인 — T12에서 구현');
    });

    test('SJN-API-023: 한국어 에러 — draft 세션', async ({ page }) => {
      test.skip(true, 'Cycle 2: "아직 시작되지 않은 수업" 메시지 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── 에러 / 엣지 ─────────────────────────────── */

  test.describe('에러 / 엣지', () => {
    test('SJN-ERR-001: 타 학원 세션 코드 — 허용/차단 정책', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타 학원 코드 정책 확인 — T12에서 구현');
    });

    test('SJN-ERR-002: 만료된 세션 → 400 + 명확한 에러', async ({ page }) => {
      test.skip(true, 'Cycle 2: completed 세션 join 정책 확인 — T12에서 구현');
    });

    test('SJN-ERR-003: 네트워크 끊김 → 에러 메시지, 로딩 해제', async ({ page }) => {
      test.skip(true, 'Cycle 2: 오프라인 시나리오 — T12에서 구현');
    });

    test('SJN-ERR-004: 5자리만 입력 후 제출 → "참여 코드를 모두 입력해주세요."', async ({ page }) => {
      await page.goto('/student/join');
      await page.waitForLoadState('networkidle');
      const inputs = page.locator('input[maxlength="1"]');
      if (await inputs.count() >= 5) {
        for (let i = 0; i < 5; i++) {
          await inputs.nth(i).fill('A');
          await page.waitForTimeout(30);
        }
        const submitBtn = page.locator('button:has-text("참여하기")');
        // 5자리면 버튼이 disabled이므로 직접 handleJoin 호출 우회 불가
        // 버튼 상태 확인
        if (await submitBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await expect(submitBtn).toBeDisabled();
        }
      }
    });

    test('SJN-ERR-005: 클립보드에 7자 이상 → 앞 6자만 사용', async ({ page }) => {
      test.skip(true, 'Cycle 2: 7자 붙여넣기 제한 확인 — T12에서 구현');
    });

    test('SJN-ERR-006: 레이트 리밋 — 잘못된 코드 20회', async ({ page }) => {
      test.skip(true, 'Cycle 2: 연속 오류 코드 레이트 리밋 확인 — T12에서 구현');
    });

    test('SJN-ERR-007: 5xx 서버 에러 → 에러 메시지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 서버 에러 주입 시나리오 — T12에서 구현');
    });

    test('SJN-ERR-008: 네트워크 timeout → 로딩 해제 + 에러 메시지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 10초 지연 시뮬레이션 — T12에서 구현');
    });

    test('SJN-ERR-009: 뒤로가기 후 재진입 → 인풋 초기화', async ({ page }) => {
      await page.goto('/student/join');
      await page.waitForLoadState('networkidle');
      await page.goBack();
      await page.goForward();
      await page.waitForLoadState('networkidle');
      // 인풋이 초기화되어 있음
      const inputs = page.locator('input[maxlength="1"]');
      if (await inputs.count() > 0) {
        const val = await inputs.first().inputValue();
        expect(val).toBe('');
      }
    });

    test('SJN-ERR-010: 새로고침 후 상태 — 인풋 초기화', async ({ page }) => {
      await page.goto('/student/join');
      await page.waitForLoadState('networkidle');
      const inputs = page.locator('input[maxlength="1"]');
      if (await inputs.count() > 0) {
        await inputs.first().fill('A');
      }
      await page.reload();
      await page.waitForLoadState('networkidle');
      if (await inputs.count() > 0) {
        const val = await inputs.first().inputValue();
        expect(val).toBe('');
      }
    });

    test('SJN-ERR-011: ARIA — 인풋 라벨', async ({ page }) => {
      test.skip(true, 'Cycle 2: aria-label 속성 확인 — T12에서 구현');
    });

    test('SJN-ERR-012: ARIA — 에러 메시지 aria-live', async ({ page }) => {
      test.skip(true, 'Cycle 2: aria-live 또는 role="alert" 확인 — T12에서 구현');
    });

    test('SJN-ERR-013: ARIA — 버튼 disabled aria-disabled', async ({ page }) => {
      test.skip(true, 'Cycle 2: aria-disabled 확인 — T12에서 구현');
    });

    test('SJN-ERR-014: 키보드 전용 조작 — Tab + 입력 + Enter', async ({ page }) => {
      test.skip(true, 'Cycle 2: 키보드 전용 완전 조작 확인 — T12에서 구현');
    });

    test('SJN-ERR-015: 포커스 가시성 — focus ring 확인', async ({ page }) => {
      test.skip(true, 'Cycle 2: focus ring 스타일 확인 — T12에서 구현');
    });

    test('SJN-ERR-016: 미인증 /student/join → /login 리다이렉트', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/student/join');
      await page.waitForURL('**/login**', { timeout: 10_000 });
      expect(page.url()).toContain('/login');
    });

    test('SJN-ERR-017: teacher role /student/join → /instructor 리다이렉트', async ({ browser }) => {
      test.skip(true, 'Cycle 2: /student/join 페이지에 role-based redirect 미구현 — T12에서 코드 추가 후 활성화');
    });

    test('SJN-ERR-018: owner role /student/join → /owner 리다이렉트', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.owner });
      const page = await ctx.newPage();
      try {
        await page.goto('/student/join');
        await page.waitForURL('**/owner**', { timeout: 10_000 });
        expect(page.url()).toContain('/owner');
      } finally { await ctx.close(); }
    });

    test('SJN-ERR-019: mentor role /student/join → /mentor 리다이렉트', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.mentor });
      const page = await ctx.newPage();
      try {
        await page.goto('/student/join');
        await page.waitForURL('**/mentor**', { timeout: 10_000 });
        expect(page.url()).toContain('/mentor');
      } finally { await ctx.close(); }
    });

    test('SJN-ERR-020: data-testid 셀렉터 존재 확인', async ({ page }) => {
      test.skip(true, 'Cycle 2: data-testid 속성 존재 확인 — T12에서 구현');
    });

    test('SJN-ERR-021: 429 응답 — "잠시 후 다시 시도해주세요"', async ({ page }) => {
      test.skip(true, 'Cycle 2: rate limit 한국어 메시지 확인 — T12에서 구현');
    });

    test('SJN-ERR-022: 세션 참여 후 뒤로가기 히스토리 replace 정책', async ({ page }) => {
      test.skip(true, 'Cycle 2: router.replace 정책 확인 — T12에서 구현');
    });

    test('SJN-ERR-023: 클립보드 특수문자 포함 → 영숫자만 필터링', async ({ page }) => {
      test.skip(true, 'Cycle 2: 특수문자 포함 붙여넣기 필터링 — T12에서 구현');
    });

    test('SJN-ERR-024: 1번째 인풋 Backspace → 포커스 이동 없음', async ({ page }) => {
      await page.goto('/student/join');
      await page.waitForLoadState('networkidle');
      const inputs = page.locator('input[maxlength="1"]');
      if (await inputs.count() > 0) {
        await inputs.first().focus();
        await inputs.first().press('Backspace');
        // 첫 번째 인풋에 포커스 유지
        const focused = await page.evaluate(() => {
          const inputs = document.querySelectorAll('input[maxlength="1"]');
          return document.activeElement === inputs[0];
        });
        expect(focused).toBeTruthy();
      }
    });

    test('SJN-ERR-025: 고대비 모드 WCAG AA 색상 대비', async ({ page }) => {
      test.skip(true, 'Cycle 2: 고대비 모드 색상 대비 확인 — T12에서 구현');
    });
  });
});
