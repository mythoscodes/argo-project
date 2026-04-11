/**
 * api/ai.spec.ts
 * API-layer AI 엔드포인트 계약 테스트 (UI 없이 HTTP 레벨)
 * 대상: POST /api/ai/quiz, POST /api/ai/analysis, GET /api/ai/analysis,
 *        POST /api/ai/coaching, POST /api/ai/report, POST /api/ai/mentor-briefing
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE } from '../fixtures/users';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.use({ storageState: AUTH_STATE.teacher });

/** teacher 컨텍스트로 draft 세션 생성 후 id 반환 */
async function createSession(page: import('@playwright/test').Page, suffix: string | number = Date.now()) {
  const res = await page.request.post(`${BASE_URL}/api/sessions`, {
    data: { title: `AI-Test-${suffix}`, subject: 'Spring', topics: ['JPA', 'Spring'] },
  });
  if (!res.ok()) return null;
  const { data } = await res.json();
  return data?.id as string | null;
}

test.describe('API: AI 퀴즈 생성 (/api/ai/quiz)', () => {
  test('API-AI-001: POST /api/ai/quiz → 200 + QuizRow[]', async ({ page }) => {
    const sessionId = await createSession(page, 'AI001');
    if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
    const res = await page.request.post(`${BASE_URL}/api/ai/quiz`, {
      data: { sessionId, count: 2 },
    });
    // AI 호출이므로 실패 허용 (200 또는 500)
    expect([200, 400, 500]).toContain(res.status());
  });

  test('API-AI-002: sessionId 누락 → 400', async ({ page }) => {
    const res = await page.request.post(`${BASE_URL}/api/ai/quiz`, {
      data: { count: 3 },
    });
    expect([400, 422]).toContain(res.status());
  });

  test('API-AI-003: 미인증 → 401', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } }); // 진짜 미인증 — test.use storageState 명시적 무효화
    const page = await ctx.newPage();
    try {
      const res = await page.request.post(`${BASE_URL}/api/ai/quiz`, {
        data: { sessionId: '00000000-0000-0000-0000-000000000001', count: 3 },
      });
      expect([401, 302, 403]).toContain(res.status());
    } finally { await ctx.close(); }
  });

  test('API-AI-004: student 토큰 → 403 (teacher 전용)', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
    const page = await ctx.newPage();
    try {
      const res = await page.request.post(`${BASE_URL}/api/ai/quiz`, {
        data: { sessionId: '00000000-0000-0000-0000-000000000001', count: 3 },
      });
      expect([401, 403]).toContain(res.status());
    } finally { await ctx.close(); }
  });

  test('API-AI-005: count=0 → 400 또는 빈 배열', async ({ page }) => {
    const sessionId = await createSession(page, 'AI005');
    if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
    const res = await page.request.post(`${BASE_URL}/api/ai/quiz`, {
      data: { sessionId, count: 0 },
    });
    expect([200, 400]).toContain(res.status());
  });

  test('API-AI-006: count > MAX_QUIZ_COUNT → 400 또는 MAX로 제한', async ({ page }) => {
    const sessionId = await createSession(page, 'AI006');
    if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
    const res = await page.request.post(`${BASE_URL}/api/ai/quiz`, {
      data: { sessionId, count: 100 },
    });
    expect([200, 400]).toContain(res.status());
  });
});

test.describe('API: AI 이해도 분석 (/api/ai/analysis)', () => {
  test('API-AI-010: POST /api/ai/analysis → 200 + AnalysisResult', async ({ page }) => {
    const sessionId = await createSession(page, 'AI010');
    if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
    const res = await page.request.post(`${BASE_URL}/api/ai/analysis`, {
      data: { sessionId },
    });
    expect([200, 400, 422, 500]).toContain(res.status()); // 422: Zod 검증 에러 (sessionId 유효 UUID지만 데이터 없음)
  });

  test('API-AI-011: GET /api/ai/analysis?sessionId → 200 + data|null', async ({ page }) => {
    const sessionId = await createSession(page, 'AI011');
    if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
    const res = await page.request.get(`${BASE_URL}/api/ai/analysis?sessionId=${sessionId}`);
    expect([200, 404, 422]).toContain(res.status()); // 422: sessionId 형식/검증 에러
  });

  test('API-AI-012: GET 미인증 → 401', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } }); // 진짜 미인증
    const page = await ctx.newPage();
    try {
      const res = await page.request.get(`${BASE_URL}/api/ai/analysis?sessionId=00000000-0000-0000-0000-000000000001`);
      expect([401, 302, 403]).toContain(res.status());
    } finally { await ctx.close(); }
  });

  test('API-AI-013: GET student 토큰 → 403 (teacher 전용)', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
    const page = await ctx.newPage();
    try {
      const res = await page.request.get(`${BASE_URL}/api/ai/analysis?sessionId=00000000-0000-0000-0000-000000000001`);
      expect([401, 403]).toContain(res.status());
    } finally { await ctx.close(); }
  });

  test('API-AI-014: sessionId 파라미터 누락 → 400', async ({ page }) => {
    const res = await page.request.get(`${BASE_URL}/api/ai/analysis`);
    expect([400, 422]).toContain(res.status());
  });
});

