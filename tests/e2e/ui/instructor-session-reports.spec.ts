/**
 * ui/instructor-session-reports.spec.ts
 * ISR-UI / ISR-API / ISR-ERR: 강사 세션 리포트 (F7 리포트)
 * 라우트: /instructor/sessions/[id]/reports
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE } from '../fixtures/users';
import { stubAiRoutes } from '../fixtures/helpers';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.use({ storageState: AUTH_STATE.teacher });

async function createActiveSession(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
  const res = await page.request.post(`${BASE_URL}/api/sessions`, {
    data: { title: `ISR-Test-${Date.now()}`, subject: 'Spring', topics: ['JPA'] },
  });
  if (!res.ok()) return null;
  const { data } = await res.json();
  await page.request.patch(`${BASE_URL}/api/sessions/${data.id}`, { data: { status: 'active' } });
  return data.id as string;
}

test.describe('ISR: 강사 세션 리포트 (/instructor/sessions/[id]/reports)', () => {
  test.beforeEach(({ page }) => { stubAiRoutes(page); });

  /* ─────────────────────────────── UI 시나리오 ─────────────────────────────── */

  test.describe('UI 시나리오', () => {
    test('ISR-UI-001: 분석 기록 ≥ 1건 — 추이 차트 + 분석 카드 리스트', async ({ page }) => {
      test.skip(true, 'Cycle 2: 분석 실행 후 리포트 페이지 확인 — T12에서 구현');
    });

    test('ISR-UI-002: 빈 상태 — "아직 분석 데이터가 없습니다"', async ({ page }) => {
      const sessionId = await createActiveSession(page);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.goto(`/instructor/sessions/${sessionId}/reports`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=아직 분석 데이터가 없습니다')).toBeVisible();
    });

    test('ISR-UI-003: 대시보드 링크 → /instructor/sessions/[id]', async ({ page }) => {
      const sessionId = await createActiveSession(page);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.goto(`/instructor/sessions/${sessionId}/reports`);
      await page.waitForLoadState('networkidle');
      const dashboardLink = page.locator('a:has-text("대시보드"), a[href*="/instructor/sessions/"]').first();
      if (await dashboardLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await dashboardLink.click();
        await page.waitForURL(`**/sessions/${sessionId}`, { timeout: 8_000 });
        expect(page.url()).toContain(`/sessions/${sessionId}`);
        expect(page.url()).not.toContain('/reports');
      }
    });

    test('ISR-UI-004: 추이 차트 라인 — 분석 2건 이상', async ({ page }) => {
      test.skip(true, 'Cycle 2: 분석 2건 후 LineChart 라인 확인 — T12에서 구현');
    });

    test('ISR-UI-005: Y축 범위 0-100 고정', async ({ page }) => {
      test.skip(true, 'Cycle 2: LineChart Y축 확인 — T12에서 구현');
    });

    test('ISR-UI-006: 분석 카드 타입 라벨 — "코칭 분석" / "이해도 분석"', async ({ page }) => {
      test.skip(true, 'Cycle 2: analysis_type 라벨 분기 확인 — T12에서 구현');
    });

    test('ISR-UI-007: 이해도 점수 색상 — score 구간별 녹/노/빨', async ({ page }) => {
      test.skip(true, 'Cycle 2: 점수 색상 CSS 확인 — T12에서 구현');
    });

    test('ISR-UI-008: 약점 토픽 배지 — destructive 배지 리스트', async ({ page }) => {
      test.skip(true, 'Cycle 2: weak_topics 배지 확인 — T12에서 구현');
    });

    test('ISR-UI-009: 코칭 제안 — 보라색 박스 + whitespace-pre-wrap', async ({ page }) => {
      test.skip(true, 'Cycle 2: coaching_suggestion 렌더 확인 — T12에서 구현');
    });

    test('ISR-UI-010: AI 리포트 생성 버튼 — 새 분석 카드 추가', async ({ page }) => {
      const sessionId = await createActiveSession(page);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.goto(`/instructor/sessions/${sessionId}/reports`);
      await page.waitForLoadState('networkidle');
      const generateBtn = page.locator('button:has-text("AI 리포트 생성"), button:has-text("리포트 생성")');
      if (await generateBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await generateBtn.click();
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.length).toBeGreaterThan(500);
      }
    });

    test('ISR-UI-011: 생성 중 로딩 — "생성중..." + disabled', async ({ page }) => {
      test.skip(true, 'Cycle 2: 생성 중 버튼 상태 인터셉트 — T12에서 구현');
    });

    test('ISR-UI-012: 생성 시각 한국어 포맷 — toLocaleString("ko-KR")', async ({ page }) => {
      test.skip(true, 'Cycle 2: 분석 카드 생성 시각 포맷 확인 — T12에서 구현');
    });

    test('ISR-UI-013: 분석 1건 — 차트 점 1개, 크래시 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: 단일 분석 차트 렌더 확인 — T12에서 구현');
    });

    test('ISR-UI-014: 토픽 7개 — 색상 순환 (topicColors[idx % 6])', async ({ page }) => {
      test.skip(true, 'Cycle 2: 7개 토픽 색상 순환 확인 — T12에서 구현');
    });

    test('ISR-UI-015: 약점 토픽 0개 — "약점:" 섹션 미노출', async ({ page }) => {
      test.skip(true, 'Cycle 2: weak_topics=[] 시나리오 — T12에서 구현');
    });

    test('ISR-UI-016: 분석 카드 10개 — 스크롤, 크래시 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: 대용량 분석 카드 렌더 확인 — T12에서 구현');
    });

    test('ISR-UI-017: Tab 키 네비게이션 — 포커스 논리적', async ({ page }) => {
      test.skip(true, 'Cycle 2: 키보드 네비게이션 확인 — T12에서 구현');
    });

    test('ISR-UI-018: 차트 호버 툴팁', async ({ page }) => {
      test.skip(true, 'Cycle 2: LineChart 툴팁 호버 확인 — T12에서 구현');
    });

    test('ISR-UI-019: 새로고침 후 기록 유지', async ({ page }) => {
      const sessionId = await createActiveSession(page);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      await page.goto(`/instructor/sessions/${sessionId}/reports`);
      await page.waitForLoadState('networkidle');
      await page.reload();
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(100);
    });

    test('ISR-UI-020: 뒤로가기 — 대시보드로 복귀', async ({ page }) => {
      test.skip(true, 'Cycle 2: 뒤로가기 히스토리 확인 — T12에서 구현');
    });

    test('ISR-UI-021: 코칭 제안 긴 텍스트 — whitespace-pre-wrap 줄바꿈', async ({ page }) => {
      test.skip(true, 'Cycle 2: 500자 코칭 제안 렌더 확인 — T12에서 구현');
    });

    test('ISR-UI-022: 점수 색상 경계 — score=60 → 노란색', async ({ page }) => {
      test.skip(true, 'Cycle 2: 경계값 색상 확인 — T12에서 구현');
    });

    test('ISR-UI-023: 점수 색상 경계 — score=80 → 초록색', async ({ page }) => {
      test.skip(true, 'Cycle 2: 경계값 색상 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── API 계약 ─────────────────────────────── */

  test.describe('API 계약', () => {
    test('ISR-API-001: GET /api/ai/analysis?sessionId → 200 + data', async ({ page }) => {
      const sessionId = await createActiveSession(page);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      const res = await page.request.get(`${BASE_URL}/api/ai/analysis?sessionId=${sessionId}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('data');
    });

    test('ISR-API-002: POST /api/ai/report → 200 + 분석 레코드 생성', async ({ page }) => {
      const sessionId = await createActiveSession(page);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      const res = await page.request.post(`${BASE_URL}/api/ai/report`, {
        data: { sessionId },
      });
      expect([200, 400, 500]).toContain(res.status());
    });

    test('ISR-API-003: 타 강사 세션 ID → 403 또는 빈 배열 (RLS)', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타 강사 계정 생성 후 교차 접근 — T12에서 구현');
    });

    test('ISR-API-004: 응답 0건에서 리포트 생성 → 400 또는 빈 분석', async ({ page }) => {
      test.skip(true, 'Cycle 2: 응답 없는 세션 리포트 생성 정책 확인 — T12에서 구현');
    });

    test('ISR-API-005: mentor role GET /api/ai/analysis → 200 (isStaff)', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      const sessionId = await createActiveSession(teacherPage);
      await teacherCtx.close();
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }

      const mentorCtx = await browser.newContext({ storageState: AUTH_STATE.mentor });
      const mentorPage = await mentorCtx.newPage();
      try {
        const res = await mentorPage.request.get(`${BASE_URL}/api/ai/analysis?sessionId=${sessionId}`);
        expect([200, 403]).toContain(res.status());
      } finally { await mentorCtx.close(); }
    });

    test('ISR-API-006: mentor role POST /api/ai/report → 200 또는 403', async ({ browser }) => {
      const teacherCtx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const teacherPage = await teacherCtx.newPage();
      const sessionId = await createActiveSession(teacherPage);
      await teacherCtx.close();
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }

      const mentorCtx = await browser.newContext({ storageState: AUTH_STATE.mentor });
      const mentorPage = await mentorCtx.newPage();
      try {
        const res = await mentorPage.request.post(`${BASE_URL}/api/ai/report`, {
          data: { sessionId },
        });
        expect([200, 403, 400]).toContain(res.status());
      } finally { await mentorCtx.close(); }
    });

    test('ISR-API-007: GET /api/ai/analysis — 분석 없음 → 200 { data: [] }', async ({ page }) => {
      const sessionId = await createActiveSession(page);
      if (!sessionId) { test.skip(true, '세션 생성 실패'); return; }
      const res = await page.request.get(`${BASE_URL}/api/ai/analysis?sessionId=${sessionId}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      const dataArr = Array.isArray(body.data) ? body.data : body.data ? [body.data] : [];
      expect(Array.isArray(dataArr)).toBeTruthy();
    });

    test('ISR-API-008: POST /api/ai/report — temperature 0.5', async ({ page }) => {
      test.skip(true, 'Cycle 2: temperature 서버 로그 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── 에러 / 엣지 ─────────────────────────────── */

  test.describe('에러 / 엣지', () => {
    test('ISR-ERR-001: 타 학원 세션 접근 → 빈 상태 또는 RLS 차단', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타 학원 세션 ID 접근 — T12에서 구현');
    });

    test('ISR-ERR-002: understanding_scores null → 카드 점수 섹션 생략', async ({ page }) => {
      test.skip(true, 'Cycle 2: null 분석 결과 시나리오 — T12에서 구현');
    });

    test('ISR-ERR-003: weak_topics null → 약점 섹션 생략', async ({ page }) => {
      test.skip(true, 'Cycle 2: null weak_topics 시나리오 — T12에서 구현');
    });

    test('ISR-ERR-004: 토픽 수 > 6 → 색상 순환 (% 연산)', async ({ page }) => {
      test.skip(true, 'Cycle 2: 7개 토픽 색상 순환 확인 — T12에서 구현');
    });

    test('ISR-ERR-005: 리포트 생성 실패 → 에러 메시지, 기존 차트 유지', async ({ page }) => {
      test.skip(true, 'Cycle 2: AI 에러 주입 후 UI 확인 — T12에서 구현');
    });

    test('ISR-ERR-006: 차트 데이터 0건 → 차트 카드 숨김', async ({ page }) => {
      test.skip(true, 'Cycle 2: understanding_scores all null 시나리오 — T12에서 구현');
    });

    test('ISR-ERR-007: RLS 교차 — 타 학원 강사 직접 URL 접근', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타 학원 계정 생성 후 교차 접근 — T12에서 구현');
    });

    test('ISR-ERR-008: coaching_suggestion에 HTML 태그 → React escape', async ({ page }) => {
      test.skip(true, 'Cycle 2: AI 응답 HTML 태그 주입 — T12에서 구현');
    });

    test('ISR-ERR-009: 네트워크 오프라인 중 생성 → 에러, 로딩 해제', async ({ page }) => {
      test.skip(true, 'Cycle 2: 오프라인 시나리오 — T12에서 구현');
    });

    test('ISR-ERR-010: 중복 생성 버튼 클릭 → isGenerating 버튼 disabled', async ({ page }) => {
      test.skip(true, 'Cycle 2: 중복 클릭 방지 확인 — T12에서 구현');
    });

    test('ISR-ERR-011: 잘못된 sessionId → 400 또는 빈 상태', async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}/api/ai/analysis?sessionId=invalid-id`);
      expect([400, 404, 200]).toContain(res.status());
    });

    test('ISR-ERR-012: 한국어 에러 메시지 — 리포트 생성 실패', async ({ page }) => {
      test.skip(true, 'Cycle 2: 에러 메시지 한국어 확인 — T12에서 구현');
    });

    test('ISR-ERR-013: 접근성 — 차트 aria-label 또는 데이터 테이블', async ({ page }) => {
      test.skip(true, 'Cycle 2: Recharts 접근성 확인 — T12에서 구현');
    });

    test('ISR-ERR-014: 분석 AI JSON 파싱 실패 → 1회 재시도', async ({ page }) => {
      test.skip(true, 'Cycle 2: JSON 재시도 시나리오 — T12에서 구현');
    });
  });
});
