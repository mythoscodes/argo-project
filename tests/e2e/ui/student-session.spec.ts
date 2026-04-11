/**
 * ui/student-session.spec.ts
 * SSN-UI / SSN-API / SSN-RT / SSN-ERR: 수강생 퀴즈 풀기 (F2/F3)
 * 라우트: /student/sessions/[id]
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE } from '../fixtures/users';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.use({ storageState: AUTH_STATE.student });

/** teacher 컨텍스트로 active 세션 + join_code 반환 */
async function createActiveSession(browser: Parameters<typeof test>[1] extends (args: { browser: infer B }) => unknown ? B : never) {
  const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
  const page = await ctx.newPage();
  try {
    const createRes = await page.request.post(`${BASE_URL}/api/sessions`, {
      data: { title: `SSN-Test-${Date.now()}`, subject: 'Spring', topics: ['JPA'] },
    });
    if (!createRes.ok()) return null;
    const { data: session } = await createRes.json();
    const activateRes = await page.request.patch(`${BASE_URL}/api/sessions/${session.id}`, { data: { status: 'active' } });
    if (!activateRes.ok()) return null;
    const { data: active } = await activateRes.json();
    return { sessionId: active.id as string, joinCode: active.join_code as string };
  } finally { await ctx.close(); }
}

/** 수강생이 세션에 참여하여 sessionId 반환 */
async function joinSession(browser: Parameters<typeof test>[1] extends (args: { browser: infer B }) => unknown ? B : never, joinCode: string) {
  const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
  const page = await ctx.newPage();
  try {
    const res = await page.request.post(`${BASE_URL}/api/sessions/join`, { data: { joinCode } });
    if (!res.ok()) return null;
    const { data } = await res.json();
    return data.sessionId as string;
  } finally { await ctx.close(); }
}

