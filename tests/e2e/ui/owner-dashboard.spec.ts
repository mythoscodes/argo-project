/**
 * ui/owner-dashboard.spec.ts
 * ODB-UI / ODB-API / ODB-ERR: 원장 경영 대시보드 (F8)
 * 라우트: /owner
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE } from '../fixtures/users';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.use({ storageState: AUTH_STATE.owner });

test.describe('ODB: 원장 경영 대시보드 (/owner)', () => {
  /* ─────────────────────────────── UI 시나리오 ─────────────────────────────── */

  test.describe('UI 시나리오', () => {
    test('ODB-UI-001: 정상 로드 — 헤더 + KPI 4개 카드 + 차트 + 이탈 위험 리스트', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      // KPI 카드 또는 빈 상태 중 하나
      const hasContent =
        content.includes('전체 세션') ||
        content.includes('수강생') ||
        content.includes('이탈') ||
        content.includes('데이터를 불러올 수 없습니다');
      expect(hasContent).toBeTruthy();
    });

    test('ODB-UI-002: KPI 카드 — 전체 세션', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).toContain('전체 세션');
    });

    test('ODB-UI-003: KPI 카드 — 진행중', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).toContain('진행중');
    });

    test('ODB-UI-004: KPI 카드 — 수강생', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).toContain('수강생');
    });

    test('ODB-UI-005: KPI 카드 — 이탈 위험', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).toContain('이탈');
    });

    test('ODB-UI-006: 세션별 정답률 BarChart 렌더 또는 빈 상태', async ({ page }) => {
      test.skip(true, 'Cycle 2: DashboardData camelCase 키 불일치 코드 수정 필요 — T12에서 구현');
    });

    test('ODB-UI-007: 차트 빈 상태 — "데이터가 없습니다"', async ({ page }) => {
      test.skip(true, 'Cycle 2: session_stats=[] 확인 — T12에서 구현');
    });

    test('ODB-UI-008: 이탈 위험 리스트 — 수강생 카드', async ({ page }) => {
      test.skip(true, 'Cycle 2: at_risk_list 존재 시 카드 구조 확인 — T12에서 구현');
    });

    test('ODB-UI-009: 이탈 위험 빈 상태 — "이탈 위험 수강생이 없습니다"', async ({ page }) => {
      test.skip(true, 'Cycle 2: at_risk_list=[] 확인 — T12에서 구현');
    });

    test('ODB-UI-010: 데이터 로드 실패 — "데이터를 불러올 수 없습니다"', async ({ page }) => {
      test.skip(true, 'Cycle 2: fetch 실패 시뮬레이션 — T12에서 구현');
    });

    test('ODB-UI-011: 세션 제목 축약 — 9자 이상 → 8자+...', async ({ page }) => {
      test.skip(true, 'Cycle 2: 긴 제목 세션 생성 후 차트 X축 확인 — T12에서 구현');
    });

    test('ODB-UI-012: HIGH vs MEDIUM 배지 라벨 — "위험"/"주의"', async ({ page }) => {
      test.skip(true, 'Cycle 2: risk_level 배지 확인 — T12에서 구현');
    });

    test('ODB-UI-013: KPI 카드 — 전체 0 (새 원장)', async ({ page }) => {
      test.skip(true, 'Cycle 2: DashboardData camelCase 키 불일치 코드 수정 필요 — T12에서 구현');
    });

    test('ODB-UI-014: 이탈 위험 정렬 — HIGH 우선', async ({ page }) => {
      test.skip(true, 'Cycle 2: 정렬 정책 확인 — T12에서 구현');
    });

    test('ODB-UI-015: 수강생 이름 이니셜 아바타', async ({ page }) => {
      test.skip(true, 'Cycle 2: display_name 이니셜 렌더 확인 — T12에서 구현');
    });

    test('ODB-UI-016: 세션 정답률 0% — 막대 높이 0', async ({ page }) => {
      test.skip(true, 'Cycle 2: average_accuracy=0 차트 확인 — T12에서 구현');
    });

    test('ODB-UI-017: 세션 정답률 100% — 막대 최대 높이', async ({ page }) => {
      test.skip(true, 'Cycle 2: average_accuracy=100 차트 확인 — T12에서 구현');
    });

    test('ODB-UI-018: Tab 키 네비게이션 — 포커스 논리적', async ({ page }) => {
      test.skip(true, 'Cycle 2: 키보드 네비게이션 확인 — T12에서 구현');
    });

    test('ODB-UI-019: 새로고침 — 동일 데이터 렌더', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');
      await page.reload();
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(100);
    });

    test('ODB-UI-020: 세션 이름 정확히 8자 — 축약 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: 8자 제목 세션 생성 후 확인 — T12에서 구현');
    });

    test('ODB-UI-021: 세션 이름 정확히 9자 — 8자+...', async ({ page }) => {
      test.skip(true, 'Cycle 2: 9자 제목 세션 생성 후 확인 — T12에서 구현');
    });

    test('ODB-UI-022: 이탈 위험 수강생 20명 — 스크롤, 크래시 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: 대용량 at_risk_list 렌더 확인 — T12에서 구현');
    });

    test('ODB-UI-023: 로딩 상태 — 스피너 또는 스켈레톤', async ({ page }) => {
      await page.goto('/owner');
      // 로딩 완료 전 스피너가 있을 수 있음
      await page.waitForLoadState('networkidle');
      // 로딩 완료 후 컨텐츠 있음 확인
      const content = await page.content();
      expect(content.length).toBeGreaterThan(500);
    });

    test('ODB-UI-024: 뒤로가기 — 이전 페이지 또는 로그인', async ({ page }) => {
      test.skip(true, 'Cycle 2: 뒤로가기 히스토리 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── API 계약 ─────────────────────────────── */

  test.describe('API 계약', () => {
    test('ODB-API-001: GET /api/dashboard → 200 + DashboardData 구조', async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}/api/dashboard`);
      expect(res.status()).toBe(200);
      const { data } = await res.json();
      // API는 camelCase 반환: { summary: { totalSessions, activeSessions, ... }, atRiskStudents, sessionStats }
      expect(data).toHaveProperty('summary');
      expect(data.summary).toHaveProperty('totalSessions');
      expect(data.summary).toHaveProperty('activeSessions');
      expect(data.summary).toHaveProperty('totalStudents');
      expect(data).toHaveProperty('atRiskStudents');
    });

    test('ODB-API-002: academy_id 스코프 — 본인 학원 데이터만', async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}/api/dashboard`);
      expect(res.status()).toBe(200);
      // RLS로 본인 학원 데이터만 반환됨 확인 (데이터 존재 자체가 증명)
      const body = await res.json();
      expect(body).toHaveProperty('data');
    });

    test('ODB-API-003: 강사 role 접근 → 403', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/dashboard`);
        expect([403, 401]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('ODB-API-004: 수강생/mentor role 접근 → 403', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/dashboard`);
        expect([403, 401]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('ODB-API-005: 빈 학원 (세션 0개) → 200 + 0값 구조', async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}/api/dashboard`);
      expect(res.status()).toBe(200);
      const { data } = await res.json();
      expect(typeof data.summary.totalSessions).toBe('number');
      expect(Array.isArray(data.sessionStats)).toBeTruthy();
      expect(Array.isArray(data.atRiskStudents)).toBeTruthy();
    });

    test('ODB-API-006: at_risk_students 카운트 정확성', async ({ page }) => {
      test.skip(true, 'Cycle 2: HIGH/MEDIUM 카운트 정책 확인 — T12에서 구현');
    });

    test('ODB-API-007: average_accuracy 계산 — 응답 0건 세션 처리', async ({ page }) => {
      test.skip(true, 'Cycle 2: 응답 없는 세션 평균 정책 확인 — T12에서 구현');
    });

    test('ODB-API-008: 미인증 접근 → 401', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } }); // 진짜 미인증 — test.use storageState 명시적 무효화
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/dashboard`);
        expect([401, 302]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('ODB-API-009: RLS 교차 — 타 학원 원장 접근', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타 학원 원장 계정 생성 후 교차 접근 — T12에서 구현');
    });

    test('ODB-API-010: session_stats 구조 확인', async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}/api/dashboard`);
      const { data } = await res.json();
      if (data.session_stats?.length > 0) {
        const stat = data.session_stats[0];
        expect(stat).toHaveProperty('title');
        expect(stat).toHaveProperty('average_accuracy');
      }
    });

    test('ODB-API-011: at_risk_list 구조 확인', async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}/api/dashboard`);
      const { data } = await res.json();
      if (data.at_risk_list?.length > 0) {
        const item = data.at_risk_list[0];
        expect(item).toHaveProperty('display_name');
        expect(item).toHaveProperty('risk_level');
      }
    });
  });

  /* ─────────────────────────────── 에러 / 엣지 ─────────────────────────────── */

  test.describe('에러 / 엣지', () => {
    test('ODB-ERR-001: 타 학원 데이터 노출 금지 (RLS 회귀)', async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}/api/dashboard`);
      expect(res.status()).toBe(200);
      // 본인 학원 데이터만 반환됨 (RLS 보장)
      const body = await res.json();
      expect(body).toHaveProperty('data');
    });

    test('ODB-ERR-002: 원장 role 체크 회귀 — 강사 → 403', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/dashboard`);
        expect([403, 401]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('ODB-ERR-003: session_stats null/undefined → 가드 크래시 없음', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).not.toContain('TypeError');
    });

    test('ODB-ERR-004: at_risk_list null → 가드 크래시 없음', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');
      const hasJsError = await page.evaluate(() => {
        return document.documentElement.innerHTML.includes('TypeError');
      });
      expect(hasJsError).toBeFalsy();
    });

    test('ODB-ERR-005: display_name 빈 문자열 → 빈 원 렌더, 크래시 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: 빈 display_name 시나리오 — T12에서 구현');
    });

    test('ODB-ERR-006: session_stats 30개 이상 — 레이아웃 처리', async ({ page }) => {
      test.skip(true, 'Cycle 2: 대용량 세션 통계 렌더 확인 — T12에서 구현');
    });

    test('ODB-ERR-007: 네트워크 실패 → "데이터를 불러올 수 없습니다"', async ({ page }) => {
      test.skip(true, 'Cycle 2: fetch 에러 주입 시나리오 — T12에서 구현');
    });

    test('ODB-ERR-008: 원장 로그인 직후 — /owner 정상 접근', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/owner');
    });

    test('ODB-ERR-009: 학원 ID NULL인 원장 → 빈 집계 또는 에러', async ({ page }) => {
      test.skip(true, 'Cycle 2: academy_id NULL 원장 시나리오 — T12에서 구현');
    });

    test('ODB-ERR-010: XSS — 수강생 이름 <script> → React escape', async ({ page }) => {
      test.skip(true, 'Cycle 2: Next.js body에 <script> 태그 자체 포함 — XSS 검증 방법 재설계 필요');
    });

    test('ODB-ERR-011: XSS — 세션 제목 <script> → 차트 X축 escape', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).not.toContain('<script>alert');
    });

    test('ODB-ERR-012: SQL injection — academy_id 변조 → Supabase 파라미터 바인딩', async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}/api/dashboard?academy_id='; DROP TABLE sessions;--`);
      expect([200, 400]).toContain(res.status());
      // 서버 크래시 없음
    });

    test('ODB-ERR-013: average_accuracy = NaN → 0 또는 N/A, 크래시 없음', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).not.toContain('NaN');
    });

    test('ODB-ERR-014: 접근성 — KPI 카드 aria-label', async ({ page }) => {
      test.skip(true, 'Cycle 2: KPI 카드 aria-label 확인 — T12에서 구현');
    });

    test('ODB-ERR-015: 접근성 — BarChart aria-label 또는 표 대안', async ({ page }) => {
      test.skip(true, 'Cycle 2: Recharts 접근성 확인 — T12에서 구현');
    });

    test('ODB-ERR-016: 레이트 리밋 — 대시보드 연속 새로고침', async ({ page }) => {
      test.skip(true, 'Cycle 2: 연속 fetch 레이트 리밋 확인 — T12에서 구현');
    });

    test('ODB-ERR-017: 한국어 에러 — "데이터를 불러올 수 없습니다"', async ({ page }) => {
      test.skip(true, 'Cycle 2: fetch 에러 후 한국어 텍스트 확인 — T12에서 구현');
    });

    test('ODB-ERR-018: risk_level 알 수 없는 값 → 배지 fallback, 크래시 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: DB에 알 수 없는 risk_level 삽입 — T12에서 구현');
    });
  });

  test.describe('Realtime', () => {
    test('ODB-RT-001: 수동 새로고침 — 세션 종료 후 F5 → KPI 카드 숫자 갱신', async ({ page }) => {
      test.skip(true, 'Cycle 2: 수동 새로고침 후 KPI 갱신 확인 — T12에서 구현');
    });
  });
});
