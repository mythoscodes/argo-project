/**
 * regression/constants.spec.ts
 * 매직넘버 상수화 회귀 (커밋 06ed4d2)
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('매직넘버 상수화 회귀 (커밋 06ed4d2)', () => {
  // 회귀 #3-a: RISK_SPEED_INCREASE_RATIO 상수 존재
  test('회귀 #3-a: src/lib/constants.ts에 RISK_SPEED_INCREASE_RATIO 상수가 존재한다', () => {
    const constantsPath = path.join(process.cwd(), 'src/lib/constants.ts');
    const content = fs.readFileSync(constantsPath, 'utf-8');
    expect(content).toContain('RISK_SPEED_INCREASE_RATIO');
  });

  // 회귀 #3-b: 1.3 하드코딩이 없다 (constants.ts 제외)
  test('회귀 #3-b: src/lib/constants.ts 외 파일에서 1.3 하드코딩 없음', () => {
    const filesToCheck = [
      'src/app/api/mentor/students/route.ts',
      'src/lib/ai/model.ts',
    ].filter((f) => {
      const p = path.join(process.cwd(), f);
      return fs.existsSync(p);
    });

    for (const file of filesToCheck) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf-8');
      // 1.3이 문자열 비교(= 1.3, > 1.3, < 1.3 등)로 하드코딩 되지 않아야 함
      const hasHardcoded1_3 = /[^_a-zA-Z0-9]1\.3[^0-9]/.test(content);
      expect(hasHardcoded1_3, `${file}에 1.3 하드코딩 없어야 함`).toBeFalsy();
    }
  });

  // SESSION_CODE_LENGTH 상수 존재 확인
  test('SESSION_CODE_LENGTH 상수가 src/lib/constants.ts에 존재한다', () => {
    const constantsPath = path.join(process.cwd(), 'src/lib/constants.ts');
    const content = fs.readFileSync(constantsPath, 'utf-8');
    expect(content).toContain('SESSION_CODE_LENGTH');
  });

  // MLS-API-002: RISK_SPEED_INCREASE_RATIO 값이 숫자 리터럴
  test('MLS-API-002: RISK_SPEED_INCREASE_RATIO는 숫자 값으로 정의됨', () => {
    const constantsPath = path.join(process.cwd(), 'src/lib/constants.ts');
    const content = fs.readFileSync(constantsPath, 'utf-8');
    // RISK_SPEED_INCREASE_RATIO = 숫자 패턴 확인
    expect(/RISK_SPEED_INCREASE_RATIO\s*=\s*[\d.]+/.test(content)).toBeTruthy();
  });

  // /register 페이지 mentor role 옵션 확인 (회귀 #4)
  test('회귀 #4: /register 페이지에 mentor 역할 옵션이 표시된다', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    const content = await page.content();
    expect(content.toLowerCase()).toContain('mentor');
  });
});
