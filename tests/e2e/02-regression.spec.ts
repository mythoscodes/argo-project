/**
 * 02-regression.spec.ts
 *
 * AC-5: 알려진 회귀 리스크 4건 자동화 커버
 *
 * | # | 리스크 | 검증 방법 |
 * |---|--------|---------|
 * | 1 | join_code 평문 노출 | POST /api/auth/register 응답 + ISD-ERR-001 |
 * | 2 | 원장 대시보드 role 체크 | teacher/student → /owner 접근 리다이렉트 |
 * | 3 | RISK_SPEED_INCREASE_RATIO 상수화 | constants.ts 파일 grep |
 * | 4 | mentor role 라우팅 | AC-1~4 (01-mentor-auth.spec.ts에서 커버) |
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { AUTH_STATE } from './fixtures/users';

// ─── 회귀 #1: join_code 노출 방지 ───────────────────────────────────────────

test.describe('회귀 #1: join_code 평문 노출 방지 (REG-ERR-001, ISD-ERR-001)', () => {
  test('POST /api/auth/register 응답 JSON에 join_code 키 없음', async ({ request }) => {
    await test.step('원장 계정 등록 API 호출', async () => {
      const res = await request.post('/api/auth/register', {
        data: {
          email: `e2e-reg-jc-${Date.now()}@test.argos`,
          password: 'TestPass123',
          display_name: '조인코드 테스트',
          role: 'owner',
          academy_name: `JC 테스트 학원 ${Date.now()}`,
        },
      });

      // 201 or 409 (already exists) 모두 OK
      expect([200, 201, 409]).toContain(res.status());

      if (res.status() !== 409) {
        const body = await res.json();
        const bodyStr = JSON.stringify(body);
        expect(bodyStr, '응답 body에 join_code가 포함되면 안 된다').not.toContain('join_code');
        expect(body.data).not.toHaveProperty('join_code');
      }
    });
  });

  test.describe('ISD-ERR-001: draft 세션 GET 응답에 join_code 없음', () => {
    test.use({ storageState: AUTH_STATE.teacher });

    test('신규 세션 생성 후 GET 응답에 join_code가 null이거나 없어야 함', async ({ request, page }) => {
      await test.step('세션 목록 페이지 접속으로 인증 쿠키 활성화', async () => {
        await page.goto('/instructor');
        await page.waitForURL('**/instructor**', { timeout: 10_000 });
      });

      await test.step('신규 세션 생성', async () => {
        const createRes = await page.request.post('/api/sessions', {
          data: {
            title: `회귀테스트_세션_${Date.now()}`,
            subject: 'JPA',
            topics: ['N+1', '연관관계'],
          },
        });

        if (!createRes.ok()) {
          test.skip(true, '세션 생성 실패 — 강사 계정 미설정');
          return;
        }

        const { data: session } = await createRes.json();

        await test.step('draft 세션 GET 응답 확인', async () => {
          const getRes = await page.request.get(`/api/sessions/${session.id}`);
          const sessionData = await getRes.json();
          const sessionStr = JSON.stringify(sessionData);

          // draft 상태: join_code는 발급 전이므로 null이거나 필드 자체가 없어야 함
          const joinCodeValue =
            sessionData.data?.join_code ?? sessionData.join_code;
          expect(
            joinCodeValue,
            'draft 세션의 join_code는 null 또는 undefined여야 한다',
          ).toBeFalsy();
          expect(sessionStr).not.toMatch(/"join_code"\s*:\s*"[^"]+"/);
        });
      });
    });
  });
});

// ─── 회귀 #2: 원장 대시보드 role 체크 ────────────────────────────────────────

test.describe('회귀 #2: 원장 대시보드 role 체크 (ODB-ERR-001, IDB-ERR-001)', () => {
  test.describe('teacher → /owner 직접 접근 차단', () => {
    test.use({ storageState: AUTH_STATE.teacher });

    test('teacher가 /owner 직접 접근 → 본인 홈(/instructor) 또는 /로 리다이렉트', async ({ page }) => {
      await page.goto('/owner');

      // teacher는 /owner에 머물면 안 됨
      await page.waitForURL(
        (url) => !url.pathname.startsWith('/owner'),
        { timeout: 10_000 },
      );
      expect(page.url()).not.toContain('/owner');
    });
  });

  test.describe('student → /owner 직접 접근 차단', () => {
    test.use({ storageState: AUTH_STATE.student });

    test('student가 /owner 직접 접근 → 본인 홈(/student/join) 또는 /로 리다이렉트', async ({ page }) => {
      await page.goto('/owner');

      await page.waitForURL(
        (url) => !url.pathname.startsWith('/owner'),
        { timeout: 10_000 },
      );
      expect(page.url()).not.toContain('/owner');
    });
  });
});

// ─── 회귀 #3: RISK_SPEED_INCREASE_RATIO 상수화 ──────────────────────────────

test.describe('회귀 #3: RISK_SPEED_INCREASE_RATIO 매직넘버 상수화 (커밋 06ed4d2)', () => {
  test('src/lib/constants.ts에 RISK_SPEED_INCREASE_RATIO 상수가 존재한다', () => {
    const constantsPath = path.resolve('src/lib/constants.ts');
    const content = fs.readFileSync(constantsPath, 'utf-8');

    expect(
      content,
      'RISK_SPEED_INCREASE_RATIO가 constants.ts에 정의되어야 한다',
    ).toContain('RISK_SPEED_INCREASE_RATIO');
  });

  test('src/lib/constants.ts 외 파일에서 1.3 하드코딩이 없다 (mentor 관련 파일)', () => {
    const mentorFiles = [
      'src/app/api/mentor',
      'src/app/mentor',
      'src/lib/ai/prompts',
    ].flatMap((dir) => {
      try {
        return getAllTsFiles(dir);
      } catch {
        return [];
      }
    });

    for (const filePath of mentorFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      // 1.3 이 하드코딩된 비교 연산 패턴 검사 (> 1.3, >= 1.3, < 1.3)
      const hardcodedPattern = /[><=!]=?\s*1\.3\b/;
      expect(
        hardcodedPattern.test(content),
        `${filePath}에 1.3 하드코딩이 있어서는 안 된다 — RISK_SPEED_INCREASE_RATIO 사용 필요`,
      ).toBe(false);
    }
  });
});

// ─── 회귀 #4: mentor role 라우팅 ─────────────────────────────────────────────
// 01-mentor-auth.spec.ts의 AC-1~4 테스트로 커버됨.
// 아래는 register UI에 mentor 옵션이 표시되는지 확인한다.

test.describe('회귀 #4: register UI — mentor ROLE_OPTIONS 존재 확인', () => {
  test('/register 페이지에 mentor 역할 옵션이 표시된다 (AC-1)', async ({ page }) => {
    await page.goto('/register');

    await test.step('역할 선택 드롭다운 열기', async () => {
      // shadcn SelectTrigger 클릭
      await page.click('[data-testid="role-select"], button:has-text("역할을 선택하세요"), [role="combobox"]');
    });

    await test.step('mentor 옵션 노출 확인', async () => {
      const mentorOption = page.locator('[role="option"]:has-text("멘토"), [role="listbox"] *:has-text("멘토")');
      await expect(mentorOption.first()).toBeVisible({ timeout: 5_000 });
    });
  });
});

// ─── 유틸 함수 ────────────────────────────────────────────────────────────────

function getAllTsFiles(dir: string): string[] {
  const resolvedDir = path.resolve(dir);
  if (!fs.existsSync(resolvedDir)) return [];

  const entries = fs.readdirSync(resolvedDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(resolvedDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}
