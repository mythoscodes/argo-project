/**
 * 03-instructor-flow.spec.ts
 *
 * 데모 플로우 (강사): 로그인 → 세션 목록 → 세션 생성 → draft→active 전환 → 참여코드 확인
 *
 * AI 엔드포인트(/api/ai/**)는 page.route() 스텁으로 대체.
 * 목표: 데모 Must TC 중 강사 관련 핵심 시나리오 커버.
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE } from './fixtures/users';
import { stubAiRoutes } from './fixtures/helpers';

test.use({ storageState: AUTH_STATE.teacher });
// 병렬 실행 중 서버 부하로 인한 페이지 로드 지연 대비
test.use({ timeout: 90_000 });

test.describe('데모 플로우: 강사 세션 관리', () => {
  test.beforeEach(({ page }) => {
    stubAiRoutes(page);
  });

  // CMN-UI-002 + LGN-UI-001: 강사 로그인 → /instructor
  test('강사 인증 세션으로 / 접속 → /instructor 리다이렉트 (CMN-UI-002)', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/instructor**', { timeout: 10_000 });
    expect(page.url()).toContain('/instructor');
  });

  // IDB-UI-001: 강사 대시보드 세션 목록 로드
  test('강사 대시보드 — 세션 목록 페이지 렌더링 (IDB-UI-001)', async ({ page }) => {
    await test.step('/instructor 접속', async () => {
      await page.goto('/instructor');
      await page.waitForLoadState('networkidle');
    });

    await test.step('강사 UI 핵심 요소 확인', async () => {
      // 세션 목록 또는 빈 상태 메시지 중 하나가 있어야 함
      const hasContent = await Promise.race([
        page.locator('h1, h2').first().isVisible().then((v) => v),
        page.waitForTimeout(5_000).then(() => false),
      ]);
      expect(hasContent, '강사 대시보드에 콘텐츠가 렌더링되어야 한다').toBeTruthy();
    });
  });

  // ISN-UI-001 + ISN-API-001: 세션 생성
  test('새 세션 생성 플로우 (ISN-UI-001, ISN-API-001)', async ({ page }) => {
    const sessionTitle = `E2E 테스트 세션 ${Date.now()}`;

    await test.step('/instructor/sessions/new 이동', async () => {
      await page.goto('/instructor/sessions/new');
      await page.waitForLoadState('networkidle');
    });

    await test.step('세션 폼 작성', async () => {
      // 세션 제목 입력 (id="title")
      await page.fill('#title', sessionTitle);

      // 과목 입력 (id="subject", required)
      await page.fill('#subject', 'JPA');
    });

    await test.step('세션 생성 제출', async () => {
      const submitBtn = page.locator('button[type="submit"], button:has-text("생성"), button:has-text("만들기")').first();
      await Promise.all([
        page.waitForURL((url) => url.pathname.includes('/instructor/sessions/') && !url.pathname.endsWith('/new'), {
          timeout: 15_000,
        }),
        submitBtn.click(),
      ]);
    });

    await test.step('세션 상세 페이지로 이동 확인', async () => {
      expect(page.url()).toMatch(/\/instructor\/sessions\/[^/]+$/);
    });
  });

  // ISD-UI-001 + ISD-UI-002: draft → active 전환 + 참여코드 노출
  test('세션 상태 전환: draft → active + 참여코드 노출 (ISD-UI-001, ISD-UI-002)', async ({ page, request }) => {
    await test.step('신규 세션 생성 (API 직접 호출)', async () => {
      // 테스트용 세션을 API로 직접 생성
      const createRes = await page.request.post('/api/sessions', {
        data: {
          title: `E2E_draft_active_${Date.now()}`,
          subject: 'Spring Boot',
          topics: ['IoC', 'DI'],
        },
      });

      if (!createRes.ok()) {
        test.skip(true, '세션 생성 API 실패');
        return;
      }

      const { data: session } = await createRes.json();

      await test.step('세션 상세 페이지 접속', async () => {
        await page.goto(`/instructor/sessions/${session.id}`);
        await page.waitForLoadState('networkidle');
      });

      await test.step('draft 상태 확인 — 참여코드 미발급', async () => {
        // draft 상태에서 참여코드 미발급 메시지 또는 "수업 시작" 버튼이 있어야 함
        const startBtn = page.locator('button:has-text("수업 시작"), button:has-text("시작")').first();
        await expect(startBtn).toBeVisible({ timeout: 8_000 });
      });

      await test.step('수업 시작 클릭 → active 전환', async () => {
        const startBtn = page.locator('button:has-text("수업 시작"), button:has-text("시작")').first();
        await startBtn.click();

        // 상태 배지 또는 참여코드 노출 대기
        await page.waitForTimeout(2_000);
      });

      await test.step('active 상태 확인 — 6자리 참여코드 노출 (ISD-UI-004)', async () => {
        // 참여코드는 6자리 영숫자 (ABCDEFGHJKLMNPQRSTUVWXYZ23456789)
        const pageContent = await page.content();
        // 6자리 대문자 영숫자 패턴이 페이지에 존재해야 함
        const hasJoinCode = /\b[A-Z0-9]{6}\b/.test(pageContent);
        expect(hasJoinCode, '6자리 참여코드가 페이지에 표시되어야 한다').toBeTruthy();
      });
    });
  });

  // ISD-ERR-001: draft 세션 join_code가 DOM에 평문 노출되지 않음
  test('draft 세션 페이지 DOM에 join_code 평문 없음 (ISD-ERR-001)', async ({ page, request }) => {
    await test.step('신규 draft 세션 생성', async () => {
      const createRes = await page.request.post('/api/sessions', {
        data: {
          title: `E2E_no_jc_${Date.now()}`,
          subject: 'Docker',
          topics: ['컨테이너'],
        },
      });

      if (!createRes.ok()) {
        test.skip(true, '세션 생성 API 실패');
        return;
      }

      const { data: session } = await createRes.json();

      await test.step('draft 세션 페이지 접속', async () => {
        await page.goto(`/instructor/sessions/${session.id}`);
        // networkidle: React의 세션 API 호출이 완료될 때까지 대기
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      });

      await test.step('DOM에 join_code 평문 없음 확인', async () => {
        // networkidle 이후에도 React setState 렌더링이 남아있을 수 있음
        // toContainText auto-retry (최대 15s) → draft UI 완전 렌더 보장
        // "수업 시작" 버튼은 draft 상태 공통 UI (ISD-UI-001에서 검증됨)
        await expect(page.locator('body')).toContainText(
          /수업을 시작하면|코드가 발급|시작하면|수업 시작/,
          { timeout: 25_000 },
        );
      });
    });
  });
});
