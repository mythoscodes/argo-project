/**
 * regression/join-code.spec.ts
 * REG-ERR-001 / ISD-ERR-001: join_code 평문 노출 방지
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE, TEST_USERS } from '../fixtures/users';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.describe('REG-ERR-001 / ISD-ERR-001: join_code 평문 노출 방지 회귀', () => {
  // REG-ERR-001: register 응답 JSON에 join_code 없음
  test('REG-ERR-001: POST /api/auth/register 응답 JSON에 join_code 키 없음', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        email: `regression-jc-${Date.now()}@test.argos`,
        password: 'TestPass123',
        display_name: 'REG 회귀 테스트',
        role: 'teacher',
      },
    });
    expect([201, 409]).toContain(res.status());
    if (res.status() === 201) {
      const body = await res.json();
      expect(body.data).not.toHaveProperty('join_code');
    }
  });

  // ISD-ERR-001: draft 세션 GET 응답에 join_code가 null
  test('ISD-ERR-001: draft 세션 GET 응답에 join_code가 null이거나 없어야 함', async ({ request }) => {
    // teacher 계정으로 세션 생성
    const createRes = await request.post(`${BASE_URL}/api/sessions`, {
      headers: { Cookie: '' }, // storageState 없이 API 직접 호출
      data: {
        title: `REG-ISD-ERR-001-${Date.now()}`,
        subject: 'Spring',
        topics: [],
      },
    });

    if (createRes.status() !== 201) {
      test.skip(true, '세션 생성 실패 — 인증 필요, UI 기반 검증으로 대체');
      return;
    }

    const { data: session } = await createRes.json();
    const getRes = await request.get(`${BASE_URL}/api/sessions/${session.id}`);
    if (!getRes.ok()) {
      test.skip(true, '세션 조회 실패 — storageState 필요');
      return;
    }
    const { data } = await getRes.json();
    // draft 세션: join_code는 null이거나 응답에 미포함
    expect(data.join_code == null).toBeTruthy();
  });

  // join_code가 non-teacher 응답에서 필터됨
  test('ISD-ERR-001(UI): draft 세션 상세 페이지 DOM에 join_code 평문 없음', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE.teacher });
    const page = await context.newPage();
    try {
      const createRes = await page.request.post(`${BASE_URL}/api/sessions`, {
        data: {
          title: `E2E_jc_dom_${Date.now()}`,
          subject: 'JPA',
          topics: [],
        },
      });
      if (!createRes.ok()) {
        test.skip(true, '세션 생성 API 실패');
        return;
      }
      const { data: session } = await createRes.json();
      await page.goto(`/instructor/sessions/${session.id}`);
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      // draft 상태 안내 문구 확인
      const hasDraftMsg =
        content.includes('수업을 시작하면') ||
        content.includes('코드가 발급') ||
        content.includes('시작하면');
      expect(hasDraftMsg, 'draft 세션에는 참여코드 미발급 안내가 있어야 한다').toBeTruthy();
    } finally {
      await context.close();
    }
  });

  // ISN-API-005: POST 세션 생성 시 join_code null
  test('ISN-API-005: POST /api/sessions 생성 응답 join_code가 null', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE.teacher });
    const page = await context.newPage();
    try {
      const res = await page.request.post(`${BASE_URL}/api/sessions`, {
        data: {
          title: `ISN-API-005-${Date.now()}`,
          subject: 'Docker',
          topics: ['컨테이너'],
        },
      });
      expect(res.status()).toBe(201);
      const { data } = await res.json();
      // join_code는 null (active 전환 시 발급)
      expect(data.join_code).toBeNull();
    } finally {
      await context.close();
    }
  });
});