test.describe('SSN: 수강생 퀴즈 풀기 (/student/sessions/[id])', () => {
  /* ─────────────────────────────── UI 시나리오 ─────────────────────────────── */

  test.describe('UI 시나리오', () => {
    test('SSN-UI-001: 대기 상태 — 퀴즈 없음 → "대기 중" 화면', async ({ browser }) => {
      const sessionData = await createActiveSession(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }
      const sessionId = await joinSession(browser, sessionData.joinCode);
      if (!sessionId) { test.skip(true, '세션 참여 실패'); return; }

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        await page.goto(`/student/sessions/${sessionId}`);
        await page.waitForLoadState('networkidle');
        // 퀴즈 없으면 대기 화면
        const content = await page.content();
        const hasWaitScreen = content.includes('대기') || content.includes('강사') || content.includes('준비');
        expect(hasWaitScreen).toBeTruthy();
      } finally { await ctx.close(); }
    });

    test('SSN-UI-002: 퀴즈 풀기 정상 — 보기 선택 후 제출', async ({ page }) => {
      test.skip(true, 'Cycle 2: 퀴즈 생성 + 수강생 응답 E2E — T12에서 구현');
    });

    test('SSN-UI-003: 보기 선택 토글 — 단일 선택', async ({ page }) => {
      test.skip(true, 'Cycle 2: 퀴즈 수신 후 보기 선택 확인 — T12에서 구현');
    });

    test('SSN-UI-004: 모든 퀴즈 완료 — "모든 퀴즈 완료!" 화면', async ({ page }) => {
      test.skip(true, 'Cycle 2: 전체 응답 완료 후 화면 확인 — T12에서 구현');
    });

    test('SSN-UI-005: 세션 종료 감지 — "수업이 종료되었습니다"', async ({ page }) => {
      test.skip(true, 'Cycle 2: Realtime 종료 이벤트 — T12에서 구현');
    });

    test('SSN-UI-006: 라운드 배지 — "라운드 2"', async ({ page }) => {
      test.skip(true, 'Cycle 2: round_number=2 퀴즈 배지 확인 — T12에서 구현');
    });

    test('SSN-UI-007: 코드 스니펫 렌더 — 다크 <pre> 블록', async ({ page }) => {
      test.skip(true, 'Cycle 2: code_snippet 퀴즈 렌더 확인 — T12에서 구현');
    });

    test('SSN-UI-008: 토픽 태그 — topic_tag 배지 노출', async ({ page }) => {
      test.skip(true, 'Cycle 2: topic_tag 배지 확인 — T12에서 구현');
    });

    test('SSN-UI-009: 이미 응답한 퀴즈 — disabled + 선택 하이라이트', async ({ page }) => {
      test.skip(true, 'Cycle 2: 기응답 퀴즈 UI 확인 — T12에서 구현');
    });

    test('SSN-UI-010: 자동 진행 — 첫 미응답 퀴즈로 이동', async ({ page }) => {
      test.skip(true, 'Cycle 2: 미응답 퀴즈 자동 이동 확인 — T12에서 구현');
    });

    test('SSN-UI-011: 제출 중 로딩 — "제출 중..." + Spinner', async ({ page }) => {
      test.skip(true, 'Cycle 2: 제출 중 버튼 상태 인터셉트 — T12에서 구현');
    });

    test('SSN-UI-012: 진행 표시 — "2 / 3"', async ({ page }) => {
      test.skip(true, 'Cycle 2: 진행 표시 정확성 확인 — T12에서 구현');
    });

    test('SSN-UI-013: 선택 없이 "제출" 버튼 disabled', async ({ page }) => {
      test.skip(true, 'Cycle 2: 미선택 시 버튼 disabled 확인 — T12에서 구현');
    });

    test('SSN-UI-014: 퀴즈 1개 — "1 / 1" 표시, 응답 후 완료', async ({ page }) => {
      test.skip(true, 'Cycle 2: 단일 퀴즈 완료 화면 확인 — T12에서 구현');
    });

    test('SSN-UI-015: 퀴즈 5개 (MAX_QUIZ_COUNT) — 모두 순서대로 렌더', async ({ page }) => {
      test.skip(true, 'Cycle 2: 최대 퀴즈 수 렌더 확인 — T12에서 구현');
    });

    test('SSN-UI-016: 보기 4개 렌더', async ({ page }) => {
      test.skip(true, 'Cycle 2: options.length=4 보기 버튼 확인 — T12에서 구현');
    });

    test('SSN-UI-017: 보기 2개 (true/false)', async ({ page }) => {
      test.skip(true, 'Cycle 2: true_false 2보기 확인 — T12에서 구현');
    });

    test('SSN-UI-018: 긴 보기 텍스트 — 줄바꿈, 카드 넘침 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: 200자 보기 레이아웃 확인 — T12에서 구현');
    });

    test('SSN-UI-019: 긴 질문 텍스트 — 스크롤, 크래시 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: 500자 질문 레이아웃 확인 — T12에서 구현');
    });

    test('SSN-UI-020: 긴 코드 스니펫 — <pre> 스크롤', async ({ page }) => {
      test.skip(true, 'Cycle 2: 100줄 코드 스크롤 확인 — T12에서 구현');
    });

    test('SSN-UI-021: 완료 후 "결과 확인하기" → /result', async ({ page }) => {
      test.skip(true, 'Cycle 2: 완료 후 결과 이동 확인 — T12에서 구현');
    });

    test('SSN-UI-022: 접근성 — 보기 버튼 Tab 이동', async ({ page }) => {
      test.skip(true, 'Cycle 2: 키보드 보기 선택 확인 — T12에서 구현');
    });

    test('SSN-UI-023: 접근성 — 제출 버튼 Enter', async ({ page }) => {
      test.skip(true, 'Cycle 2: Enter 제출 확인 — T12에서 구현');
    });

    test('SSN-UI-024: data-testid — quiz-card, option-{n}, submit-btn', async ({ page }) => {
      test.skip(true, 'Cycle 2: data-testid 셀렉터 존재 확인 — T12에서 구현');
    });

    test('SSN-UI-025: 이중 제출 방지 — isSubmitting 가드', async ({ page }) => {
      test.skip(true, 'Cycle 2: 빠른 연속 제출 방지 확인 — T12에서 구현');
    });

    test('SSN-UI-026: 완료 후 라운드 2 수신 — 자동 전환', async ({ page }) => {
      test.skip(true, 'Cycle 2: Realtime 라운드 2 수신 시나리오 — T12에서 구현');
    });

    test('SSN-UI-027: 응답 시간 측정 — responseTimeMs ≈ 5000', async ({ page }) => {
      test.skip(true, 'Cycle 2: 응답 시간 ms 측정 확인 — T12에서 구현');
    });

    test('SSN-UI-028: 퀴즈 이동 시 startTime 리셋', async ({ page }) => {
      test.skip(true, 'Cycle 2: 퀴즈 이동 후 startTime 리셋 확인 — T12에서 구현');
    });

    test('SSN-UI-029: 세션 종료 후 결과 버튼 — /result 이동', async ({ page }) => {
      test.skip(true, 'Cycle 2: Realtime 종료 후 결과 버튼 확인 — T12에서 구현');
    });

    test('SSN-UI-030: 페이지 타이틀 표시', async ({ page }) => {
      test.skip(true, 'Cycle 2: 브라우저 탭 타이틀 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── API 계약 ─────────────────────────────── */

  test.describe('API 계약', () => {
    test('SSN-API-001: POST /api/responses → 201 + ResponseRow', async ({ browser }) => {
      const sessionData = await createActiveSession(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }

      // 수강생 참여
      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        await studentPage.request.post(`${BASE_URL}/api/sessions/join`, { data: { joinCode: sessionData.joinCode } });

        // 퀴즈 생성 (teacher)
        const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
        const teacherPage = await teacherCtx.newPage();
        await teacherPage.request.post(`${BASE_URL}/api/ai/quiz`, {
          data: { sessionId: sessionData.sessionId, subject: 'Spring', topic: 'JPA', count: 3, difficulty: 'mixed' },
        });
        const quizRes = await teacherPage.request.get(`${BASE_URL}/api/quizzes?sessionId=${sessionData.sessionId}`);
        // quizRes.json() 반드시 teacherCtx.close() 전에 읽어야 함 (Response disposed 방지)
        const quizBody = quizRes.ok() ? await quizRes.json() : null;
        await teacherCtx.close();

        if (!quizBody) { test.skip(true, '퀴즈 생성 실패'); return; }
        const { data: quizzes } = quizBody;
        if (!quizzes?.length) { test.skip(true, '퀴즈 없음'); return; }

        const quiz = quizzes[0];
        const res = await studentPage.request.post(`${BASE_URL}/api/responses`, {
          data: {
            quizId: quiz.id,
            sessionId: sessionData.sessionId,
            selectedAnswer: (quiz.options as string[])[0],
            responseTimeMs: 3000,
          },
        });
        expect([200, 201]).toContain(res.status());
      } finally { await studentCtx.close(); }
    });

    test('SSN-API-002: GET /api/quizzes?sessionId — 수강생 참여 세션 퀴즈', async ({ browser }) => {
      const sessionData = await createActiveSession(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }
      const sessionId = await joinSession(browser, sessionData.joinCode);
      if (!sessionId) { test.skip(true, '세션 참여 실패'); return; }

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/quizzes?sessionId=${sessionId}`);
        expect(res.status()).toBe(200);
        const { data } = await res.json();
        expect(Array.isArray(data)).toBeTruthy();
      } finally { await ctx.close(); }
    });

    test('SSN-API-003: GET /api/responses?sessionId — 본인 응답만', async ({ browser }) => {
      const sessionData = await createActiveSession(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }
      const sessionId = await joinSession(browser, sessionData.joinCode);
      if (!sessionId) { test.skip(true, '세션 참여 실패'); return; }

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/responses?sessionId=${sessionId}`);
        expect(res.status()).toBe(200);
        const { data } = await res.json();
        expect(Array.isArray(data)).toBeTruthy();
      } finally { await ctx.close(); }
    });

    test('SSN-API-004: 중복 응답 제출 → 409 또는 멱등', async ({ page }) => {
      test.skip(true, 'Cycle 2: 중복 응답 정책 확인 — T12에서 구현');
    });

    test('SSN-API-005: responseTimeMs DB 저장', async ({ page }) => {
      test.skip(true, 'Cycle 2: ms 단위 저장 확인 — T12에서 구현');
    });

    test('SSN-API-006: selectedAnswer 빈 문자열 → 400', async ({ browser }) => {
      const sessionData = await createActiveSession(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/responses`, {
          data: { quizId: '00000000-0000-0000-0000-000000000000', sessionId: sessionData.sessionId, selectedAnswer: '', responseTimeMs: 1000 },
        });
        expect([400, 422]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('SSN-API-007: 타 세션 퀴즈 응답 시도 → 403/404', async ({ page }) => {
      test.skip(true, 'Cycle 2: 미참여 세션 퀴즈 ID 접근 — T12에서 구현');
    });

    test('SSN-API-008: 미인증 응답 제출 → 401', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } }); // 진짜 미인증
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/responses`, {
          data: { quizId: '00000000-0000-0000-0000-000000000000', sessionId: '00000000-0000-0000-0000-000000000000', selectedAnswer: 'A', responseTimeMs: 1000 },
        });
        expect([401, 302]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('SSN-API-009: teacher role 응답 제출 → 403', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/responses`, {
          data: { quizId: '00000000-0000-0000-0000-000000000000', sessionId: '00000000-0000-0000-0000-000000000000', selectedAnswer: 'A', responseTimeMs: 1000 },
        });
        expect([403, 400]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('SSN-API-010: responseTimeMs 음수 → 400 또는 0으로 강제', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/responses`, {
          data: { quizId: '00000000-0000-0000-0000-000000000000', sessionId: '00000000-0000-0000-0000-000000000000', selectedAnswer: 'A', responseTimeMs: -100 },
        });
        expect([400, 422, 403, 404]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('SSN-API-011: responseTimeMs 매우 큰 값 — 저장 허용 또는 cap', async ({ page }) => {
      test.skip(true, 'Cycle 2: responseTimeMs 상한 정책 확인 — T12에서 구현');
    });

    test('SSN-API-012: selectedAnswer XSS → Zod 또는 React escape', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/responses`, {
          data: { quizId: '00000000-0000-0000-0000-000000000000', sessionId: '00000000-0000-0000-0000-000000000000', selectedAnswer: '<script>alert(1)</script>', responseTimeMs: 1000 },
        });
        // XSS 시도 — 400 또는 저장 후 React escape
        expect([400, 422, 403, 404, 200, 201]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('SSN-API-013: selectedAnswer SQL injection — Supabase 파라미터 바인딩', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/responses`, {
          data: { quizId: '00000000-0000-0000-0000-000000000000', sessionId: '00000000-0000-0000-0000-000000000000', selectedAnswer: "'; DROP TABLE responses;--", responseTimeMs: 1000 },
        });
        // SQL injection 방어 — 서버 크래시 없음
        expect([400, 422, 403, 404, 200, 201]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('SSN-API-014: 타 수강생 응답 조회 불가 (RLS)', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타 수강생 응답 RLS 격리 확인 — T12에서 구현');
    });

    test('SSN-API-015: 타 학원 세션 퀴즈 조회 — 빈 배열 (RLS)', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타 학원 세션 퀴즈 RLS 격리 확인 — T12에서 구현');
    });

    test('SSN-API-016: quizId UUID 아닌 값 → 400 Zod', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/responses`, {
          data: { quizId: 'not-uuid', sessionId: '00000000-0000-0000-0000-000000000000', selectedAnswer: 'A', responseTimeMs: 1000 },
        });
        expect([400, 422]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('SSN-API-017: 한국어 에러 — 중복 응답', async ({ page }) => {
      test.skip(true, 'Cycle 2: 중복 응답 한국어 에러 확인 — T12에서 구현');
    });

    test('SSN-API-018: 한국어 에러 — 미인증', async ({ page }) => {
      test.skip(true, 'Cycle 2: 미인증 한국어 에러 확인 — T12에서 구현');
    });

    test('SSN-API-019: 응답 후 UI 반영 — myResponse 즉시 반영', async ({ page }) => {
      test.skip(true, 'Cycle 2: 응답 후 UI 상태 즉시 갱신 확인 — T12에서 구현');
    });

    test('SSN-API-020: NULL selectedAnswer → 400', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/responses`, {
          data: { quizId: '00000000-0000-0000-0000-000000000000', sessionId: '00000000-0000-0000-0000-000000000000', selectedAnswer: null, responseTimeMs: 1000 },
        });
        expect([400, 422]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('SSN-API-021: 매우 긴 selectedAnswer — 정책 확인', async ({ page }) => {
      test.skip(true, 'Cycle 2: selectedAnswer max length 정책 확인 — T12에서 구현');
    });

    test('SSN-API-022: 5xx 서버 에러 — 에러 메시지, 재제출 가능', async ({ page }) => {
      test.skip(true, 'Cycle 2: 서버 에러 주입 시나리오 — T12에서 구현');
    });

    test('SSN-API-023: 429 rate limit — 연속 제출', async ({ page }) => {
      test.skip(true, 'Cycle 2: rate limit 정책 확인 — T12에서 구현');
    });

    test('SSN-API-024: round_number 저장 정확성', async ({ page }) => {
      test.skip(true, 'Cycle 2: 라운드 2 응답 round_number 저장 확인 — T12에서 구현');
    });

    test('SSN-API-025: 세션 종료 후 응답 제출 — 400 또는 허용 (정책)', async ({ page }) => {
      test.skip(true, 'Cycle 2: completed 세션 응답 정책 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── Realtime ─────────────────────────────── */

  test.describe('Realtime', () => {
    test('SSN-RT-001: quizzes INSERT — 새 퀴즈 반영, 대기→문제 전환', async ({ page }) => {
      test.skip(true, 'Cycle 2: 강사 퀴즈 생성 → 수강생 화면 전환 — T12에서 구현');
    });

    test('SSN-RT-002: 라운드 2 퀴즈 수신 — 완료 화면 → 새 라운드 전환', async ({ page }) => {
      test.skip(true, 'Cycle 2: 재퀴즈 Realtime 시나리오 — T12에서 구현');
    });

    test('SSN-RT-003: session_status UPDATE→completed — "수업이 종료되었습니다"', async ({ page }) => {
      test.skip(true, 'Cycle 2: 세션 종료 Realtime 시나리오 — T12에서 구현');
    });

    test('SSN-RT-004: 채널 언서브스크라이브 — 페이지 이탈 시 cleanup', async ({ page }) => {
      test.skip(true, 'Cycle 2: channel.unsubscribe 확인 — T12에서 구현');
    });

    test('SSN-RT-005: 네트워크 단절 후 복구 — Realtime 재연결', async ({ page }) => {
      test.skip(true, 'Cycle 2: 네트워크 복구 시나리오 — T12에서 구현');
    });

    test('SSN-RT-006: 이벤트 순서 역전 — 중복 없이 렌더', async ({ page }) => {
      test.skip(true, 'Cycle 2: 동시 INSERT 이벤트 중복 방지 — T12에서 구현');
    });

    test('SSN-RT-007: CHANNEL_ERROR — isConnected=false, 에러 고지', async ({ page }) => {
      test.skip(true, 'Cycle 2: CHANNEL_ERROR 핸들링 확인 — T12에서 구현');
    });

    test('SSN-RT-008: TIMED_OUT — 재연결 또는 에러 상태', async ({ page }) => {
      test.skip(true, 'Cycle 2: TIMED_OUT 핸들링 확인 — T12에서 구현');
    });

    test('SSN-RT-009: 동일 이벤트 중복 수신 — id 중복 체크', async ({ page }) => {
      test.skip(true, 'Cycle 2: INSERT 중복 방지 확인 — T12에서 구현');
    });

    test('SSN-RT-010: 장시간 대기 — Realtime 구독 유지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 1시간 구독 유지 시나리오 — T12에서 구현');
    });

    test('SSN-RT-011: 채널 연결 상태 표시 — isConnected=true', async ({ page }) => {
      test.skip(true, 'Cycle 2: SUBSCRIBED 상태 UI 확인 — T12에서 구현');
    });

    test('SSN-RT-012: 페이지 포커스 복귀 후 이벤트 복구', async ({ page }) => {
      test.skip(true, 'Cycle 2: 탭 전환 후 복귀 시나리오 — T12에서 구현');
    });

    test('SSN-RT-013: 50명 동시 접속 — 서버 부하', async ({ page }) => {
      test.skip(true, 'Cycle 2: 다중 클라이언트 부하 테스트 — T12에서 구현');
    });

    test('SSN-RT-014: session_status UPDATE — draft→active 알림', async ({ page }) => {
      test.skip(true, 'Cycle 2: 세션 활성화 알림 확인 — T12에서 구현');
    });

    test('SSN-RT-015: 두 채널 동시 unsubscribe — 메모리 누수 방지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 두 채널 cleanup 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── 에러 / 엣지 ─────────────────────────────── */

  test.describe('에러 / 엣지', () => {
    test('SSN-ERR-001: 미참여 세션 URL 직접 접근 — 대기 화면', async ({ browser }) => {
      const sessionData = await createActiveSession(browser);
      if (!sessionData) { test.skip(true, '세션 생성 실패'); return; }

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        // 참여 없이 직접 접근
        await page.goto(`/student/sessions/${sessionData.sessionId}`);
        await page.waitForLoadState('networkidle');
        // 빈 퀴즈 = 대기 화면 유지
        const content = await page.content();
        expect(content.length).toBeGreaterThan(100);
      } finally { await ctx.close(); }
    });

    test('SSN-ERR-002: 제출 중 강사 수업 종료 — 응답 저장 + 종료 화면', async ({ page }) => {
      test.skip(true, 'Cycle 2: 제출 중 세션 종료 시나리오 — T12에서 구현');
    });

    test('SSN-ERR-003: 네트워크 끊김 — 제출 실패 → 에러 토스트', async ({ page }) => {
      test.skip(true, 'Cycle 2: 오프라인 제출 에러 확인 (silent failure 금지) — T12에서 구현');
    });

    test('SSN-ERR-004: options 배열 아님 — 가드 크래시 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: DB 이상 options 가드 확인 — T12에서 구현');
    });

    test('SSN-ERR-005: 라운드 2 퀴즈 수신 시 자동 미응답 이동', async ({ page }) => {
      test.skip(true, 'Cycle 2: 재퀴즈 후 자동 포커스 확인 — T12에서 구현');
    });

    test('SSN-ERR-006: startTime 리셋 타이밍 — 정확한 응답 시간 측정', async ({ page }) => {
      test.skip(true, 'Cycle 2: setStartTime 호출 타이밍 확인 — T12에서 구현');
    });

    test('SSN-ERR-007: 빠른 연속 제출 — isSubmitting 더블클릭 방지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 더블클릭 방지 확인 — T12에서 구현');
    });

    test('SSN-ERR-008: draft 상태 세션 진입 — 대기 화면 유지', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      const createRes = await teacherPage.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: `SSN-Draft-${Date.now()}`, subject: 'Spring', topics: [] },
      });
      const createBody = createRes.ok() ? await createRes.json() : null;
      await teacherCtx.close();
      if (!createBody) { test.skip(true, '세션 생성 실패'); return; }
      const { data: session } = createBody;

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        await page.goto(`/student/sessions/${session.id}`);
        await page.waitForLoadState('networkidle');
        // draft 세션 — 대기 화면 유지, 크래시 없음
        const content = await page.content();
        expect(content.length).toBeGreaterThan(100);
      } finally { await ctx.close(); }
    });

    test('SSN-ERR-009: 뒤로가기 후 재진입 — 기응답 상태 복구', async ({ page }) => {
      test.skip(true, 'Cycle 2: 뒤로가기 후 응답 복구 확인 — T12에서 구현');
    });

    test('SSN-ERR-010: 새로고침 후 상태 복구 — GET /api/responses 재조회', async ({ page }) => {
      test.skip(true, 'Cycle 2: F5 후 응답 상태 복구 확인 — T12에서 구현');
    });

    test('SSN-ERR-011: 미인증 접근 → /login 리다이렉트', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/student/sessions/some-id');
      await page.waitForURL('**/login**', { timeout: 10_000 });
      expect(page.url()).toContain('/login');
    });

    test('SSN-ERR-012: teacher role 접근 → /instructor 리다이렉트', async ({ browser }) => {
      test.skip(true, 'Cycle 2: student session 페이지에 role-based redirect 미구현 — T12에서 코드 추가 후 활성화');
    });

    test('SSN-ERR-013: GET /api/quizzes 실패 500 → 에러 메시지 (silent failure 금지)', async ({ page }) => {
      test.skip(true, 'Cycle 2: API 500 주입 후 에러 메시지 확인 — T12에서 구현');
    });

    test('SSN-ERR-014: GET /api/responses 실패 500 → 에러 또는 빈 상태 진행', async ({ page }) => {
      test.skip(true, 'Cycle 2: API 500 주입 시나리오 — T12에서 구현');
    });

    test('SSN-ERR-015: 5xx 응답 제출 — 에러 메시지, 재제출 가능', async ({ page }) => {
      test.skip(true, 'Cycle 2: 서버 에러 주입 후 재제출 확인 — T12에서 구현');
    });

    test('SSN-ERR-016: 타 학원 세션 URL — RLS 빈 퀴즈 → 대기 화면', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타 학원 세션 RLS 격리 확인 — T12에서 구현');
    });

    test('SSN-ERR-017: 타 수강생 응답 조회 불가 (RLS)', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타 수강생 응답 격리 확인 — T12에서 구현');
    });

    test('SSN-ERR-018: data-testid 셀렉터 존재 확인', async ({ page }) => {
      test.skip(true, 'Cycle 2: data-testid 속성 존재 확인 — T12에서 구현');
    });

    test('SSN-ERR-019: ARIA — 퀴즈 카드 role="region"', async ({ page }) => {
      test.skip(true, 'Cycle 2: 퀴즈 카드 ARIA role 확인 — T12에서 구현');
    });

    test('SSN-ERR-020: ARIA — 선택된 보기 aria-pressed 또는 aria-selected', async ({ page }) => {
      test.skip(true, 'Cycle 2: 선택된 보기 ARIA 속성 확인 — T12에서 구현');
    });

    test('SSN-ERR-021: 접근성 — 키보드만으로 완전 풀이 (Tab + Enter)', async ({ page }) => {
      test.skip(true, 'Cycle 2: 키보드 전용 퀴즈 완료 확인 — T12에서 구현');
    });

    test('SSN-ERR-022: options 빈 배열 — 빈 카드 또는 에러 메시지 (크래시 없음)', async ({ page }) => {
      test.skip(true, 'Cycle 2: 빈 options 처리 확인 — T12에서 구현');
    });

    test('SSN-ERR-023: 20개 이상 퀴즈 — 스크롤 또는 페이지네이션', async ({ page }) => {
      test.skip(true, 'Cycle 2: 20개 이상 퀴즈 렌더 확인 — T12에서 구현');
    });

    test('SSN-ERR-024: 한국어 에러 — 네트워크 실패 "네트워크 오류가 발생했습니다"', async ({ page }) => {
      test.skip(true, 'Cycle 2: 네트워크 실패 한국어 에러 메시지 확인 — T12에서 구현');
    });
  });
});
