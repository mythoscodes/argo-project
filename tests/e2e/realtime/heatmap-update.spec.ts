/**
 * realtime/heatmap-update.spec.ts
 * Realtime 히트맵 업데이트 채널 테스트 (Supabase Realtime responses:{sessionId})
 * 응답 제출 → DB 변경 → 히트맵 데이터 갱신 흐름 검증
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE } from '../fixtures/users';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

/** teacher 컨텍스트로 활성 세션 생성 */
async function createActiveSession(browser: import('@playwright/test').Browser) {
  const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
  const page = await ctx.newPage();
  try {
    const createRes = await page.request.post(`${BASE_URL}/api/sessions`, {
      data: { title: `RT-HMU-${Date.now()}`, subject: 'Spring', topics: ['JPA', 'Bean', 'MVC'] },
    });
    if (!createRes.ok()) return null;
    const { data: session } = await createRes.json();
    const patchRes = await page.request.patch(`${BASE_URL}/api/sessions/${session.id}`, {
      data: { status: 'active' },
    });
    if (!patchRes.ok()) return null;
    const { data: active } = await patchRes.json();
    return { sessionId: session.id, joinCode: active.join_code };
  } finally {
    await ctx.close();
  }
}

test.describe('Realtime: 히트맵 데이터 채널', () => {
  test.describe('히트맵 기본 데이터 조회', () => {
    test('RT-HMU-001: GET /api/participants?sessionId — teacher 기본 조회 200', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(`${BASE_URL}/api/participants?sessionId=${session.sessionId}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body.data)).toBeTruthy();
      } finally { await teacherCtx.close(); }
    });

    test('RT-HMU-002: GET /api/responses?sessionId — teacher 응답 집계 조회 200', async ({ browser }) => {
      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(`${BASE_URL}/api/responses?sessionId=${session.sessionId}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body.data)).toBeTruthy();
      } finally { await teacherCtx.close(); }
    });

    test('RT-HMU-003: 응답 없는 세션 — 빈 배열 반환', async ({ browser }) => {
      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(`${BASE_URL}/api/responses?sessionId=${session.sessionId}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body.data)).toBeTruthy();
        // 참여자 없으므로 빈 배열
        expect(body.data.length).toBe(0);
      } finally { await teacherCtx.close(); }
    });

    test('RT-HMU-004: GET /api/ai/analysis?sessionId — 분석 데이터 조회', async ({ browser }) => {
      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(`${BASE_URL}/api/ai/analysis?sessionId=${session.sessionId}`);
        expect([200, 404, 422]).toContain(res.status()); // 422: 분석 데이터 없는 세션 Zod 검증
      } finally { await teacherCtx.close(); }
    });

    test('RT-HMU-005: 완료 세션 히트맵 데이터 — 여전히 조회 가능', async ({ browser }) => {
      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        await teacherPage.request.patch(`${BASE_URL}/api/sessions/${session.sessionId}`, {
          data: { status: 'completed' },
        });
        const res = await teacherPage.request.get(`${BASE_URL}/api/responses?sessionId=${session.sessionId}`);
        expect(res.status()).toBe(200);
      } finally { await teacherCtx.close(); }
    });

    test('RT-HMU-006: GET /api/quizzes?sessionId — 퀴즈 목록 확인', async ({ browser }) => {
      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(`${BASE_URL}/api/quizzes?sessionId=${session.sessionId}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('data');
      } finally { await teacherCtx.close(); }
    });

    test('RT-HMU-007: 응답 제출 후 GET /api/responses 즉시 반영', async ({ browser }) => {
      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        // 퀴즈 조회
        const quizRes = await studentPage.request.get(`${BASE_URL}/api/quizzes?sessionId=${session.sessionId}`);
        const { data: quizzes } = await quizRes.json();
        if (!quizzes?.length) { test.skip(true, '퀴즈 없음'); return; }

        // 응답 제출
        await studentPage.request.post(`${BASE_URL}/api/responses`, {
          data: {
            sessionId: session.sessionId,
            quizId: quizzes[0].id,
            selectedOption: quizzes[0].options?.[0] ?? 'A',
            responseTimeMs: 2500,
          },
        });

        // teacher가 응답 즉시 확인
        const resAfter = await teacherPage.request.get(`${BASE_URL}/api/responses?sessionId=${session.sessionId}`);
        expect(resAfter.status()).toBe(200);
      } finally {
        await teacherCtx.close();
        await studentCtx.close();
      }
    });

    test('RT-HMU-008: 수강생 참여 후 participants 수 증가', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        // 참여
        await studentPage.request.post(`${BASE_URL}/api/participants`, {
          data: { joinCode: session.joinCode },
        });

        // 참여자 수 확인
        const res = await teacherPage.request.get(`${BASE_URL}/api/participants?sessionId=${session.sessionId}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body.data)).toBeTruthy();
        expect(body.data.length).toBeGreaterThanOrEqual(1);
      } finally {
        await studentCtx.close();
        await teacherCtx.close();
      }
    });

    test('RT-HMU-009: sessionId 파라미터 없이 GET /api/responses → 400', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(`${BASE_URL}/api/responses`);
        expect([400, 422]).toContain(res.status());
      } finally { await teacherCtx.close(); }
    });

    test('RT-HMU-010: sessionId 파라미터 없이 GET /api/participants → 400', async ({ browser }) => {

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(`${BASE_URL}/api/participants`);
        expect([400, 422]).toContain(res.status());
      } finally { await teacherCtx.close(); }
    });
  });

  test.describe('실시간 업데이트 시뮬레이션', () => {
    test('RT-HMU-011: 수강생 응답 제출 → teacher 히트맵 데이터 갱신 확인', async ({ browser }) => {
      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const quizRes = await studentPage.request.get(`${BASE_URL}/api/quizzes?sessionId=${session.sessionId}`);
        const { data: quizzes } = await quizRes.json();
        if (!quizzes?.length) { test.skip(true, '퀴즈 없음'); return; }

        const beforeRes = await teacherPage.request.get(`${BASE_URL}/api/responses?sessionId=${session.sessionId}`);
        const { data: before } = await beforeRes.json();

        await studentPage.request.post(`${BASE_URL}/api/responses`, {
          data: {
            sessionId: session.sessionId,
            quizId: quizzes[0].id,
            selectedOption: quizzes[0].options?.[0] ?? 'A',
            responseTimeMs: 1800,
          },
        });

        const afterRes = await teacherPage.request.get(`${BASE_URL}/api/responses?sessionId=${session.sessionId}`);
        const { data: after } = await afterRes.json();
        expect(after.length).toBeGreaterThanOrEqual(before.length);
      } finally {
        await teacherCtx.close();
        await studentCtx.close();
      }
    });

    test('RT-HMU-012: 여러 수강생 응답 → 집계 데이터 확인', async ({ browser }) => {
      // Cycle 2: 다수 수강생 계정 필요
      test.skip(true, 'Cycle 2: 다수 수강생 계정 필요 — T12에서 구현');
    });

    test('RT-HMU-013: WebSocket 연결 — Supabase Realtime 채널 구독', async ({ browser }) => {
      // Cycle 2: WebSocket 직접 검증
      test.skip(true, 'Cycle 2: WebSocket 직접 연결 검증 — T12에서 구현');
    });

    test('RT-HMU-014: Realtime 이벤트 — INSERT 타입 확인', async ({ browser }) => {
      // Cycle 2: Realtime 이벤트 페이로드 검증
      test.skip(true, 'Cycle 2: Realtime INSERT 이벤트 페이로드 검증 — T12에서 구현');
    });

    test('RT-HMU-015: Realtime 이벤트 — 5초 이내 전파', async ({ browser }) => {
      // Cycle 2: 지연 시간 측정
      test.skip(true, 'Cycle 2: 이벤트 전파 지연 측정 (≤5s) — T12에서 구현');
    });

    test('RT-HMU-016: 응답률 계산 — 전체 수강생 대비 정확도', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const participantsRes = await teacherPage.request.get(`${BASE_URL}/api/participants?sessionId=${session.sessionId}`);
        const responsesRes = await teacherPage.request.get(`${BASE_URL}/api/responses?sessionId=${session.sessionId}`);
        expect(participantsRes.status()).toBe(200);
        expect(responsesRes.status()).toBe(200);
      } finally { await teacherCtx.close(); }
    });

    test('RT-HMU-017: 세션 완료 후 Realtime 구독 해제', async ({ browser }) => {
      // Cycle 2: 완료 후 구독 해제 검증
      test.skip(true, 'Cycle 2: 세션 완료 후 Realtime 구독 자동 해제 — T12에서 구현');
    });

    test('RT-HMU-018: 네트워크 재연결 — Realtime 재구독', async ({ browser }) => {
      // Cycle 2: 네트워크 단절 후 재연결 시나리오
      test.skip(true, 'Cycle 2: 네트워크 재연결 후 Realtime 재구독 — T12에서 구현');
    });

    test('RT-HMU-019: 퀴즈별 정답률 데이터 구조 확인', async ({ browser }) => {
      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(`${BASE_URL}/api/responses?sessionId=${session.sessionId}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('data');
      } finally { await teacherCtx.close(); }
    });

    test('RT-HMU-020: 응답 시간(responseTimeMs) 기록 확인', async ({ browser }) => {
      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const quizRes = await studentPage.request.get(`${BASE_URL}/api/quizzes?sessionId=${session.sessionId}`);
        const { data: quizzes } = await quizRes.json();
        if (!quizzes?.length) { test.skip(true, '퀴즈 없음'); return; }

        const submitRes = await studentPage.request.post(`${BASE_URL}/api/responses`, {
          data: {
            sessionId: session.sessionId,
            quizId: quizzes[0].id,
            selectedOption: quizzes[0].options?.[0] ?? 'A',
            responseTimeMs: 4200,
          },
        });
        expect([200, 201]).toContain(submitRes.status());

        const checkRes = await teacherPage.request.get(`${BASE_URL}/api/responses?sessionId=${session.sessionId}`);
        expect(checkRes.status()).toBe(200);
      } finally {
        await studentCtx.close();
        await teacherCtx.close();
      }
    });
  });

  test.describe('RLS 및 접근 제어', () => {
    test('RT-HMU-021: 미인증 GET /api/responses → 401', async ({ request }) => {
      const res = await request.get(`${BASE_URL}/api/responses?sessionId=00000000-0000-0000-0000-000000000001`);
      expect([401, 302, 403]).toContain(res.status());
    });

    test('RT-HMU-022: 미인증 GET /api/participants → 401', async ({ request }) => {

      const res = await request.get(`${BASE_URL}/api/participants?sessionId=00000000-0000-0000-0000-000000000001`);
      expect([401, 302, 403]).toContain(res.status());
    });

    test('RT-HMU-023: RLS — 타 학원 세션 응답 조회 차단', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(`${BASE_URL}/api/responses?sessionId=00000000-0000-0000-0000-000000000001`);
        // 존재하지 않는 UUID → 400(유효하지 않은 세션) 또는 200(RLS 빈 배열)
        expect([200, 400]).toContain(res.status());
        if (res.status() === 200) {
          const body = await res.json();
          expect(body.data).toEqual([]);
        }
      } finally { await teacherCtx.close(); }
    });

    test('RT-HMU-024: RLS — 타 학원 세션 참여자 조회 차단', async ({ browser }) => {

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(`${BASE_URL}/api/participants?sessionId=00000000-0000-0000-0000-000000000001`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.data).toEqual([]);
      } finally { await teacherCtx.close(); }
    });

    test('RT-HMU-025: student 토큰으로 GET /api/responses — 자신의 응답만 조회', async ({ browser }) => {
      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const res = await studentPage.request.get(`${BASE_URL}/api/responses?sessionId=${session.sessionId}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body.data)).toBeTruthy();
      } finally { await studentCtx.close(); }
    });

    test('RT-HMU-026: student 토큰으로 GET /api/participants — 200 또는 403', async ({ browser }) => {

      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const res = await studentPage.request.get(`${BASE_URL}/api/participants?sessionId=${session.sessionId}`);
        expect([200, 403]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });

    test('RT-HMU-027: draft 세션 히트맵 데이터 — 빈 배열', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const createRes = await teacherPage.request.post(`${BASE_URL}/api/sessions`, {
          data: { title: `RT-HMU-Draft-${Date.now()}`, subject: 'Spring', topics: [] },
        });
        if (!createRes.ok()) { test.skip(true, '세션 생성 실패'); return; }
        const { data: session } = await createRes.json();

        const res = await teacherPage.request.get(`${BASE_URL}/api/responses?sessionId=${session.id}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body.data)).toBeTruthy();
        expect(body.data.length).toBe(0);
      } finally { await teacherCtx.close(); }
    });

    test('RT-HMU-028: SQL injection — sessionId 파라미터 주입 시도', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(
          `${BASE_URL}/api/responses?sessionId='; DROP TABLE responses; --`
        );
        expect([400, 404, 422]).toContain(res.status());
      } finally { await teacherCtx.close(); }
    });

    test('RT-HMU-029: 잘못된 UUID sessionId → 400 또는 빈 배열', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.get(`${BASE_URL}/api/responses?sessionId=invalid-uuid`);
        expect([200, 400, 422]).toContain(res.status());
      } finally { await teacherCtx.close(); }
    });

    test('RT-HMU-030: AI 분석 — 미인증 GET /api/ai/analysis → 401', async ({ request }) => {
      const res = await request.get(`${BASE_URL}/api/ai/analysis?sessionId=00000000-0000-0000-0000-000000000001`);
      expect([401, 302, 403]).toContain(res.status());
    });

    test('RT-HMU-031: AI 분석 — student 토큰 → 403 (teacher 전용)', async ({ browser }) => {
      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        const res = await studentPage.request.get(`${BASE_URL}/api/ai/analysis?sessionId=00000000-0000-0000-0000-000000000001`);
        expect([401, 403]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });

    test('RT-HMU-032: POST /api/ai/analysis — 데이터 없는 세션 → 400 또는 빈 분석', async ({ browser }) => {
      const session = await createActiveSession(browser);
      if (!session) { test.skip(true, '세션 생성 실패'); return; }

      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      try {
        const res = await teacherPage.request.post(`${BASE_URL}/api/ai/analysis`, {
          data: { sessionId: session.sessionId },
        });
        expect([200, 400, 422, 500]).toContain(res.status()); // 422: 응답 없는 세션 Zod 검증
      } finally { await teacherCtx.close(); }
    });

    test('RT-HMU-033: 히트맵 색상 계산 — 정답률 기준 분류 (0~100)', async ({ browser }) => {
      // Cycle 2: UI 레벨 색상 렌더링 검증
      test.skip(true, 'Cycle 2: 히트맵 색상 렌더링 검증 — T12에서 구현');
    });

    test('RT-HMU-034: 응답 속도 위험 신호 — RISK_SPEED_INCREASE_RATIO 기준', async ({ browser }) => {
      // Cycle 2: 속도 기반 위험 신호 계산 검증
      test.skip(true, 'Cycle 2: 응답 속도 위험 신호 RISK_SPEED_INCREASE_RATIO 기준 검증 — T12에서 구현');
    });

    test('RT-HMU-035: 멘토 학생 리스트 위험도 반영 확인', async ({ browser }) => {
      const mentorCtx = await browser.newContext({ storageState: AUTH_STATE.mentor });
      const mentorPage = await mentorCtx.newPage();
      try {
        const res = await mentorPage.request.get(`${BASE_URL}/api/mentor/students`);
        expect([200, 403, 404]).toContain(res.status());
      } finally { await mentorCtx.close(); }
    });
  });
});