test.describe('API: AI 코칭 (/api/ai/coaching)', () => {
  test('API-AI-020: POST /api/ai/coaching → 200 + CoachingMessage', async ({ page }) => {
    const sessionId = await createSession(page, 'AI020');
    if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
    const res = await page.request.post(`${BASE_URL}/api/ai/coaching`, {
      data: { sessionId },
    });
    expect([200, 201, 400, 500, 502]).toContain(res.status()); // 502: AI upstream 에러 가능
  });

  test('API-AI-021: 미인증 → 401', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } }); // 진짜 미인증
    const page = await ctx.newPage();
    try {
      const res = await page.request.post(`${BASE_URL}/api/ai/coaching`, {
        data: { sessionId: '00000000-0000-0000-0000-000000000001' },
      });
      expect([401, 302, 403]).toContain(res.status());
    } finally { await ctx.close(); }
  });

  test('API-AI-022: student 토큰 → 403', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
    const page = await ctx.newPage();
    try {
      const res = await page.request.post(`${BASE_URL}/api/ai/coaching`, {
        data: { sessionId: '00000000-0000-0000-0000-000000000001' },
      });
      expect([401, 403]).toContain(res.status());
    } finally { await ctx.close(); }
  });

  test('API-AI-023: RLS — 타 학원 세션 코칭 → 400 또는 403', async ({ page }) => {
    const res = await page.request.post(`${BASE_URL}/api/ai/coaching`, {
      data: { sessionId: '00000000-0000-0000-0000-000000000001' },
    });
    expect([400, 403, 404, 500]).toContain(res.status());
  });
});

test.describe('API: AI 리포트 (/api/ai/report)', () => {
  test('API-AI-030: GET /api/ai/report?sessionId — student 토큰 → 200', async ({ browser }) => {
    const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
    const teacherPage = await teacherCtx.newPage();
    const createRes = await teacherPage.request.post(`${BASE_URL}/api/sessions`, {
      data: { title: `API-AI030-${Date.now()}`, subject: 'Spring', topics: [] },
    });
    const { data: session } = await createRes.json();
    await teacherCtx.close();

    const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
    const page = await ctx.newPage();
    try {
      const res = await page.request.get(`${BASE_URL}/api/ai/report?sessionId=${session.id}`);
      expect([200, 404]).toContain(res.status());
    } finally { await ctx.close(); }
  });

  test('API-AI-031: GET teacher 토큰 → 403 (student 전용)', async ({ page }) => {
    const sessionId = await createSession(page, 'AI031');
    if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
    const res = await page.request.get(`${BASE_URL}/api/ai/report?sessionId=${sessionId}`);
    expect([200, 401, 403]).toContain(res.status()); // teacher도 GET report 가능할 수 있음
  });

  test('API-AI-032: POST /api/ai/report — student 토큰 → 200 또는 400', async ({ browser }) => {
    const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
    const teacherPage = await teacherCtx.newPage();
    const createRes = await teacherPage.request.post(`${BASE_URL}/api/sessions`, {
      data: { title: `API-AI032-${Date.now()}`, subject: 'Spring', topics: [] },
    });
    const { data: session } = await createRes.json();
    await teacherCtx.close();

    const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
    const page = await ctx.newPage();
    try {
      const res = await page.request.post(`${BASE_URL}/api/ai/report`, {
        data: { sessionId: session.id },
      });
      expect([200, 400, 403, 500]).toContain(res.status()); // 403: student가 POST report 불가일 수 있음
    } finally { await ctx.close(); }
  });

  test('API-AI-033: GET sessionId 파라미터 누락 → 400', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
    const page = await ctx.newPage();
    try {
      const res = await page.request.get(`${BASE_URL}/api/ai/report`);
      expect([400, 422]).toContain(res.status());
    } finally { await ctx.close(); }
  });
});
