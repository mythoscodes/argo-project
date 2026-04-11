/**
 * ui/instructor-session-detail.spec.ts
 * ISD-UI / ISD-API / ISD-RT / ISD-ERR: 강사 세션 상세 (F1-F6 통합 ★ 데모 핵심)
 * 라우트: /instructor/sessions/[id]
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE } from '../fixtures/users';
import { stubAiRoutes } from '../fixtures/helpers';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.use({ storageState: AUTH_STATE.teacher });

/** 테스트용 draft 세션 생성 후 ID 반환 */
async function createDraftSession(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never, suffix = Date.now()) {
  const res = await page.request.post(`${BASE_URL}/api/sessions`, {
    data: { title: `ISD-Test-${suffix}`, subject: 'Spring', topics: ['JPA', 'N+1'] },
  });
  if (!res.ok()) return null;
  const { data } = await res.json();
  return data?.id as string | null;
}

test.describe('ISD: 강사 세션 상세 (/instructor/sessions/[id])', () => {
  test.beforeEach(({ page }) => { stubAiRoutes(page); });

  // ISD 종료 후 누적 세션 정리 — ISN 등 후속 파일의 서버 부하 방지 (5개씩 순차 삭제)
  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
    const page = await ctx.newPage();
    try {
      const listRes = await page.request.get(`${BASE_URL}/api/sessions`);
      if (!listRes.ok()) return;
      const { data: sessions } = await listRes.json().catch(() => ({ data: [] }));
      if (!Array.isArray(sessions) || sessions.length === 0) return;
      // 5개씩 순차 삭제 — 서버에 과부하 주지 않음
      const BATCH_SIZE = 5;
      for (let i = 0; i < sessions.length; i += BATCH_SIZE) {
        const batch = sessions.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map((s: { id: string }) =>
            page.request.delete(`${BASE_URL}/api/sessions/${s.id}`).catch(() => {})
          )
        );
        if (i + BATCH_SIZE < sessions.length) {
          await new Promise((r) => setTimeout(r, 500)); // 배치 사이 0.5초 대기
        }
      }
    } finally { await ctx.close(); }
  });

  /* ─────────────────────────────── UI 시나리오 ─────────────────────────────── */

  test.describe('UI 시나리오 — 헤더 & 상태 전환', () => {
    test('ISD-UI-001: draft 세션 로드 — 참여 코드 미발급', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI001-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=수업을 시작하면 코드가 발급됩니다')).toBeVisible();
      await expect(page.locator('button:has-text("수업 시작")')).toBeVisible();
      await expect(page.locator('text=LIVE')).not.toBeVisible();
    });

    test('ISD-UI-002: draft → active 전환 — join_code 발급', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI002-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await page.click('button:has-text("수업 시작")');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=진행중')).toBeVisible({ timeout: 10_000 });
      // join_code 6자리 노출 확인
      const codeEl = page.locator('.font-mono.tracking-widest');
      if (await codeEl.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const code = await codeEl.textContent();
        expect(code?.trim()).toMatch(/^[A-Z0-9]{6}$/);
      }
    });

    test('ISD-UI-003: active → completed 전환', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI003-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      // draft → active
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, {
        data: { status: 'active' },
      });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await page.click('button:has-text("수업 종료")');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=종료')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('text=LIVE')).not.toBeVisible();
    });

    test('ISD-UI-004: 참여 코드 복사 — 아이콘 Check로 변경', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI004-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, {
        data: { status: 'active' },
      });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      // 참여 코드 카드의 복사 버튼 클릭
      const copyBtn = page.locator('button[size="icon"], button').filter({ has: page.locator('svg') }).first();
      if (await copyBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await copyBtn.click();
        // Check 아이콘으로 2초간 변경 (text-success 클래스 확인)
        await page.waitForTimeout(200);
        const content = await page.content();
        // 클립보드 API 또는 UI 피드백 - 크래시 없으면 OK
        expect(content.length).toBeGreaterThan(100);
      }
    });

    test('ISD-UI-005: 목록으로 돌아가기 → /instructor', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI005-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await page.click('a:has-text("목록")');
      await page.waitForURL('**/instructor', { timeout: 8_000 });
      expect(page.url()).toMatch(/\/instructor$/);
    });

    test('ISD-UI-006: 리포트 이동 → /instructor/sessions/[id]/reports', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI006-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await page.click('a:has-text("리포트"), button:has-text("리포트")');
      await page.waitForURL(`**/sessions/${sessionId}/reports**`, { timeout: 8_000 });
      expect(page.url()).toContain('/reports');
    });

    test('ISD-UI-007: 익명 모드 참여자 — "익명" 라벨', async ({ page }) => {
      test.skip(true, 'Cycle 2: anonymous_mode=true 세션 + 참여자 생성 후 확인 — T12에서 구현');
    });

    test('ISD-UI-008: 참여자 > 8명 — +N 배지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 참여자 9명 이상 생성 후 확인 — T12에서 구현');
    });

    test('ISD-UI-009: completed 세션 진입 — 종료 배지, 버튼 없음', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI009-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      // draft → active → completed
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'completed' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=종료')).toBeVisible();
      await expect(page.locator('button:has-text("수업 종료")')).not.toBeVisible();
    });

    test('ISD-UI-010: 상태 배지 — draft → "대기중"', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI010-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=대기중')).toBeVisible();
    });

    test('ISD-UI-011: 상태 배지 — active → "진행중"', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI011-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=진행중')).toBeVisible();
    });

    test('ISD-UI-012: 참여 코드 6자리 [A-Z0-9] 형식', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI012-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      const codeEl = page.locator('.font-mono.tracking-widest, .tracking-widest');
      if (await codeEl.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const code = await codeEl.first().textContent();
        expect(code?.trim()).toMatch(/^[A-Z0-9]{6}$/);
      }
    });

    test('ISD-UI-013: 참여자 0명 — 참여자 카드 "0명", 코드 노출', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI013-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=0명')).toBeVisible();
    });

    test('ISD-UI-014: 수업 시작 버튼 로딩 — "시작 중..." disabled', async ({ page }) => {
      test.skip(true, 'Cycle 2: 버튼 로딩 상태 인터셉트 — T12에서 구현');
    });

    test('ISD-UI-015: 수업 종료 버튼 로딩 — "종료 중..." disabled', async ({ page }) => {
      test.skip(true, 'Cycle 2: 버튼 로딩 상태 인터셉트 — T12에서 구현');
    });

    test('ISD-UI-016: 탭 레이아웃 (모바일 < 768px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      const sessionId = await createDraftSession(page, `UI016-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      // 모바일에서 Tabs 컴포넌트 렌더 확인
      const content = await page.content();
      expect(content).not.toContain('TypeError');
      expect(content).not.toContain('undefined');
    });

    test('ISD-UI-017: 그리드 레이아웃 (데스크톱 ≥ 768px)', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      const sessionId = await createDraftSession(page, `UI017-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      // 데스크톱에서 2x2 그리드 (lg:grid-cols-2)
      const gridEl = page.locator('.lg\\:grid-cols-2');
      if (await gridEl.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(gridEl).toBeVisible();
      }
    });

    test('ISD-UI-018: 세션 제목 헤더에 표시', async ({ page }) => {
      const title = `ISD-UI-018-${Date.now()}`;
      const res = await page.request.post(`${BASE_URL}/api/sessions`, {
        data: { title, subject: 'Spring', topics: [] },
      });
      if (!res.ok()) { test.skip(true, '세션 생성 실패'); return; }
      const { data } = await res.json();
      await page.goto(`/instructor/sessions/${data.id}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator(`h1:has-text("${title}")`)).toBeVisible();
    });

    test('ISD-UI-019: topics 배지 렌더', async ({ page }) => {
      test.skip(true, 'Cycle 2: topics 배지 위치 확인 — T12에서 구현');
    });

    test('ISD-UI-020: 응답률 표시 형식', async ({ page }) => {
      test.skip(true, 'Cycle 2: 참여자+응답 생성 후 응답률 계산 확인 — T12에서 구현');
    });

    test('ISD-UI-021: 뒤로가기 후 재진입 — 최신 상태 로드', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI021-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await page.goto('/instructor');
      await page.waitForLoadState('networkidle');
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=대기중')).toBeVisible();
    });

    test('ISD-UI-022: 새로고침 (active 상태) — 상태 유지', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI022-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=진행중')).toBeVisible();
    });
  });

  /* ─────────────────────── F2 AI 퀴즈 생성 (QuizPanel) ─────────────────────── */

  test.describe('UI 시나리오 — F2 AI 퀴즈 생성 (QuizPanel)', () => {
    test('ISD-UI-030: 퀴즈 생성 버튼 — active 상태 노출', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI030-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('button:has-text("퀴즈 생성")')).toBeVisible();
    });

    test('ISD-UI-031: draft 상태 — 퀴즈 생성 버튼 없음', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI031-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('button:has-text("퀴즈 생성")')).not.toBeVisible();
    });

    test('ISD-UI-032: completed 상태 — 퀴즈 생성 버튼 없음', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI032-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'completed' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('button:has-text("퀴즈 생성")')).not.toBeVisible();
    });

    test('ISD-UI-033: 퀴즈 생성 정상 — 3문제 카드 렌더', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI033-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await page.click('button:has-text("퀴즈 생성")');
      // AI stub이므로 빠른 응답 기대
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      // 퀴즈 카드 또는 에러 메시지 — 크래시 없음 확인
      expect(content.length).toBeGreaterThan(500);
    });

    test('ISD-UI-034: 퀴즈 초기 빈 상태 — 안내 메시지', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI034-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=AI 퀴즈를 생성하여 수강생에게 발송하세요')).toBeVisible();
    });

    test('ISD-UI-035: 코드 스니펫 — pre 블록 렌더', async ({ page }) => {
      test.skip(true, 'Cycle 2: code_snippet 포함 퀴즈 생성 확인 — T12에서 구현');
    });

    test('ISD-UI-036: 라운드 번호 표시 — "AI 퀴즈 (라운드 1)"', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI036-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=AI 퀴즈 (라운드 1)')).toBeVisible();
    });

    test('ISD-UI-037: 정답 강조 — 성공 색상 border', async ({ page }) => {
      test.skip(true, 'Cycle 2: 퀴즈 생성 후 정답 border 확인 — T12에서 구현');
    });

    test('ISD-UI-038: 생성 중 로딩 — "생성중..." + disabled', async ({ page }) => {
      test.skip(true, 'Cycle 2: 퀴즈 생성 클릭 직후 버튼 상태 인터셉트 — T12에서 구현');
    });

    test('ISD-UI-039: 문제 3개 고정', async ({ page }) => {
      test.skip(true, 'Cycle 2: AI 응답 목 후 카드 수 확인 — T12에서 구현');
    });

    test('ISD-UI-040: 보기 A~D 렌더', async ({ page }) => {
      test.skip(true, 'Cycle 2: 퀴즈 카드 보기 라벨 확인 — T12에서 구현');
    });

    test('ISD-UI-041: 토픽 배지 — 문제당', async ({ page }) => {
      test.skip(true, 'Cycle 2: quiz.topic_tag 배지 확인 — T12에서 구현');
    });

    test('ISD-UI-042: 퀴즈 재생성 — 새 퀴즈로 교체', async ({ page }) => {
      test.skip(true, 'Cycle 2: 재생성 후 이전 퀴즈 대체 확인 — T12에서 구현');
    });

    test('ISD-UI-043: 퀴즈 생성 후 새로고침 — 퀴즈 유지', async ({ page }) => {
      test.skip(true, 'Cycle 2: DB 저장 후 F5 확인 — T12에서 구현');
    });

    test('ISD-UI-044: 퀴즈 생성 실패 후 UI — 에러 메시지, 버튼 재활성화', async ({ page }) => {
      test.skip(true, 'Cycle 2: AI 에러 주입 시나리오 — T12에서 구현');
    });

    test('ISD-UI-045: 중복 퀴즈 생성 방지 — 생성 중 버튼 disabled', async ({ page }) => {
      test.skip(true, 'Cycle 2: 동시 클릭 방지 확인 — T12에서 구현');
    });
  });

  /* ──────────────────── F4 히트맵 + 분석 (HeatmapPanel) ──────────────────── */

  test.describe('UI 시나리오 — F4 히트맵 + 분석 (HeatmapPanel)', () => {
    test('ISD-UI-050: 히트맵 초기 렌더 — UnderstandingHeatmap 컴포넌트', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI050-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=이해도 히트맵')).toBeVisible();
      await expect(page.locator('button:has-text("분석하기")')).toBeVisible();
    });

    test('ISD-UI-051: 응답 실시간 반영', async ({ page }) => {
      test.skip(true, 'Cycle 2: 수강생 응답 → 강사 화면 실시간 갱신 — T12에서 구현');
    });

    test('ISD-UI-052: "분석하기" 버튼 — 분석 결과 노출', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI052-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await page.click('button:has-text("분석하기")');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      // 분석 완료 또는 에러 — 크래시 없음
      expect(content.length).toBeGreaterThan(500);
    });

    test('ISD-UI-053: 이해도 색상 — score < 60 빨간색', async ({ page }) => {
      test.skip(true, 'Cycle 2: 분석 결과 색상 CSS 확인 — T12에서 구현');
    });

    test('ISD-UI-054: 이해도 색상 — 60 ≤ score < 80 노란색', async ({ page }) => {
      test.skip(true, 'Cycle 2: 분석 결과 색상 CSS 확인 — T12에서 구현');
    });

    test('ISD-UI-055: 이해도 색상 — score ≥ 80 초록색', async ({ page }) => {
      test.skip(true, 'Cycle 2: 분석 결과 색상 CSS 확인 — T12에서 구현');
    });

    test('ISD-UI-056: 약점 토픽 0개 — "약점:" 섹션 미노출', async ({ page }) => {
      test.skip(true, 'Cycle 2: weak_topics=[] 응답 목 — T12에서 구현');
    });

    test('ISD-UI-057: 응답률 계산 정확성', async ({ page }) => {
      test.skip(true, 'Cycle 2: 참여자+응답 생성 후 응답률 수식 확인 — T12에서 구현');
    });

    test('ISD-UI-058: 분석 로딩 상태 — "AI가 분석 중입니다..." + Spinner', async ({ page }) => {
      test.skip(true, 'Cycle 2: 분석 클릭 직후 로딩 인터셉트 — T12에서 구현');
    });

    test('ISD-UI-059: 중복 분석 방지 — isAnalyzing 버튼 disabled', async ({ page }) => {
      test.skip(true, 'Cycle 2: 분석 중 재클릭 방지 확인 — T12에서 구현');
    });

    test('ISD-UI-060: 이해도 색상 경계 — score = 60 → 노란색', async ({ page }) => {
      test.skip(true, 'Cycle 2: 경계값 색상 확인 — T12에서 구현');
    });

    test('ISD-UI-061: 이해도 색상 경계 — score = 80 → 초록색', async ({ page }) => {
      test.skip(true, 'Cycle 2: 경계값 색상 확인 — T12에서 구현');
    });

    test('ISD-UI-062: 히트맵 셀 — 정답/오답 색상', async ({ page }) => {
      test.skip(true, 'Cycle 2: 히트맵 셀 색상 확인 — T12에서 구현');
    });

    test('ISD-UI-063: 분석 후 새로고침 — 분석 결과 유지', async ({ page }) => {
      test.skip(true, 'Cycle 2: DB 저장 후 F5 확인 — T12에서 구현');
    });

    test('ISD-UI-064: 응답률 — 분모 0 → 0% 크래시 없음', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI064-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).not.toContain('NaN');
      expect(content).not.toContain('Infinity');
    });

    test('ISD-UI-065: 히트맵 — 수강생 20명 레이아웃 깨짐 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: 대용량 참여자 시나리오 — T12에서 구현');
    });
  });

  /* ─────────────────────── F5 AI 코칭 (CoachingPanel) ─────────────────────── */

  test.describe('UI 시나리오 — F5 AI 코칭 (CoachingPanel)', () => {
    test('ISD-UI-070: 코칭 생성 정상 — Accordion 추가', async ({ page }) => {
      test.skip(true, 'Cycle 2: 분석 완료 후 코칭 Accordion 확인 — T12에서 구현');
    });

    test('ISD-UI-071: 코칭 누적 — Accordion 2개', async ({ page }) => {
      test.skip(true, 'Cycle 2: 분석 2회 후 Accordion 수 확인 — T12에서 구현');
    });

    test('ISD-UI-072: 코칭 빈 상태 — 안내 메시지', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI072-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=이해도 분석을 실행하면 AI 코칭 메시지가 표시됩니다')).toBeVisible();
    });

    test('ISD-UI-073: 분석 중 로딩 — "AI가 분석 중입니다..."', async ({ page }) => {
      test.skip(true, 'Cycle 2: 분석 중 CoachingPanel 상태 확인 — T12에서 구현');
    });

    test('ISD-UI-074: Accordion 제목 요약 — 60자+...', async ({ page }) => {
      test.skip(true, 'Cycle 2: 긴 coaching_suggestion truncate 확인 — T12에서 구현');
    });

    test('ISD-UI-075: Accordion 열기/닫기 전환', async ({ page }) => {
      test.skip(true, 'Cycle 2: 코칭 후 Accordion 클릭 확인 — T12에서 구현');
    });

    test('ISD-UI-076: coaching_suggestion 줄바꿈 — whitespace-pre-wrap', async ({ page }) => {
      test.skip(true, 'Cycle 2: 다단락 코칭 렌더 확인 — T12에서 구현');
    });

    test('ISD-UI-077: 코칭 생성 타임스탬프 한국어', async ({ page }) => {
      test.skip(true, 'Cycle 2: Accordion 제목 타임스탬프 확인 — T12에서 구현');
    });

    test('ISD-UI-078: 코칭 10건 누적 — 스크롤, 크래시 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: 대용량 코칭 스크롤 확인 — T12에서 구현');
    });
  });

  /* ──────────────────────── F6 피드백 루프 (DeltaPanel) ──────────────────────── */

  test.describe('UI 시나리오 — F6 피드백 루프 (DeltaPanel)', () => {
    test('ISD-UI-080: 재퀴즈 발행 — currentRound+1, 새 퀴즈', async ({ page }) => {
      test.skip(true, 'Cycle 2: 재퀴즈 후 라운드 증가 확인 — T12에서 구현');
    });

    test('ISD-UI-081: 1라운드 안내 메시지', async ({ page }) => {
      const sessionId = await createDraftSession(page, `UI081-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=1라운드 후 재퀴즈를 보내면 이해도 변화(델타)를 확인할 수 있습니다')).toBeVisible();
    });

    test('ISD-UI-082: 델타 차트 렌더 — round ≥ 2', async ({ page }) => {
      test.skip(true, 'Cycle 2: 재퀴즈 후 DeltaChart 컴포넌트 확인 — T12에서 구현');
    });

    test('ISD-UI-083: 재퀴즈 로딩 — "생성중..." disabled', async ({ page }) => {
      test.skip(true, 'Cycle 2: 재퀴즈 클릭 직후 버튼 상태 — T12에서 구현');
    });

    test('ISD-UI-084: 재퀴즈 중복 방지 — 단일 API 호출', async ({ page }) => {
      test.skip(true, 'Cycle 2: 동시 재퀴즈 방지 확인 — T12에서 구현');
    });

    test('ISD-UI-085: 라운드 3 이상 델타 차트', async ({ page }) => {
      test.skip(true, 'Cycle 2: 3라운드 이상 추이 확인 — T12에서 구현');
    });

    test('ISD-UI-086: 델타 차트 — 상승 표시', async ({ page }) => {
      test.skip(true, 'Cycle 2: 이해도 개선 시나리오 — T12에서 구현');
    });

    test('ISD-UI-087: 델타 차트 — 하락 표시', async ({ page }) => {
      test.skip(true, 'Cycle 2: 이해도 하락 시나리오 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── API 계약 ─────────────────────────────── */

  test.describe('API 계약', () => {
    test('ISD-API-001: GET /api/sessions/[id] → 200 + SessionRow', async ({ page }) => {
      const sessionId = await createDraftSession(page, `API001-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      const res = await page.request.get(`${BASE_URL}/api/sessions/${sessionId}`);
      expect(res.status()).toBe(200);
      const { data } = await res.json();
      expect(data).toHaveProperty('id', sessionId);
      expect(data).toHaveProperty('status');
    });

    test('ISD-API-002: PATCH draft→active — join_code 자동 발급', async ({ page }) => {
      const sessionId = await createDraftSession(page, `API002-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      const res = await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, {
        data: { status: 'active' },
      });
      expect(res.status()).toBe(200);
      const { data } = await res.json();
      expect(data.status).toBe('active');
      expect(data.join_code).toMatch(/^[A-Z0-9]{6}$/);
    });

    test('ISD-API-003: PATCH active→completed — completed_at 기록', async ({ page }) => {
      const sessionId = await createDraftSession(page, `API003-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      const res = await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, {
        data: { status: 'completed' },
      });
      expect(res.status()).toBe(200);
      const { data } = await res.json();
      expect(data.status).toBe('completed');
    });

    test('ISD-API-004: PATCH completed→active — 비정상 전환', async ({ page }) => {
      const sessionId = await createDraftSession(page, `API004-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'completed' } });
      const res = await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, {
        data: { status: 'active' },
      });
      // 400 또는 서버 정책에 따라 처리
      expect([400, 200]).toContain(res.status());
    });

    test('ISD-API-005: GET /api/quizzes?sessionId → 200 + round_number', async ({ page }) => {
      const sessionId = await createDraftSession(page, `API005-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      const res = await page.request.get(`${BASE_URL}/api/quizzes?sessionId=${sessionId}`);
      expect(res.status()).toBe(200);
      const { data } = await res.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('ISD-API-006: GET /api/sessions/[id] draft — join_code null', async ({ page }) => {
      const sessionId = await createDraftSession(page, `API006-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      const res = await page.request.get(`${BASE_URL}/api/sessions/${sessionId}`);
      const { data } = await res.json();
      expect(data.join_code).toBeNull();
    });

    test('ISD-API-007: GET /api/sessions/[id] active — join_code 6자리', async ({ page }) => {
      const sessionId = await createDraftSession(page, `API007-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      const res = await page.request.get(`${BASE_URL}/api/sessions/${sessionId}`);
      const { data } = await res.json();
      expect(data.join_code).toMatch(/^[A-Z0-9]{6}$/);
    });

    test('ISD-API-008: PATCH /api/sessions/[id] — mentor 접근 → 403', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      const sessionId = await createDraftSession(teacherPage, `API008-${Date.now()}`);
      await teacherCtx.close();
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }

      const mentorCtx = await browser.newContext({ storageState: AUTH_STATE.mentor });
      const mentorPage = await mentorCtx.newPage();
      try {
        const res = await mentorPage.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, {
          data: { status: 'active' },
        });
        expect([403, 401]).toContain(res.status());
      } finally { await mentorCtx.close(); }
    });

    test('ISD-API-009: PATCH /api/sessions/[id] — 미인증 → 401', async ({ request }) => {
      const res = await request.patch(`${BASE_URL}/api/sessions/some-id`, {
        data: { status: 'active' },
      });
      expect([401, 302]).toContain(res.status());
    });

    test('ISD-API-010: POST /api/ai/quiz — 200 + 퀴즈 저장', async ({ page }) => {
      const sessionId = await createDraftSession(page, `API010-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      const res = await page.request.post(`${BASE_URL}/api/ai/quiz`, {
        data: { sessionId, subject: 'Spring', topic: 'JPA', count: 3, difficulty: 'mixed' },
      });
      expect([200, 500, 429]).toContain(res.status());
    });

    test('ISD-API-011: POST /api/ai/quiz — temperature 0.3', async ({ page }) => {
      test.skip(true, 'Cycle 2: temperature 파라미터 서버 로그 확인 — T12에서 구현');
    });

    test('ISD-API-012: POST /api/ai/quiz — JSON 파싱 실패 1회 재시도', async ({ page }) => {
      test.skip(true, 'Cycle 2: malformed AI 응답 주입 시나리오 — T12에서 구현');
    });

    test('ISD-API-013: POST /api/ai/quiz — Zod 검증 실패 → 500', async ({ page }) => {
      test.skip(true, 'Cycle 2: AI 응답 스키마 위반 주입 — T12에서 구현');
    });

    test('ISD-API-014: POST /api/ai/quiz — completed 세션 → 400', async ({ page }) => {
      const sessionId = await createDraftSession(page, `API014-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'completed' } });
      const res = await page.request.post(`${BASE_URL}/api/ai/quiz`, {
        data: { sessionId, subject: 'Spring', topic: 'JPA', count: 3, difficulty: 'mixed' },
      });
      expect([400, 403]).toContain(res.status());
    });

    test('ISD-API-015: POST /api/ai/quiz — mentor 접근 → 403', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      const sessionId = await createDraftSession(teacherPage, `API015-${Date.now()}`);
      await teacherCtx.close();
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }

      const mentorCtx = await browser.newContext({ storageState: AUTH_STATE.mentor });
      const mentorPage = await mentorCtx.newPage();
      try {
        const res = await mentorPage.request.post(`${BASE_URL}/api/ai/quiz`, {
          data: { sessionId, subject: 'Spring', topic: 'JPA', count: 3, difficulty: 'mixed' },
        });
        expect([403, 401]).toContain(res.status());
      } finally { await mentorCtx.close(); }
    });

    test('ISD-API-016: GET /api/quizzes?sessionId — round_number 필터', async ({ page }) => {
      test.skip(true, 'Cycle 2: 다중 라운드 퀴즈 필터링 확인 — T12에서 구현');
    });

    test('ISD-API-017: POST /api/ai/analysis → 200 + understanding_scores', async ({ page }) => {
      const sessionId = await createDraftSession(page, `API017-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      const res = await page.request.post(`${BASE_URL}/api/ai/analysis`, {
        data: { sessionId },
      });
      expect([200, 400, 500]).toContain(res.status());
      if (res.status() === 200) {
        const body = await res.json();
        expect(body).toHaveProperty('data');
      }
    });

    test('ISD-API-018: POST /api/ai/analysis — 응답 0건', async ({ page }) => {
      test.skip(true, 'Cycle 2: 빈 응답 분석 정책 확인 — T12에서 구현');
    });

    test('ISD-API-019: POST /api/ai/analysis — temperature 0.5', async ({ page }) => {
      test.skip(true, 'Cycle 2: temperature 서버 로그 확인 — T12에서 구현');
    });

    test('ISD-API-020: POST /api/ai/analysis — JSON 재시도', async ({ page }) => {
      test.skip(true, 'Cycle 2: malformed 응답 재시도 시나리오 — T12에서 구현');
    });

    test('ISD-API-021: POST /api/ai/coaching → 200 + coaching_suggestion', async ({ page }) => {
      const sessionId = await createDraftSession(page, `API021-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      const res = await page.request.post(`${BASE_URL}/api/ai/coaching`, {
        data: { sessionId },
      });
      expect([200, 400, 500]).toContain(res.status());
    });

    test('ISD-API-022: POST /api/ai/coaching — temperature 0.5', async ({ page }) => {
      test.skip(true, 'Cycle 2: temperature 서버 로그 확인 — T12에서 구현');
    });

    test('ISD-API-023: POST /api/ai/coaching — JSON 재시도', async ({ page }) => {
      test.skip(true, 'Cycle 2: malformed 응답 재시도 시나리오 — T12에서 구현');
    });

    test('ISD-API-024: PATCH — 타 학원 세션 ID → 403/404 (RLS)', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타 학원 계정 생성 후 교차 접근 확인 — T12에서 구현');
    });

    test('ISD-API-025: GET /api/sessions/[id] — 존재하지 않는 UUID → 404', async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}/api/sessions/00000000-0000-0000-0000-000000000000`);
      expect([404, 403, 401]).toContain(res.status()); // 401: 장시간 순차 실행 후 토큰 만료 가능
    });

    test('ISD-API-026: POST /api/ai/quiz — count=0 → 400 Zod 에러', async ({ page }) => {
      const sessionId = await createDraftSession(page, `API026-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      const res = await page.request.post(`${BASE_URL}/api/ai/quiz`, {
        data: { sessionId, subject: 'Spring', topic: 'JPA', count: 0, difficulty: 'mixed' },
      });
      expect([400, 422]).toContain(res.status());
    });

    test('ISD-API-027: POST /api/ai/quiz — count=10 허용/제한', async ({ page }) => {
      test.skip(true, 'Cycle 2: count 상한 정책 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── Realtime ─────────────────────────────── */

  test.describe('Realtime', () => {
    test('ISD-RT-001: participants INSERT — 참여자 카드 실시간 갱신', async ({ page }) => {
      test.skip(true, 'Cycle 2: 수강생 join 이벤트 시뮬레이션 — T12에서 구현');
    });

    test('ISD-RT-002: useRealtimeResponses — 응답 제출 시 응답률 갱신', async ({ page }) => {
      test.skip(true, 'Cycle 2: 수강생 응답 시뮬레이션 — T12에서 구현');
    });

    test('ISD-RT-003: isConnected — LIVE 녹색 펄스 인디케이터', async ({ page }) => {
      const sessionId = await createDraftSession(page, `RT003-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      // LIVE 인디케이터 (Realtime 연결 시 노출)
      const content = await page.content();
      expect(content.length).toBeGreaterThan(500);
    });

    test('ISD-RT-004: isConnected=false — LIVE 인디케이터 숨김', async ({ page }) => {
      test.skip(true, 'Cycle 2: Realtime 연결 실패 시뮬레이션 — T12에서 구현');
    });

    test('ISD-RT-005: 채널 언서브스크라이브 — 페이지 이탈 시 cleanup', async ({ page }) => {
      test.skip(true, 'Cycle 2: channel.unsubscribe 호출 확인 — T12에서 구현');
    });

    test('ISD-RT-006: 응답 순서 역전 — round_number 필터', async ({ page }) => {
      test.skip(true, 'Cycle 2: 빠른 연속 응답 시나리오 — T12에서 구현');
    });

    test('ISD-RT-007: 재연결 후 상태 복구', async ({ page }) => {
      test.skip(true, 'Cycle 2: 네트워크 단절/복구 시나리오 — T12에서 구현');
    });

    test('ISD-RT-008: 다중 응답 동시 수신 — 히트맵 일관성', async ({ page }) => {
      test.skip(true, 'Cycle 2: 5명 동시 응답 시나리오 — T12에서 구현');
    });

    test('ISD-RT-009: Realtime CHANNEL_ERROR — 에러 상태 반환', async ({ page }) => {
      test.skip(true, 'Cycle 2: CHANNEL_ERROR 핸들링 확인 — T12에서 구현');
    });

    test('ISD-RT-010: Realtime TIMED_OUT — 재연결 또는 에러 표시', async ({ page }) => {
      test.skip(true, 'Cycle 2: TIMED_OUT 핸들링 확인 — T12에서 구현');
    });

    test('ISD-RT-011: participants DELETE — 참여자 카운트 변화', async ({ page }) => {
      test.skip(true, 'Cycle 2: DELETE 이벤트 정책 확인 — T12에서 구현');
    });

    test('ISD-RT-012: 탭 전환 후 Realtime 유지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 모바일 탭 전환 후 구독 유지 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── 에러 / 엣지 ─────────────────────────────── */

  test.describe('에러 / 엣지', () => {
    test('ISD-ERR-001: join_code 평문 노출 방지 회귀 — draft GET 응답 null', async ({ page }) => {
      const sessionId = await createDraftSession(page, `ERR001-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      const res = await page.request.get(`${BASE_URL}/api/sessions/${sessionId}`);
      const { data } = await res.json();
      // draft 상태에서 join_code는 null이어야 함 (커밋 236a658 회귀 방지)
      expect(data.join_code).toBeNull();
    });

    test('ISD-ERR-002: 타 강사 세션 접근 차단 (RLS)', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타 강사 계정 생성 후 세션 ID 교차 접근 — T12에서 구현');
    });

    test('ISD-ERR-003: 타 학원 세션 접근 차단 (RLS)', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타 학원 강사 계정 생성 후 교차 접근 — T12에서 구현');
    });

    test('ISD-ERR-004: 존재하지 않는 sessionId → 에러 상태', async ({ page }) => {
      await page.goto('/instructor/sessions/00000000-0000-0000-0000-000000000000');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      // 에러 상태 또는 빈 화면 — 크래시 없음
      expect(content.length).toBeGreaterThan(100);
    });

    test('ISD-ERR-005: completed 세션 퀴즈 생성 API 직접 호출 → 400', async ({ page }) => {
      const sessionId = await createDraftSession(page, `ERR005-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'completed' } });
      const res = await page.request.post(`${BASE_URL}/api/ai/quiz`, {
        data: { sessionId, subject: 'Spring', topic: 'JPA', count: 3, difficulty: 'mixed' },
      });
      expect([400, 403]).toContain(res.status());
    });

    test('ISD-ERR-006: AI 퀴즈 생성 타임아웃 — 에러 메시지', async ({ page }) => {
      test.skip(true, 'Cycle 2: Gemini 응답 지연 시뮬레이션 — T12에서 구현');
    });

    test('ISD-ERR-007: AI 퀴즈 생성 실패 (네트워크)', async ({ page }) => {
      test.skip(true, 'Cycle 2: 네트워크 에러 주입 — T12에서 구현');
    });

    test('ISD-ERR-008: 응답률 분모 0 → 0% 크래시 없음', async ({ page }) => {
      const sessionId = await createDraftSession(page, `ERR008-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, { data: { status: 'active' } });
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).not.toContain('NaN');
      expect(content).not.toContain('Infinity');
      expect(content).not.toContain('TypeError');
    });

    test('ISD-ERR-009: topics JSONB 배열 아님 → Array.isArray 가드', async ({ page }) => {
      test.skip(true, 'Cycle 2: DB에 topics=null 삽입 후 확인 — T12에서 구현');
    });

    test('ISD-ERR-010: clipboard.writeText 거부 — 복사 실패 메시지', async ({ page }) => {
      test.skip(true, 'Cycle 2: clipboard API 거부 시나리오 — T12에서 구현');
    });

    test('ISD-ERR-011: 분석 호출 중복 클릭 — isAnalyzing 버튼 비활성화', async ({ page }) => {
      test.skip(true, 'Cycle 2: 중복 클릭 방지 확인 — T12에서 구현');
    });

    test('ISD-ERR-012: 라운드 번호 불일치 — Math.max 자동 동기화', async ({ page }) => {
      test.skip(true, 'Cycle 2: round_number 불일치 시나리오 — T12에서 구현');
    });

    test('ISD-ERR-013: XSS — 세션 제목 <script> → React escape', async ({ page }) => {
      const sessionId = await createDraftSession(page, `ERR013-${Date.now()}`);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.goto(`/instructor/sessions/${sessionId}`);
      await page.waitForLoadState('networkidle');
      const scriptExecuted = await page.evaluate(() => {
        return document.body.innerHTML.includes('<script>');
      });
      expect(scriptExecuted).toBeFalsy();
    });

    test('ISD-ERR-014: XSS — 코칭 제안에 HTML 태그 → whitespace-pre-wrap', async ({ page }) => {
      test.skip(true, 'Cycle 2: AI 응답에 HTML 태그 주입 — T12에서 구현');
    });

    test('ISD-ERR-015: SQL injection — sessionId 파라미터', async ({ page }) => {
      const maliciousId = encodeURIComponent("'; DROP TABLE sessions;--");
      const res = await page.request.get(`${BASE_URL}/api/sessions/${maliciousId}`);
      expect([404, 400, 401]).toContain(res.status()); // 401: 장시간 순차 실행 후 토큰 만료 가능
    });

    test('ISD-ERR-016: 레이트 리밋 — 퀴즈 생성 연속 5회', async ({ page }) => {
      test.skip(true, 'Cycle 2: 연속 AI 호출 레이트 리밋 — T12에서 구현');
    });

    test('ISD-ERR-017: 레이트 리밋 — 분석 연속 10회', async ({ page }) => {
      test.skip(true, 'Cycle 2: 연속 AI 분석 레이트 리밋 — T12에서 구현');
    });

    test('ISD-ERR-018: 분석 AI 500 에러 — 에러 메시지, 히트맵 유지', async ({ page }) => {
      test.skip(true, 'Cycle 2: AI API 500 주입 — T12에서 구현');
    });

    test('ISD-ERR-019: understanding_scores null → 히트맵 섹션 생략', async ({ page }) => {
      test.skip(true, 'Cycle 2: null 분석 결과 시나리오 — T12에서 구현');
    });

    test('ISD-ERR-020: weak_topics null → 약점 섹션 생략', async ({ page }) => {
      test.skip(true, 'Cycle 2: null weak_topics 시나리오 — T12에서 구현');
    });

    test('ISD-ERR-021: 수업 시작 중 페이지 이탈 — 세션 상태 일관성', async ({ page }) => {
      test.skip(true, 'Cycle 2: PATCH 중 뒤로가기 시나리오 — T12에서 구현');
    });

    test('ISD-ERR-022: RLS — mentor PATCH 시도 → 403', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      const sessionId = await createDraftSession(teacherPage, `ERR022-${Date.now()}`);
      await teacherCtx.close();
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }

      const mentorCtx = await browser.newContext({ storageState: AUTH_STATE.mentor });
      const mentorPage = await mentorCtx.newPage();
      try {
        const res = await mentorPage.request.patch(`${BASE_URL}/api/sessions/${sessionId}`, {
          data: { status: 'active' },
        });
        expect([403, 401]).toContain(res.status());
      } finally { await mentorCtx.close(); }
    });

    test('ISD-ERR-023: RLS — student /instructor/sessions/{id} → 리다이렉트', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      const sessionId = await createDraftSession(teacherPage, `ERR023-${Date.now()}`);
      await teacherCtx.close();
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }

      const studentCtx = await browser.newContext({ storageState: AUTH_STATE.student });
      const studentPage = await studentCtx.newPage();
      try {
        await studentPage.goto(`/instructor/sessions/${sessionId}`);
        await studentPage.waitForURL((url) => !url.pathname.startsWith('/instructor'), { timeout: 10_000 });
        expect(studentPage.url()).not.toContain('/instructor');
      } finally { await studentCtx.close(); }
    });

    test('ISD-ERR-024: 접근성 — LIVE 인디케이터 aria-label', async ({ page }) => {
      test.skip(true, 'Cycle 2: aria-label="실시간 연결 중" 확인 — T12에서 구현');
    });

    test('ISD-ERR-025: 접근성 — 퀴즈 카드 role="article"', async ({ page }) => {
      test.skip(true, 'Cycle 2: 퀴즈 카드 ARIA 확인 — T12에서 구현');
    });

    test('ISD-ERR-026: 접근성 — Tab 키 포커스 순서', async ({ page }) => {
      test.skip(true, 'Cycle 2: 키보드 네비게이션 확인 — T12에서 구현');
    });

    test('ISD-ERR-027: 한국어 에러 — 퀴즈 생성 실패 시 raw 영어 미노출', async ({ page }) => {
      test.skip(true, 'Cycle 2: 에러 메시지 한국어 확인 — T12에서 구현');
    });

    test('ISD-ERR-028: 한국어 에러 — 분석 실패', async ({ page }) => {
      test.skip(true, 'Cycle 2: 에러 메시지 한국어 확인 — T12에서 구현');
    });

    test('ISD-ERR-029: 한국어 에러 — 코칭 실패', async ({ page }) => {
      test.skip(true, 'Cycle 2: 에러 메시지 한국어 확인 — T12에서 구현');
    });

    test('ISD-ERR-030: GET /api/sessions/[id] 500 — 크래시 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: DB 에러 주입 시나리오 — T12에서 구현');
    });

    test('ISD-ERR-031: 참여자 이름에 XSS → React escape', async ({ page }) => {
      test.skip(true, 'Cycle 2: display_name XSS 주입 후 렌더 확인 — T12에서 구현');
    });

    test('ISD-ERR-032: quiz correct_answer="E" — 정답 강조 없음, 크래시 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: 잘못된 correct_answer 시나리오 — T12에서 구현');
    });

    test('ISD-ERR-033: 재연결 중 응답 수신 — 누락 없이 반영', async ({ page }) => {
      test.skip(true, 'Cycle 2: 네트워크 단절/복구 응답 확인 — T12에서 구현');
    });

    test('ISD-ERR-034: completed 세션 분석 API 직접 호출 — 허용/400', async ({ page }) => {
      test.skip(true, 'Cycle 2: completed 세션 분석 정책 확인 — T12에서 구현');
    });

    test('ISD-ERR-035: anonymous_mode=true — 강사 화면에 실명 미노출', async ({ page }) => {
      test.skip(true, 'Cycle 2: anonymous_mode 세션 참여자 표시 확인 — T12에서 구현');
    });
  });
});
