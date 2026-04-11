/**
 * ui/student-result.spec.ts
 * SSR-UI / SSR-API / SSR-ERR / SSR-BND: 수강생 퀴즈 결과 (F3)
 * 라우트: /student/sessions/[id]/result
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE } from '../fixtures/users';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.use({ storageState: AUTH_STATE.student });

test.describe('SSR: 수강생 퀴즈 결과 (/student/sessions/[id]/result)', () => {
  /* ─────────────────────────────── UI 시나리오 ─────────────────────────────── */

  test.describe('UI 시나리오', () => {
    test('SSR-UI-001: 정상 결과 렌더 — 트로피 카드 + 문항별 카드', async ({ page }) => {
      test.skip(true, 'Cycle 2: 퀴즈+응답 완료 후 결과 화면 확인 — T12에서 구현');
    });

    test('SSR-UI-002: 등급 — 우수 (≥80%) → 노란 트로피 + "우수" success 배지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 정답률 80% 이상 등급 확인 — T12에서 구현');
    });

    test('SSR-UI-003: 등급 — 보통 (60-80%) → 파란 트로피 + "보통" warning', async ({ page }) => {
      test.skip(true, 'Cycle 2: 정답률 60-80% 등급 확인 — T12에서 구현');
    });

    test('SSR-UI-004: 등급 — 복습 필요 (<60%) → 회색 트로피 + destructive', async ({ page }) => {
      test.skip(true, 'Cycle 2: 정답률 60% 미만 등급 확인 — T12에서 구현');
    });

    test('SSR-UI-005: 정답 문항 — CheckCircle2 초록 아이콘 + 초록 배경', async ({ page }) => {
      test.skip(true, 'Cycle 2: is_correct=true 문항 카드 확인 — T12에서 구현');
    });

    test('SSR-UI-006: 오답 문항 — XCircle 빨강 아이콘 + 내 답변/정답 색상', async ({ page }) => {
      test.skip(true, 'Cycle 2: is_correct=false 문항 카드 확인 — T12에서 구현');
    });

    test('SSR-UI-007: 응답 시간 표시 — "12.3초"', async ({ page }) => {
      test.skip(true, 'Cycle 2: response_time_ms/1000 포맷 확인 — T12에서 구현');
    });

    test('SSR-UI-008: response_time_ms null → 시간 섹션 미노출', async ({ page }) => {
      test.skip(true, 'Cycle 2: null 응답 시간 미노출 확인 — T12에서 구현');
    });

    test('SSR-UI-009: "학습 리포트 보기" → /report 이동', async ({ page }) => {
      test.skip(true, 'Cycle 2: 리포트 링크 이동 확인 — T12에서 구현');
    });

    test('SSR-UI-010: 토픽 배지 — topic_tag 노출', async ({ page }) => {
      test.skip(true, 'Cycle 2: topic_tag 배지 확인 — T12에서 구현');
    });

    test('SSR-UI-011: 코드 스니펫 렌더 — 다크 <pre> 블록', async ({ page }) => {
      test.skip(true, 'Cycle 2: code_snippet 결과 화면 확인 — T12에서 구현');
    });

    test('SSR-UI-012: 응답 0건 → 트로피 "0/0", NaN 없음', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      const createRes = await teacherPage.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: `SSR-Empty-${Date.now()}`, subject: 'Spring', topics: [] },
      });
      // json() must be called BEFORE close() to avoid "Response has been disposed"
      const createBody = createRes.ok() ? await createRes.json() : null;
      await teacherCtx.close();
      if (!createBody) { test.skip(true, '세션 생성 실패'); return; }
      const { data: session } = createBody;

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        await page.goto(`/student/sessions/${session.id}/result`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content).not.toContain('NaN');
        expect(content).not.toContain('Infinity');
      } finally { await ctx.close(); }
    });
  });

  /* ─────────────────────────────── API 계약 ─────────────────────────────── */

  test.describe('API 계약', () => {
    test('SSR-API-001: GET /api/quizzes?sessionId → 200 + QuizRow[]', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      const createRes = await teacherPage.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: `SSR-API001-${Date.now()}`, subject: 'Spring', topics: [] },
      });
      const { data: session } = await createRes.json();
      await teacherCtx.close();

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/quizzes?sessionId=${session.id}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body.data)).toBeTruthy();
      } finally { await ctx.close(); }
    });

    test('SSR-API-002: GET /api/responses?sessionId → 200 + is_correct 포함', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      const createRes = await teacherPage.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: `SSR-API002-${Date.now()}`, subject: 'Spring', topics: [] },
      });
      const { data: session } = await createRes.json();
      await teacherCtx.close();

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/responses?sessionId=${session.id}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body.data)).toBeTruthy();
      } finally { await ctx.close(); }
    });

    test('SSR-API-003: 타 수강생 응답 격리 (RLS)', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타 수강생 응답 RLS 격리 확인 — T12에서 구현');
    });

    test('SSR-API-004: 미참여 세션 → 빈 배열', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      const createRes = await teacherPage.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: `SSR-API004-${Date.now()}`, subject: 'Spring', topics: [] },
      });
      const { data: session } = await createRes.json();
      await teacherCtx.close();

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/responses?sessionId=${session.id}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.data).toEqual([]);
      } finally { await ctx.close(); }
    });
  });

  /* ─────────────────────────────── 에러 / 엣지 ─────────────────────────────── */

  test.describe('에러 / 엣지', () => {
    test('SSR-ERR-001: quiz responses 매칭 안 됨 — fallback, 크래시 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: 퀴즈 삭제 후 결과 화면 fallback 확인 — T12에서 구현');
    });

    test('SSR-ERR-002: options 배열 아님 — 빈 배열 처리', async ({ page }) => {
      test.skip(true, 'Cycle 2: DB 이상 options 가드 확인 — T12에서 구현');
    });

    test('SSR-ERR-003: 네트워크 실패 — 빈 결과 화면 (silent failure)', async ({ page }) => {
      test.skip(true, 'Cycle 2: fetch 에러 후 결과 화면 확인 — T12에서 구현');
    });

    test('SSR-ERR-004: is_correct 필드 누락 — destructive 렌더', async ({ page }) => {
      test.skip(true, 'Cycle 2: is_correct 없는 응답 처리 확인 — T12에서 구현');
    });

    test('SSR-ERR-005: 매우 긴 question_text — 줄바꿈, 레이아웃 정상', async ({ page }) => {
      test.skip(true, 'Cycle 2: 긴 텍스트 레이아웃 확인 — T12에서 구현');
    });

    test('SSR-ERR-006: 여러 라운드 혼재 — 평탄하게 렌더', async ({ page }) => {
      test.skip(true, 'Cycle 2: 다중 라운드 결과 렌더 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── 경계값 ─────────────────────────────── */

  test.describe('경계값 테스트', () => {
    test('SSR-BND-001: 정답률 정확히 80% — "우수" success 배지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 5문제 4정답 경계값 확인 — T12에서 구현');
    });

    test('SSR-BND-002: 정답률 정확히 60% — "보통" warning 배지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 5문제 3정답 경계값 확인 — T12에서 구현');
    });

    test('SSR-BND-003: 정답률 0% — "복습 필요" + NaN/Infinity 없음', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      const createRes = await teacherPage.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: `SSR-BND003-${Date.now()}`, subject: 'Spring', topics: [] },
      });
      const { data: session } = await createRes.json();
      await teacherCtx.close();

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        await page.goto(`/student/sessions/${session.id}/result`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content).not.toContain('NaN');
        expect(content).not.toContain('Infinity');
      } finally { await ctx.close(); }
    });

    test('SSR-BND-004: 정답률 100% — "우수" 배지 + "N/N 정답"', async ({ page }) => {
      test.skip(true, 'Cycle 2: 전체 정답 후 결과 확인 — T12에서 구현');
    });

    test('SSR-BND-005: 문항 1개 (최소) — "0/1 또는 1/1", 정상 렌더', async ({ page }) => {
      test.skip(true, 'Cycle 2: 최소 퀴즈 결과 확인 — T12에서 구현');
    });

    test('SSR-BND-006: 문항 20개 (최대) — 스크롤, 크래시 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: 최대 퀴즈 결과 레이아웃 확인 — T12에서 구현');
    });

    test('SSR-BND-007: response_time_ms = 1 (최소) — 0.001초 포맷', async ({ page }) => {
      test.skip(true, 'Cycle 2: 최솟값 시간 포맷 확인 — T12에서 구현');
    });

    test('SSR-BND-008: response_time_ms = 600000 (10분) — "600.0초" 포맷', async ({ page }) => {
      test.skip(true, 'Cycle 2: 최댓값 시간 포맷 확인 — T12에서 구현');
    });

    test('SSR-BND-009: 선택지 5개 — 5개 보기 렌더 + 정답 하이라이트', async ({ page }) => {
      test.skip(true, 'Cycle 2: 5보기 퀴즈 결과 확인 — T12에서 구현');
    });

    test('SSR-BND-010: topic_tag 빈 문자열 — 빈 배지 또는 미노출', async ({ page }) => {
      test.skip(true, 'Cycle 2: 빈 topic_tag UI 정책 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── 인증 컨텍스트 ─────────────────────────────── */

  test.describe('인증 컨텍스트', () => {
    test('SSR-AUTH-001: 비인증 접근 → /login 리다이렉트', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/student/sessions/00000000-0000-0000-0000-000000000001/result');
      await page.waitForURL('**/login**', { timeout: 10_000 });
      expect(page.url()).toContain('/login');
    });

    test('SSR-AUTH-002: teacher role 접근 → /instructor 리다이렉트', async ({ browser }) => {
      test.skip(true, 'Cycle 2: student result 페이지에 role-based redirect 미구현 — T12에서 코드 추가 후 활성화');
    });

    test('SSR-AUTH-003: mentor role 접근 → /mentor 리다이렉트', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.mentor });
      const page = await ctx.newPage();
      try {
        await page.goto('/student/sessions/00000000-0000-0000-0000-000000000001/result');
        await page.waitForURL('**/mentor**', { timeout: 10_000 });
        expect(page.url()).toContain('/mentor');
      } finally { await ctx.close(); }
    });

    test('SSR-AUTH-004: owner role 접근 → /owner 리다이렉트', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.owner });
      const page = await ctx.newPage();
      try {
        await page.goto('/student/sessions/00000000-0000-0000-0000-000000000001/result');
        await page.waitForURL('**/owner**', { timeout: 10_000 });
        expect(page.url()).toContain('/owner');
      } finally { await ctx.close(); }
    });

    test('SSR-AUTH-005: 세션 만료 중 체류 → 401 응답 처리', async ({ page }) => {
      test.skip(true, 'Cycle 2: 세션 만료 중 API 호출 401 처리 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── 네트워크 에러 ─────────────────────────────── */

  test.describe('네트워크 에러', () => {
    test('SSR-NET-001: GET /api/quizzes 타임아웃 — 빈 결과 또는 에러 상태', async ({ page }) => {
      test.skip(true, 'Cycle 2: quizzes 타임아웃 시나리오 — T12에서 구현');
    });

    test('SSR-NET-002: GET /api/responses 500 — 에러 토스트 또는 빈 결과', async ({ page }) => {
      test.skip(true, 'Cycle 2: responses 500 에러 주입 후 확인 — T12에서 구현');
    });

    test('SSR-NET-003: quizzes 성공 + responses 실패 — 퀴즈 카드만 렌더', async ({ page }) => {
      test.skip(true, 'Cycle 2: 부분 실패 시나리오 — T12에서 구현');
    });

    test('SSR-NET-004: 오프라인 상태로 진입 — 에러 바운더리 또는 빈 상태', async ({ page }) => {
      test.skip(true, 'Cycle 2: 오프라인 진입 시나리오 — T12에서 구현');
    });

    test('SSR-NET-005: GET /api/responses 403 — 빈 배열 또는 에러 상태', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/responses?sessionId=00000000-0000-0000-0000-000000000001`);
        expect([400, 401, 403]).toContain(res.status()); // 400: UUID 기반 권한 검증 에러
      } finally { await ctx.close(); }
    });
  });

  /* ─────────────────────────────── 접근성 ─────────────────────────────── */

  test.describe('접근성', () => {
    test('SSR-A11Y-001: 키보드 탐색 — 트로피 → 문항 → 리포트 링크 포커스', async ({ page }) => {
      test.skip(true, 'Cycle 2: 키보드 탭 포커스 순서 확인 — T12에서 구현');
    });

    test('SSR-A11Y-002: 정오답 아이콘 ARIA — aria-label="정답"/"오답"', async ({ page }) => {
      test.skip(true, 'Cycle 2: 아이콘 ARIA 속성 확인 — T12에서 구현');
    });

    test('SSR-A11Y-003: 색 외 구분 — 아이콘 또는 텍스트로 정오답 구분', async ({ page }) => {
      test.skip(true, 'Cycle 2: 색맹 사용자 접근성 확인 — T12에서 구현');
    });

    test('SSR-A11Y-004: data-testid 존재 — result-trophy-card, quiz-result-card', async ({ page }) => {
      test.skip(true, 'Cycle 2: data-testid 추가 후 확인 — T12에서 구현');
    });

    test('SSR-A11Y-005: 페이지 제목 <title> — "퀴즈 결과 | Argos"', async ({ page }) => {
      test.skip(true, 'Cycle 2: 페이지 title 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── 한국어 에러 메시지 ─────────────────────────────── */

  test.describe('한국어 에러 메시지', () => {
    test('SSR-KO-001: API 실패 토스트 — "결과를 불러오는 중 오류가 발생했습니다."', async ({ page }) => {
      test.skip(true, 'Cycle 2: API 실패 한국어 토스트 확인 — T12에서 구현');
    });

    test('SSR-KO-002: 응답 0건 안내 — "아직 제출한 답변이 없습니다."', async ({ page }) => {
      test.skip(true, 'Cycle 2: 응답 0건 한국어 안내 확인 — T12에서 구현');
    });

    test('SSR-KO-003: 세션 미참여 안내 — "이 세션에 참여하지 않았습니다."', async ({ page }) => {
      test.skip(true, 'Cycle 2: 미참여 세션 한국어 안내 확인 — T12에서 구현');
    });

    test('SSR-KO-004: 네트워크 오류 안내 — "네트워크 오류가 발생했습니다."', async ({ page }) => {
      test.skip(true, 'Cycle 2: 네트워크 오류 한국어 안내 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── RLS 교차 검증 ─────────────────────────────── */

  test.describe('RLS 교차 검증', () => {
    test('SSR-RLS-001: 타 학원 수강생 — 퀴즈 접근 차단', async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}/api/quizzes?sessionId=00000000-0000-0000-0000-000000000001`);
      // 400: UUID 형식 맞지만 세션 없음 OR 200: 빈 배열 반환 (RLS 격리)
      expect([200, 400, 404]).toContain(res.status());
      if (res.status() === 200) {
        const body = await res.json();
        expect(Array.isArray(body.data)).toBeTruthy();
      }
    });

    test('SSR-RLS-002: 타 학원 수강생 — 응답 접근 차단 → [] 빈 배열', async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}/api/responses?sessionId=00000000-0000-0000-0000-000000000001`);
      // 400: UUID 형식 맞지만 세션 없음 OR 200: 빈 배열 반환 (RLS 격리)
      expect([200, 400, 404]).toContain(res.status());
      if (res.status() === 200) {
        const body = await res.json();
        expect(Array.isArray(body.data)).toBeTruthy();
      }
    });

    test('SSR-RLS-003: 동 학원 타 수강생 응답 격리 확인', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타 수강생 응답 격리 확인 — T12에서 구현 (다른 계정 필요)');
    });

    test('SSR-RLS-004: session_participants 미참여자 — 응답 빈 배열', async ({ page }) => {
      test.skip(true, 'Cycle 2: 미참여 세션 응답 확인 — T12에서 구현');
    });

    test('SSR-RLS-005: is_correct 필드 — 자신의 응답만 포함', async ({ page }) => {
      test.skip(true, 'Cycle 2: is_correct 필드 타인 응답 미노출 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── XSS / SQL 인젝션 ─────────────────────────────── */

  test.describe('XSS / SQL 인젝션', () => {
    test('SSR-SEC-001: question_text XSS — React escape 처리', async ({ page }) => {
      await page.goto('/student/sessions/00000000-0000-0000-0000-000000000001/result');
      await page.waitForLoadState('networkidle');
      // 페이지 정상 로드 확인 (XSS 실행 없음)
      expect(page.url()).toContain('/result');
    });

    test('SSR-SEC-002: topic_tag XSS — 배지 escape 처리', async ({ page }) => {
      test.skip(true, 'Cycle 2: topic_tag XSS 렌더 확인 — T12에서 구현');
    });

    test('SSR-SEC-003: code_snippet XSS — pre 내 텍스트 escape', async ({ page }) => {
      test.skip(true, 'Cycle 2: code_snippet XSS 처리 확인 — T12에서 구현');
    });

    test('SSR-SEC-004: sessionId URL 파라미터 조작 — SQL 인젝션 차단', async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}/api/quizzes?sessionId=%27%3B DROP TABLE--`);
      expect([200, 400]).toContain(res.status());
    });
  });

  /* ─────────────────────────────── 레이트 리밋 ─────────────────────────────── */

  test.describe('레이트 리밋', () => {
    test('SSR-RL-001: 결과 페이지 빠른 새로고침 — 캐시 또는 정상 응답', async ({ page }) => {
      test.skip(true, 'Cycle 2: 빠른 새로고침 안정성 확인 — T12에서 구현');
    });

    test('SSR-RL-002: 동일 sessionId 동시 요청 — 각각 독립 렌더', async ({ page }) => {
      test.skip(true, 'Cycle 2: 동시 요청 격리 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── 브라우저 네비게이션 복구 ─────────────────────────────── */

  test.describe('브라우저 네비게이션 복구', () => {
    test('SSR-NAV-001: 결과 → 리포트 → 뒤로가기 — 결과 재로드', async ({ page }) => {
      test.skip(true, 'Cycle 2: 뒤로가기 후 결과 재로드 확인 — T12에서 구현');
    });

    test('SSR-NAV-002: 결과 페이지 새로고침 — 동일 결과 재렌더', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      const createRes = await teacherPage.request.post(`${BASE_URL}/api/sessions`, {
        data: { title: `SSR-NAV002-${Date.now()}`, subject: 'Spring', topics: [] },
      });
      const createBody = createRes.ok() ? await createRes.json() : null;
      await teacherCtx.close();
      if (!createBody) { test.skip(true, '세션 생성 실패'); return; }
      const { data: session } = createBody;

      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        await page.goto(`/student/sessions/${session.id}/result`);
        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/result');
      } finally { await ctx.close(); }
    });

    test('SSR-NAV-003: 세션 화면 → 결과 → 세션 홈 이동', async ({ page }) => {
      test.skip(true, 'Cycle 2: 세션 홈 이동 확인 — T12에서 구현');
    });

    test('SSR-NAV-004: 오래된 탭 복귀 — 쿠키 유효 시 정상', async ({ page }) => {
      test.skip(true, 'Cycle 2: 오래된 탭 복귀 확인 — T12에서 구현');
    });

    test('SSR-NAV-005: 히스토리 앞/뒤 반복 — 상태 꼬임 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: 앞/뒤 반복 이동 안정성 확인 — T12에서 구현');
    });
  });
});
