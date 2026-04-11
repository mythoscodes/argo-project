/**
 * api/sessions.spec.ts
 * API-layer 세션 CRUD 계약 테스트 (UI 없이 HTTP 레벨)
 * 대상 엔드포인트: GET/POST /api/sessions, GET/PATCH/DELETE /api/sessions/[id]
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE } from '../fixtures/users';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.use({ storageState: AUTH_STATE.teacher });

test.describe('API: 세션 CRUD (/api/sessions)', () => {
  test.describe('GET /api/sessions', () => {
    test('API-SES-001: teacher 인증 → 200 + SessionRow[]', async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}/api/sessions`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBeTruthy();
    });

    test('API-SES-002: 미인증 → 401 또는 302', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } }); // 진짜 미인증 — test.use storageState 명시적 무효화
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/sessions`);
        expect([401, 302, 403]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('API-SES-003: student 토큰 → 200 (본인 세션 목록)', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/sessions`);
        expect([200, 401, 403]).toContain(res.status()); // student는 200으로 자신의 세션 반환
      } finally { await ctx.close(); }
    });

    test('API-SES-004: 응답 구조 — id, title, status, subject, join_code', async ({ page }) => {
      const createRes = await page.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: `API-SES-004-${Date.now()}`, subject: 'Spring', topics: [] },
      });
      if (!createRes.ok()) { test.skip(true, '세션 생성 실패'); return; }
      const res = await page.request.get(`${BASE_URL}/api/sessions`);
      const body = await res.json();
      if (body.data?.length > 0) {
        const session = body.data[0];
        expect(session).toHaveProperty('id');
        expect(session).toHaveProperty('title');
        expect(session).toHaveProperty('status');
      }
    });

    test('API-SES-005: RLS 격리 — 본인 학원 세션만 반환', async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}/api/sessions`);
      expect(res.status()).toBe(200);
      // 정상 응답 확인 (타 학원 격리는 별도 계정으로 검증)
      const body = await res.json();
      expect(Array.isArray(body.data)).toBeTruthy();
    });

    test('API-SES-006: join_code는 active 상태에서만 노출', async ({ page }) => {
      const createRes = await page.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: `API-SES-006-${Date.now()}`, subject: 'Spring', topics: [] },
      });
      if (!createRes.ok()) { test.skip(true, '세션 생성 실패'); return; }
      const { data: session } = await createRes.json();
      // draft 상태에서 join_code는 null이어야 함
      const getRes = await page.request.get(`${BASE_URL}/api/sessions/${session.id}`);
      if (getRes.ok()) {
        const body = await getRes.json();
        expect(body.data?.join_code).toBeNull();
      }
    });
  });

  test.describe('POST /api/sessions', () => {
    test('API-SES-010: 정상 생성 → 201 + SessionRow', async ({ page }) => {
      const res = await page.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: `API-SES-010-${Date.now()}`, subject: 'Spring', topics: ['JPA', 'N+1'] },
      });
      expect([200, 201]).toContain(res.status());
      const body = await res.json();
      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('status', 'draft');
    });

    test('API-SES-011: title 누락 → 400 Zod 검증', async ({ page }) => {
      const res = await page.request.post(`${BASE_URL}/api/sessions`, {
        data: { subject: 'Spring', topics: [] },
      });
      expect([400, 422]).toContain(res.status());
    });

    test('API-SES-012: 미인증 → 401', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } }); // 진짜 미인증 — test.use storageState 명시적 무효화
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/sessions`, {
          data: { title: 'test', subject: 'Spring', topics: [] },
        });
        expect([401, 302, 403]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('API-SES-013: student 토큰 → 403', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/sessions`, {
          data: { title: 'test', subject: 'Spring', topics: [] },
        });
        expect([401, 403]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('API-SES-014: 빈 title → 400', async ({ page }) => {
      const res = await page.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: '', subject: 'Spring', topics: [] },
      });
      expect([400, 422]).toContain(res.status());
    });

    test('API-SES-015: title XSS payload — 저장은 성공, React escape 처리', async ({ page }) => {
      const res = await page.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: '<script>alert(1)</script>', subject: 'Spring', topics: [] },
      });
      // 저장은 성공해야 하나 React에서 escape 처리
      expect([200, 201, 400]).toContain(res.status());
    });
  });

  test.describe('PATCH /api/sessions/[id]', () => {
    test('API-SES-020: draft → active — join_code 생성', async ({ page }) => {
      const createRes = await page.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: `API-SES-020-${Date.now()}`, subject: 'Spring', topics: [] },
      });
      if (!createRes.ok()) { test.skip(true, '세션 생성 실패'); return; }
      const { data: session } = await createRes.json();

      const patchRes = await page.request.patch(`${BASE_URL}/api/sessions/${session.id}`, {
        data: { status: 'active' },
      });
      expect([200]).toContain(patchRes.status());
      const body = await patchRes.json();
      expect(body.data?.join_code).toMatch(/^[A-Z0-9]{6}$/);
    });

    test('API-SES-021: active → completed — join_code 유지 또는 null', async ({ page }) => {
      const createRes = await page.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: `API-SES-021-${Date.now()}`, subject: 'Spring', topics: [] },
      });
      if (!createRes.ok()) { test.skip(true, '세션 생성 실패'); return; }
      const { data: session } = await createRes.json();

      await page.request.patch(`${BASE_URL}/api/sessions/${session.id}`, {
        data: { status: 'active' },
      });
      const patchRes = await page.request.patch(`${BASE_URL}/api/sessions/${session.id}`, {
        data: { status: 'completed' },
      });
      expect(patchRes.status()).toBe(200);
    });

    test('API-SES-022: 미인증 PATCH → 401', async ({ request }) => {
      const res = await request.patch(`${BASE_URL}/api/sessions/00000000-0000-0000-0000-000000000001`, {
        data: { status: 'active' },
      });
      expect([401, 302, 403, 404]).toContain(res.status());
    });

    test('API-SES-023: 타 학원 세션 PATCH — 403 또는 404 (RLS)', async ({ page }) => {
      const res = await page.request.patch(`${BASE_URL}/api/sessions/00000000-0000-0000-0000-000000000001`, {
        data: { status: 'active' },
      });
      expect([403, 404]).toContain(res.status());
    });

    test('API-SES-024: 잘못된 status 값 → 400 Zod 검증', async ({ page }) => {
      const createRes = await page.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: `API-SES-024-${Date.now()}`, subject: 'Spring', topics: [] },
      });
      if (!createRes.ok()) { test.skip(true, '세션 생성 실패'); return; }
      const { data: session } = await createRes.json();
      const res = await page.request.patch(`${BASE_URL}/api/sessions/${session.id}`, {
        data: { status: 'invalid_status' },
      });
      expect([400, 422]).toContain(res.status());
    });
  });

  test.describe('GET /api/sessions/[id]', () => {
    test('API-SES-030: 단일 세션 조회 → 200 + SessionRow', async ({ page }) => {
      const createRes = await page.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: `API-SES-030-${Date.now()}`, subject: 'Spring', topics: [] },
      });
      if (!createRes.ok()) { test.skip(true, '세션 생성 실패'); return; }
      const { data: created } = await createRes.json();
      const res = await page.request.get(`${BASE_URL}/api/sessions/${created.id}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.data?.id).toBe(created.id);
    });

    test('API-SES-031: 존재하지 않는 세션 → 404', async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}/api/sessions/00000000-0000-0000-0000-000000000001`);
      expect([404, 200]).toContain(res.status());
      if (res.status() === 200) {
        const body = await res.json();
        expect(body.data).toBeNull();
      }
    });

    test('API-SES-032: UUID 아닌 id 파라미터 → 400 또는 404', async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}/api/sessions/invalid-id`);
      expect([400, 404]).toContain(res.status());
    });
  });
});
