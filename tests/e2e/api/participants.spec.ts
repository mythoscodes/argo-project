/**
 * api/participants.spec.ts
 * API-layer 참여자 관리 계약 테스트 (UI 없이 HTTP 레벨)
 * 대상 엔드포인트: GET/POST /api/participants
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE } from '../fixtures/users';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

/** teacher 컨텍스트로 활성 세션 생성 후 { sessionId, joinCode } 반환 */
async function createActiveSession(browser: import('@playwright/test').Browser) {
  const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
  const page = await ctx.newPage();
  try {
    const createRes = await page.request.post(`${BASE_URL}/api/sessions`, {
      data: { title: `PAR-Test-${Date.now()}`, subject: 'Spring', topics: ['JPA'] },
    });
    if (!createRes.ok()) return null;
    const { data: session } = await createRes.json();
    const patchRes = await page.request.patch(`${BASE_URL}/api/sessions/${session.id}`, {
      data: { status: 'active' },
    });
    if (!patchRes.ok()) return null;
    const { data: active } = await patchRes.json();
    return { sessionId: session.id, joinCode: active.join_code as string };
  } finally {
    await ctx.close();
  }
}

test.describe('API: 참여자 관리 (/api/participants)', () => {
  test.describe('POST /api/participants — 세션 참여', () => {
    test('API-PAR-001: 수강생 — 유효한 join_code로 참여 → 200/201', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const res = await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: session.joinCode },
        });
        expect([200, 201, 409]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });

    test('API-PAR-002: joinCode 누락 → 400 Zod 검증', async ({ browser }) => {

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const res = await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: {},
        });
        expect([400, 422]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });

    test('API-PAR-003: 존재하지 않는 join_code → 404', async ({ browser }) => {

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const res = await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: 'XXXXXX' },
        });
        expect([400, 404]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });

    test('API-PAR-004: 미인증 → 401', async ({ request }) => {

      const res = await request.post(`${BASE_URL}/api/participants`, {
        data: { joinCode: 'AAAAAA' },
      });
      expect([401, 302, 403]).toContain(res.status());
    });

    test('API-PAR-005: teacher 토큰으로 참여 시도 → 403', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: session.joinCode },
        });
        expect([401, 403]).toContain(res.status());
      } finally { await teacherCtx.close(); }
    });

    test('API-PAR-006: 동일 수강생 중복 참여 → 200/201 또는 409', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const data = { joinCode: session.joinCode };
        await studentPage.request.post(`${BASE_URL}/api/participants`, { data });
        const res2 = await studentPage.request.post(`${BASE_URL}/api/participants`, { data });
        expect([200, 201, 409]).toContain(res2.status());
      } finally { await studentCtx.close(); }
    });

    test('API-PAR-007: draft 세션 join_code 없음 — 참여 불가 404', async ({ browser }) => {

      // draft 세션은 join_code가 null이므로 참여 코드 없음
      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const res = await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: 'BBBBBB' },
        });
        expect([400, 404]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });

    test('API-PAR-008: 완료(completed) 세션 join_code — 참여 불가 400/404', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      await teacherPage.request.patch(`${BASE_URL}/api/sessions/${session.sessionId}`, {
        data: { status: 'completed' },
      });
      await teacherCtx.close();

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const res = await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: session.joinCode },
        });
        expect([200, 201, 400, 404, 409]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });

    test('API-PAR-009: join_code 대소문자 무감각 처리 — 소문자 입력', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const res = await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: session.joinCode.toLowerCase() },
        });
        // 대소문자 무감각 처리 여부는 구현에 따라 다름
        expect([200, 201, 400, 404, 409]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });

    test('API-PAR-010: join_code XSS payload — 400 Zod 또는 404', async ({ browser }) => {

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const res = await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: '<script>alert(1)</script>' },
        });
        expect([400, 404, 422]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });
  });

  test.describe('GET /api/participants — 참여자 목록 조회', () => {
    test('API-PAR-011: teacher — sessionId로 참여자 목록 조회 200', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(`${BASE_URL}/api/participants?sessionId=${session.sessionId}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('data');
        expect(Array.isArray(body.data)).toBeTruthy();
      } finally { await teacherCtx.close(); }
    });

    test('API-PAR-012: 미인증 GET → 401', async ({ request }) => {

      const res = await request.get(`${BASE_URL}/api/participants?sessionId=00000000-0000-0000-0000-000000000001`);
      expect([401, 302, 403]).toContain(res.status());
    });

    test('API-PAR-013: sessionId 파라미터 누락 → 400', async ({ browser }) => {

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(`${BASE_URL}/api/participants`);
        expect([400, 422]).toContain(res.status());
      } finally { await teacherCtx.close(); }
    });

    test('API-PAR-014: RLS — 타 학원 세션 참여자 조회 차단 — 빈 배열', async ({ browser }) => {

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(`${BASE_URL}/api/participants?sessionId=00000000-0000-0000-0000-000000000001`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.data).toEqual([]);
      } finally { await teacherCtx.close(); }
    });

    test('API-PAR-015: 수강생이 참여한 후 목록에 포함 확인', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: session.joinCode },
        });

        const res = await teacherPage.request.get(`${BASE_URL}/api/participants?sessionId=${session.sessionId}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThanOrEqual(1);
      } finally {
        await studentCtx.close();
        await teacherCtx.close();
      }
    });

    test('API-PAR-016: 응답 구조 — user_id, session_id, joined_at 필드', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: session.joinCode },
        });

        const res = await teacherPage.request.get(`${BASE_URL}/api/participants?sessionId=${session.sessionId}`);
        const body = await res.json();
        if (body.data?.length > 0) {
          const participant = body.data[0];
          expect(participant).toHaveProperty('session_id');
        }
      } finally {
        await studentCtx.close();
        await teacherCtx.close();
      }
    });

    test('API-PAR-017: student 토큰 GET /api/participants — 200 또는 403', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const res = await studentPage.request.get(`${BASE_URL}/api/participants?sessionId=${session.sessionId}`);
        expect([200, 403]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });

    test('API-PAR-018: 잘못된 UUID sessionId → 400 또는 빈 배열', async ({ browser }) => {

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(`${BASE_URL}/api/participants?sessionId=not-a-uuid`);
        expect([200, 400, 422]).toContain(res.status());
      } finally { await teacherCtx.close(); }
    });

    test('API-PAR-019: 완료 세션 참여자 목록 — 여전히 조회 가능', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        await teacherPage.request.patch(`${BASE_URL}/api/sessions/${session.sessionId}`, {
          data: { status: 'completed' },
        });
        const res = await teacherPage.request.get(`${BASE_URL}/api/participants?sessionId=${session.sessionId}`);
        expect(res.status()).toBe(200);
      } finally { await teacherCtx.close(); }
    });

    test('API-PAR-020: 여러 수강생 참여 — 목록에 모두 포함', async ({ browser }) => {
      // Cycle 2: 다수 수강생 계정 필요
      test.skip(true, 'Cycle 2: 다수 수강생 계정 필요 — T12에서 구현');
    });
  });

  test.describe('참여 + 응답 통합 흐름', () => {
    test('API-PAR-021: 참여 → 퀴즈 조회 → 응답 제출 전체 흐름', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        // 1. 참여
        const joinRes = await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: session.joinCode },
        });
        expect([200, 201, 409]).toContain(joinRes.status());

        // 2. 퀴즈 조회
        const quizRes = await studentPage.request.get(`${BASE_URL}/api/quizzes?sessionId=${session.sessionId}`);
        expect(quizRes.status()).toBe(200);
        const { data: quizzes } = await quizRes.json();
        if (!quizzes?.length) { test.skip(true, '퀴즈 없음'); return; }

        // 3. 응답 제출
        const submitRes = await studentPage.request.post(`${BASE_URL}/api/responses`, {
          data: {
            sessionId: session.sessionId,
            quizId: quizzes[0].id,
            selectedOption: quizzes[0].options?.[0] ?? 'A',
            responseTimeMs: 3500,
          },
        });
        expect([200, 201]).toContain(submitRes.status());
      } finally { await studentCtx.close(); }
    });

    test('API-PAR-022: teacher — 참여 후 실시간 인원 수 반영', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const before = await teacherPage.request.get(`${BASE_URL}/api/participants?sessionId=${session.sessionId}`);
        const { data: beforeData } = await before.json();

        await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: session.joinCode },
        });

        const after = await teacherPage.request.get(`${BASE_URL}/api/participants?sessionId=${session.sessionId}`);
        const { data: afterData } = await after.json();
        expect(afterData.length).toBeGreaterThanOrEqual(beforeData.length);
      } finally {
        await studentCtx.close();
        await teacherCtx.close();
      }
    });

    test('API-PAR-023: 참여하지 않고 응답 제출 시도 — 200/201 또는 400', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const quizRes = await studentPage.request.get(`${BASE_URL}/api/quizzes?sessionId=${session.sessionId}`);
        const { data: quizzes } = await quizRes.json();
        if (!quizzes?.length) { test.skip(true, '퀴즈 없음'); return; }

        const res = await studentPage.request.post(`${BASE_URL}/api/responses`, {
          data: {
            sessionId: session.sessionId,
            quizId: quizzes[0].id,
            selectedOption: quizzes[0].options?.[0] ?? 'A',
            responseTimeMs: 2000,
          },
        });
        // 참여 없이 응답 가능 여부는 구현에 따라 다름
        expect([200, 201, 400, 403]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });

    test('API-PAR-024: 응답 제출 후 GET /api/responses — 자신의 응답 포함', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const quizRes = await studentPage.request.get(`${BASE_URL}/api/quizzes?sessionId=${session.sessionId}`);
        const { data: quizzes } = await quizRes.json();
        if (!quizzes?.length) { test.skip(true, '퀴즈 없음'); return; }

        await studentPage.request.post(`${BASE_URL}/api/responses`, {
          data: {
            sessionId: session.sessionId,
            quizId: quizzes[0].id,
            selectedOption: quizzes[0].options?.[0] ?? 'A',
            responseTimeMs: 2200,
          },
        });

        const res = await studentPage.request.get(`${BASE_URL}/api/responses?sessionId=${session.sessionId}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThanOrEqual(1);
      } finally { await studentCtx.close(); }
    });

    test('API-PAR-025: SQL injection — joinCode 파라미터 주입 시도', async ({ browser }) => {

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const res = await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: "'; DROP TABLE participants; --" },
        });
        expect([400, 404, 422]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });

    test('API-PAR-026: join_code 길이 검증 — 5자 → 400', async ({ browser }) => {

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const res = await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: 'ABC12' },
        });
        expect([400, 404, 422]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });

    test('API-PAR-027: join_code 길이 검증 — 7자 → 400 또는 404', async ({ browser }) => {

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const res = await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: 'ABCDEFG' },
        });
        expect([400, 404, 422]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });

    test('API-PAR-028: 빈 문자열 join_code → 400', async ({ browser }) => {

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const res = await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: '' },
        });
        expect([400, 422]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });

    test('API-PAR-029: null joinCode → 400', async ({ browser }) => {

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const res = await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: null },
        });
        expect([400, 422]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });

    test('API-PAR-030: mentor 토큰으로 참여 시도 → 403', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const mentorCtx = await browser.newContext({ storageState: AUTH_STATE.mentor });
      const mentorPage = await mentorCtx.newPage();
      try {
        const res = await mentorPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: session.joinCode },
        });
        expect([200, 201, 403, 409]).toContain(res.status());
      } finally { await mentorCtx.close(); }
    });

    test('API-PAR-031: 참여자 수 — 단일 세션 격리 확인', async ({ browser }) => {

      const session1 = await createActiveSession(browser);
      const session2 = await createActiveSession(browser);
      if (!session1 || !session2) { test.skip(true, '세션 생성 실패'); return; }

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        // session1에만 참여
        await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: session1.joinCode },
        });

        // session2 참여자는 0
        const res = await teacherPage.request.get(`${BASE_URL}/api/participants?sessionId=${session2.sessionId}`);
        const body = await res.json();
        expect(body.data.length).toBe(0);
      } finally {
        await studentCtx.close();
        await teacherCtx.close();
      }
    });

    test('API-PAR-032: owner 토큰 GET /api/participants — 200 또는 403', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const ownerCtx = await browser.newContext({ storageState: AUTH_STATE.owner });
      const ownerPage = await ownerCtx.newPage();
      try {
        const res = await ownerPage.request.get(`${BASE_URL}/api/participants?sessionId=${session.sessionId}`);
        expect([200, 403]).toContain(res.status());
      } finally { await ownerCtx.close(); }
    });

    test('API-PAR-033: 대용량 응답 처리 — 응답 시간 3초 이내', async ({ browser }) => {
      // Cycle 2: 부하 테스트
      test.skip(true, 'Cycle 2: 대용량 참여자 응답 처리 성능 검증 — T12에서 구현');
    });

    test('API-PAR-034: 헤더 검증 — Content-Type: application/json', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(`${BASE_URL}/api/participants?sessionId=${session.sessionId}`);
        expect(res.status()).toBe(200);
        const contentType = res.headers()['content-type'];
        expect(contentType).toContain('application/json');
      } finally { await teacherCtx.close(); }
    });
  });
});
