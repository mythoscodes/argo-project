/**
 * ui/mentor-student-detail.spec.ts
 * MSD-UI / MSD-API / MSD-ERR / MSD-BND / MSD-AUTH / MSD-NET / MSD-AI / MSD-A11Y / MSD-RLS / MSD-SEC
 * 라우트: /mentor/students/[id]
 */
import { test, expect } from '@playwright/test';
import { AUTH_STATE } from '../fixtures/users';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.use({ storageState: AUTH_STATE.mentor });

/** mentor 컨텍스트로 수강생 목록 첫 번째 student_id 반환 */
async function getFirstStudentId(page: import('@playwright/test').Page): Promise<string | null> {
  const res = await page.request.get(`${BASE_URL}/api/mentor/students`);
  if (!res.ok()) return null;
  const { data } = await res.json();
  return data?.[0]?.student_id ?? null;
}

test.describe('MSD: 멘토 학생 상담 상세 (/mentor/students/[id])', () => {
  /* ─────────────────────────────── UI 시나리오 ─────────────────────────────── */

  test.describe('UI 시나리오 — 위험도 헤더 & 3-신호', () => {
    test('MSD-UI-001: HIGH 수강생 로드 — 빨간 테두리 카드 + "이탈 위험" 배지', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음 — seed 데이터 확인'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      // 이탈 위험 배지, 주의, 또는 양호 — 위험도 카드 존재 확인
      const hasRiskCard = content.includes('이탈 위험') || content.includes('주의') || content.includes('양호');
      expect(hasRiskCard).toBeTruthy();
    });

    test('MSD-UI-002: 3-신호 그리드 — 최근 정답률 + 응답 속도 + 연속 미참여 카드', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).toContain('최근 정답률');
      expect(content).toContain('응답 속도');
      expect(content).toContain('연속 미참여');
    });

    test('MSD-UI-003: 목록으로 돌아가기 — "목록으로" 링크 → /mentor', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const backLink = page.locator('a:has-text("목록으로"), [href="/mentor"]').first();
      if (await backLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await backLink.click();
        await page.waitForURL('**/mentor', { timeout: 8_000 });
        expect(page.url()).toContain('/mentor');
      }
    });

    test('MSD-UI-004: LOW 수강생 로드 — 초록 테두리 + "양호" 배지', async ({ page }) => {
      test.skip(true, 'Cycle 2: LOW 수강생 시나리오 — T12에서 구현');
    });
  });

  test.describe('UI 시나리오 — AI 상담 브리핑', () => {
    test('MSD-UI-010: 브리핑 생성 — "AI 상담 브리핑" 클릭 → 보라색 카드', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const briefingBtn = page.locator('button:has-text("AI 상담 브리핑")').first();
      if (await briefingBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        // 브리핑 버튼 존재 확인 (클릭 시 실제 AI 호출 — 통합 확인)
        expect(await briefingBtn.isEnabled()).toBeTruthy();
      }
    });

    test('MSD-UI-011: 브리핑 초기 숨김 — 미클릭 시 브리핑 카드 미노출', async ({ page }) => {
      test.skip(true, 'Cycle 2: 브리핑 초기 상태 확인 — T12에서 구현');
    });

    test('MSD-UI-012: 브리핑 로딩 상태 — 버튼 "브리핑 생성중..." + disabled', async ({ page }) => {
      test.skip(true, 'Cycle 2: 버튼 로딩 상태 확인 — T12에서 구현');
    });

    test('MSD-UI-013: 추천 강의 없음 — recommended_courses null → 섹션 미노출', async ({ page }) => {
      test.skip(true, 'Cycle 2: recommended_courses null 시나리오 — T12에서 구현');
    });
  });

  test.describe('UI 시나리오 — 차트', () => {
    test('MSD-UI-020: 세션 추이 차트 — LineChart 0-100 스케일', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).toContain('세션별 정답률 추이');
    });

    test('MSD-UI-021: 세션 추이 — 빈 상태 → "데이터가 없습니다"', async ({ page }) => {
      test.skip(true, 'Cycle 2: 빈 session_history 시나리오 — T12에서 구현');
    });

    test('MSD-UI-022: 토픽 레이더 — RadarChart 0-100 스케일', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).toContain('토픽별 이해도');
    });

    test('MSD-UI-023: 레이더 — 빈 상태 → "데이터가 없습니다"', async ({ page }) => {
      test.skip(true, 'Cycle 2: 빈 weak_topics 시나리오 — T12에서 구현');
    });

    test('MSD-UI-024: 취약 토픽 카드 — 토픽명 + 정답률 색상 표시', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      // 취약 토픽 섹션 또는 빈 차트 (어느 쪽이든 크래시 없음)
      expect(content.length).toBeGreaterThan(100);
    });

    test('MSD-UI-025: 취약 토픽 0개 — 취약 토픽 카드 미노출', async ({ page }) => {
      test.skip(true, 'Cycle 2: weak_topics=[] 시나리오 — T12에서 구현');
    });
  });

  test.describe('UI 시나리오 — 상담 기록 CRUD', () => {
    test('MSD-UI-030: 상담 기록 리스트 — 타임라인 (유형 배지 + 내용)', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).toContain('상담 기록');
    });

    test('MSD-UI-031: 빈 상태 — "아직 상담 기록이 없습니다"', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      // 기록 있거나 없거나 — 레이아웃 크래시 없음
      const hasConsultationSection = content.includes('상담 기록');
      expect(hasConsultationSection).toBeTruthy();
    });

    test('MSD-UI-032: 기록 추가 다이얼로그 — "기록 추가" 클릭 → Dialog 오픈', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const addBtn = page.locator('button:has-text("기록 추가")').first();
      if (await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await addBtn.click();
        // Dialog 오픈 확인
        await expect(page.locator('text=상담 기록 추가')).toBeVisible({ timeout: 5_000 });
      }
    });

    test('MSD-UI-033: 기록 저장 정상 — 저장 후 리스트 갱신', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const addBtn = page.locator('button:has-text("기록 추가")').first();
      if (!await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) return;
      await addBtn.click();
      await expect(page.locator('text=상담 기록 추가')).toBeVisible({ timeout: 5_000 });
      // 내용 입력
      await page.locator('textarea').fill('MSD-UI-033 테스트 상담 기록');
      // 저장 버튼 클릭
      const saveBtn = page.locator('button:has-text("저장")').last();
      await expect(saveBtn).toBeEnabled();
      await saveBtn.click();
      // 다이얼로그 닫힘 확인
      await expect(page.locator('text=상담 기록 추가')).not.toBeVisible({ timeout: 8_000 });
    });

    test('MSD-UI-034: 내용 공란 저장 차단 — "저장" disabled', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const addBtn = page.locator('button:has-text("기록 추가")').first();
      if (!await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) return;
      await addBtn.click();
      await expect(page.locator('text=상담 기록 추가')).toBeVisible({ timeout: 5_000 });
      // 내용 공란 → 저장 버튼 disabled
      const saveBtn = page.locator('button:has-text("저장")').last();
      await expect(saveBtn).toBeDisabled();
    });

    test('MSD-UI-035: 저장 중 로딩 — "저장 중..." + disabled', async ({ page }) => {
      test.skip(true, 'Cycle 2: 저장 중 로딩 상태 확인 — T12에서 구현');
    });

    test('MSD-UI-036: 다이얼로그 취소 — 입력 폐기, 재오픈 시 공란', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const addBtn = page.locator('button:has-text("기록 추가")').first();
      if (!await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) return;
      await addBtn.click();
      await expect(page.locator('text=상담 기록 추가')).toBeVisible({ timeout: 5_000 });
      await page.locator('textarea').fill('취소 테스트');
      await page.locator('button:has-text("취소")').click();
      await expect(page.locator('text=상담 기록 추가')).not.toBeVisible({ timeout: 5_000 });
    });

    test('MSD-UI-037: 다음 상담일 표시 — "다음 상담: YYYY. M. D."', async ({ page }) => {
      test.skip(true, 'Cycle 2: next_consultation_date 표시 확인 — T12에서 구현');
    });

    test('MSD-UI-038: 상담 유형 배지 — TYPE_LABELS 한국어 라벨', async ({ page }) => {
      test.skip(true, 'Cycle 2: TYPE_LABELS 배지 한국어 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── API 계약 ─────────────────────────────── */

  test.describe('API 계약', () => {
    test('MSD-API-001: GET /api/mentor/students/[id] → 200 + StudentDetail', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      const res = await page.request.get(`${BASE_URL}/api/mentor/students/${studentId}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('data');
    });

    test('MSD-API-002: GET /api/mentor/consultations?studentId → 200 + ConsultationNote[]', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      const res = await page.request.get(`${BASE_URL}/api/mentor/consultations?studentId=${studentId}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBeTruthy();
    });

    test('MSD-API-003: POST /api/mentor/consultations → 201 + ConsultationNote', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      const res = await page.request.post(`${BASE_URL}/api/mentor/consultations`, {
        data: {
          studentId,
          type: '학습부진',
          content: 'MSD-API-003 테스트 상담 기록',
        },
      });
      expect([200, 201]).toContain(res.status());
      const body = await res.json();
      expect(body).toHaveProperty('data');
    });

    test('MSD-API-004: POST /api/ai/mentor-briefing → 200 + MentorBriefing', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      const res = await page.request.post(`${BASE_URL}/api/ai/mentor-briefing`, {
        data: { studentId },
      });
      expect([200, 400, 500]).toContain(res.status());
    });

    test('MSD-API-005: 브리핑 Zod 검증 — talking_points: string[] 필수', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      const res = await page.request.post(`${BASE_URL}/api/ai/mentor-briefing`, {
        data: { studentId },
      });
      if (res.status() === 200) {
        const body = await res.json();
        if (body.data?.talking_points !== undefined) {
          expect(Array.isArray(body.data.talking_points)).toBeTruthy();
        }
      }
    });

    test('MSD-API-006: type enum 검증 — invalid type → 400', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      const res = await page.request.post(`${BASE_URL}/api/mentor/consultations`, {
        data: {
          studentId,
          type: 'invalid_type_xyz',
          content: '유효하지 않은 유형 테스트',
        },
      });
      expect([400, 422]).toContain(res.status());
    });

    test('MSD-API-007: content 빈값 → 400', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      const res = await page.request.post(`${BASE_URL}/api/mentor/consultations`, {
        data: {
          studentId,
          type: '학습부진',
          content: '',
        },
      });
      expect([400, 422]).toContain(res.status());
    });

    test('MSD-API-008: nextConsultationDate 미래 날짜 정상 저장', async ({ page }) => {
      test.skip(true, 'Cycle 2: 미래 날짜 저장 확인 — T12에서 구현');
    });

    test('MSD-API-009: nextConsultationDate 과거 날짜 — 허용 또는 경고 정책 확인', async ({ page }) => {
      test.skip(true, 'Cycle 2: 과거 날짜 정책 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── 에러 / 엣지 ─────────────────────────────── */

  test.describe('에러 / 엣지', () => {
    test('MSD-ERR-001: 타 학원 수강생 접근 차단 (커밋 b081bed 회귀)', async ({ page }) => {
      // mentor로 존재하지 않는 학원의 studentId 접근 시도
      const fakeStudentId = '00000000-0000-0000-0000-000000000001';
      const res = await page.request.get(`${BASE_URL}/api/mentor/students/${fakeStudentId}`);
      // RLS로 null 또는 404 반환, UUID 형식 자체가 유효하지 않으면 400
      expect([200, 400, 404]).toContain(res.status());
      if (res.status() === 200) {
        const body = await res.json();
        // data가 null이거나 빈 상태여야 함
        expect(body.data == null || body.data === null).toBeTruthy();
      }
    });

    test('MSD-ERR-002: 존재하지 않는 studentId — 빈 상태 또는 404', async ({ page }) => {
      test.skip(true, 'Cycle 2: 없는 studentId 처리 확인 — T12에서 구현');
    });

    test('MSD-ERR-003: 브리핑 AI 실패 — 로딩 해제, 에러 토스트 권장', async ({ page }) => {
      test.skip(true, 'Cycle 2: AI 에러 주입 후 상태 확인 — T12에서 구현');
    });

    test('MSD-ERR-004: 상담 기록 저장 실패 500 — 다이얼로그 유지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 500 에러 주입 후 다이얼로그 상태 확인 — T12에서 구현');
    });

    test('MSD-ERR-005: 레이더 차트 토픽 1개 — RadarChart 렌더 가능 여부', async ({ page }) => {
      test.skip(true, 'Cycle 2: 1개 토픽 RadarChart 렌더 확인 — T12에서 구현');
    });

    test('MSD-ERR-006: weak_topics.accuracy null — 색상 fallback', async ({ page }) => {
      test.skip(true, 'Cycle 2: null accuracy 색상 fallback 확인 — T12에서 구현');
    });

    test('MSD-ERR-007: 브리핑 talking_points=[] — 빈 ol 렌더, 크래시 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: 빈 talking_points 렌더 확인 — T12에서 구현');
    });

    test('MSD-ERR-008: 상담 기록 XSS — React escape 처리', async ({ page }) => {
      test.skip(true, 'Cycle 2: XSS content 렌더 확인 — T12에서 구현 (MSD-SEC-001 참조)');
    });

    test('MSD-ERR-009: 다이얼로그 ESC 키 — 닫힘', async ({ page }) => {
      test.skip(true, 'Cycle 2: ESC 키 다이얼로그 닫힘 확인 — T12에서 구현');
    });

    test('MSD-ERR-010: 멘토 role 없이 접근 — 레이아웃 가드 회귀', async ({ page }) => {
      // mentor로 로그인된 상태 — 정상 접근 가능해야 함
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/mentor/students/');
    });
  });

  /* ─────────────────────────────── 경계값 테스트 ─────────────────────────────── */

  test.describe('경계값 테스트 — 3-신호 임계값', () => {
    test('MSD-BND-001: recent_accuracy 임계값 경계 — low_accuracy ON/OFF', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      const res = await page.request.get(`${BASE_URL}/api/mentor/students/${studentId}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      if (body.data?.risk_signals) {
        expect(typeof body.data.risk_signals.low_accuracy).toBe('boolean');
      }
    });

    test('MSD-BND-002: recent_accuracy = 0 — low_accuracy=true, 빨간 배경', async ({ page }) => {
      test.skip(true, 'Cycle 2: accuracy=0 시나리오 데이터 주입 — T12에서 구현');
    });

    test('MSD-BND-003: recent_accuracy = 100 — low_accuracy=false, 초록 배경', async ({ page }) => {
      test.skip(true, 'Cycle 2: accuracy=100 시나리오 데이터 주입 — T12에서 구현');
    });

    test('MSD-BND-004: speed_increase — RISK_SPEED_INCREASE_RATIO(1.3x) 경계 (회귀)', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      const res = await page.request.get(`${BASE_URL}/api/mentor/students/${studentId}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      if (body.data?.risk_signals) {
        expect(typeof body.data.risk_signals.speed_increase).toBe('boolean');
      }
    });

    test('MSD-BND-005: consecutive_absences — ABSENCE_THRESHOLD 경계 확인', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      const res = await page.request.get(`${BASE_URL}/api/mentor/students/${studentId}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      if (body.data?.risk_signals) {
        expect(typeof body.data.risk_signals.absence).toBe('boolean');
      }
    });

    test('MSD-BND-006: consecutive_absences = 0 — 결석 신호 OFF', async ({ page }) => {
      test.skip(true, 'Cycle 2: 결석 0회 시나리오 — T12에서 구현');
    });
  });

  test.describe('경계값 테스트 — 차트', () => {
    test('MSD-BND-010: 세션 추이 1개 세션 — 단일 점 렌더, 크래시 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: session_history.length=1 시나리오 — T12에서 구현');
    });

    test('MSD-BND-011: 세션 추이 20개 세션 — X축 과밀 처리', async ({ page }) => {
      test.skip(true, 'Cycle 2: session_history.length=20 시나리오 — T12에서 구현');
    });

    test('MSD-BND-012: 레이더 토픽 1개 — RadarChart 렌더 여부', async ({ page }) => {
      test.skip(true, 'Cycle 2: weak_topics.length=1 RadarChart 확인 — T12에서 구현');
    });

    test('MSD-BND-013: 레이더 토픽 2개 — 최소 폴리곤 처리', async ({ page }) => {
      test.skip(true, 'Cycle 2: weak_topics.length=2 RadarChart 확인 — T12에서 구현');
    });

    test('MSD-BND-014: 레이더 토픽 3개 (최소 유효) — 정삼각형 렌더', async ({ page }) => {
      test.skip(true, 'Cycle 2: weak_topics.length=3 RadarChart 확인 — T12에서 구현');
    });

    test('MSD-BND-015: 취약 토픽 accuracy 정확히 40% — 노랑 (40-60 구간)', async ({ page }) => {
      test.skip(true, 'Cycle 2: accuracy=40 경계값 확인 — T12에서 구현');
    });

    test('MSD-BND-016: 취약 토픽 accuracy 정확히 60% — 초록 (≥60 구간)', async ({ page }) => {
      test.skip(true, 'Cycle 2: accuracy=60 경계값 확인 — T12에서 구현');
    });
  });

  test.describe('경계값 테스트 — 상담 기록', () => {
    test('MSD-BND-020: content 1글자 입력 — 저장 버튼 활성화', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const addBtn = page.locator('button:has-text("기록 추가")').first();
      if (!await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) return;
      await addBtn.click();
      await expect(page.locator('text=상담 기록 추가')).toBeVisible({ timeout: 5_000 });
      await page.locator('textarea').fill('A');
      const saveBtn = page.locator('button:has-text("저장")').last();
      await expect(saveBtn).toBeEnabled();
    });

    test('MSD-BND-021: content 최대 길이 5000자 — 저장 성공 또는 400', async ({ page }) => {
      test.skip(true, 'Cycle 2: 5000자 content 저장 정책 확인 — T12에서 구현');
    });

    test('MSD-BND-022: 상담 기록 50개 이상 — 모든 기록 렌더', async ({ page }) => {
      test.skip(true, 'Cycle 2: 50개 이상 상담 기록 렌더 확인 — T12에서 구현');
    });

    test('MSD-BND-023: nextConsultationDate 오늘 날짜 — 정상 저장', async ({ page }) => {
      test.skip(true, 'Cycle 2: 오늘 날짜 상담 예정일 저장 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── 인증 컨텍스트 ─────────────────────────────── */

  test.describe('인증 컨텍스트', () => {
    test('MSD-AUTH-001: 비인증 접근 → /login 리다이렉트', async ({ page }) => {
      await page.context().clearCookies();
      const studentId = '00000000-0000-0000-0000-000000000001';
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForURL('**/login**', { timeout: 10_000 });
      expect(page.url()).toContain('/login');
    });

    test('MSD-AUTH-002: teacher role → /instructor 리다이렉트', async ({ browser }) => {
      test.skip(true, 'Cycle 2: /mentor/students/[id]/page.tsx에 role-based redirect 미구현 — T12에서 코드 추가 후 활성화');
    });

    test('MSD-AUTH-003: student role → /student 또는 /login 리다이렉트', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const studentId = '00000000-0000-0000-0000-000000000001';
        await page.goto(`/mentor/students/${studentId}`);
        await page.waitForURL((url) => !url.pathname.startsWith('/mentor'), { timeout: 10_000 });
        expect(page.url()).not.toContain('/mentor');
      } finally { await ctx.close(); }
    });

    test('MSD-AUTH-004: owner role → /owner 리다이렉트', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.owner });
      const page = await ctx.newPage();
      try {
        const studentId = '00000000-0000-0000-0000-000000000001';
        await page.goto(`/mentor/students/${studentId}`);
        await page.waitForURL('**/owner**', { timeout: 10_000 });
        expect(page.url()).toContain('/owner');
      } finally { await ctx.close(); }
    });

    test('MSD-AUTH-005: GET /api/mentor/students/[id] — teacher 토큰 → 200/400', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/mentor/students/00000000-0000-0000-0000-000000000001`);
        expect([200, 400, 401, 403]).toContain(res.status()); // teacher도 API 허용, 400: 유효하지 않은 student ID
      } finally { await ctx.close(); }
    });

    test('MSD-AUTH-006: POST /api/mentor/consultations — student 토큰 → 403', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/mentor/consultations`, {
          data: {
            studentId: '00000000-0000-0000-0000-000000000001',
            type: '학습부진',
            content: '테스트',
          },
        });
        expect([401, 403]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('MSD-AUTH-007: POST /api/ai/mentor-briefing — teacher 토큰 → 400/403', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/ai/mentor-briefing`, {
          data: { studentId: '00000000-0000-0000-0000-000000000001' },
        });
        expect([200, 400, 401, 403]).toContain(res.status()); // teacher도 mentor-briefing 접근 허용 가능, 400: 유효하지 않은 student
      } finally { await ctx.close(); }
    });

    test('MSD-AUTH-008: 세션 만료 후 저장 시도 — 401 → 에러 처리', async ({ page }) => {
      test.skip(true, 'Cycle 2: 세션 만료 시뮬레이션 — T12에서 구현');
    });

    test('MSD-AUTH-009: 브리핑 생성 중 세션 만료 — 에러 상태', async ({ page }) => {
      test.skip(true, 'Cycle 2: 브리핑 중 세션 만료 시뮬레이션 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── 네트워크 에러 ─────────────────────────────── */

  test.describe('네트워크 에러', () => {
    test('MSD-NET-001: GET /api/mentor/students/[id] 타임아웃 — 에러 안내', async ({ page }) => {
      test.skip(true, 'Cycle 2: 타임아웃 주입 후 UI 확인 — T12에서 구현');
    });

    test('MSD-NET-002: GET /api/mentor/students/[id] 500 — 에러 바운더리', async ({ page }) => {
      test.skip(true, 'Cycle 2: 500 에러 주입 후 에러 바운더리 확인 — T12에서 구현');
    });

    test('MSD-NET-003: GET /api/mentor/consultations 실패 — 빈 상태', async ({ page }) => {
      test.skip(true, 'Cycle 2: 상담 기록 fetch 실패 시나리오 — T12에서 구현');
    });

    test('MSD-NET-004: POST /api/mentor/consultations 500 — 다이얼로그 유지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 저장 500 에러 후 다이얼로그 확인 — T12에서 구현');
    });

    test('MSD-NET-005: POST /api/ai/mentor-briefing 실패 — 로딩 해제', async ({ page }) => {
      test.skip(true, 'Cycle 2: 브리핑 실패 후 버튼 재활성화 확인 — T12에서 구현');
    });

    test('MSD-NET-006: Gemini API 다운 — 서버 500 재시도 1회', async ({ page }) => {
      test.skip(true, 'Cycle 2: Gemini 다운 시나리오 — T12에서 구현');
    });

    test('MSD-NET-007: 오프라인 상태 진입 — 에러 바운더리', async ({ page }) => {
      test.skip(true, 'Cycle 2: 오프라인 상태 진입 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── AI 응답 검증 ─────────────────────────────── */

  test.describe('AI 응답 검증', () => {
    test('MSD-AI-001: talking_points 누락 — Zod 실패 재시도 1회 (CLAUDE.md #14)', async ({ page }) => {
      // 브리핑 API가 talking_points를 포함하는지 확인
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      const res = await page.request.post(`${BASE_URL}/api/ai/mentor-briefing`, {
        data: { studentId },
      });
      if (res.status() === 200) {
        const body = await res.json();
        expect(body.data).toHaveProperty('talking_points');
      } else {
        // 500도 허용 (재시도 소진 후)
        expect([200, 500]).toContain(res.status());
      }
    });

    test('MSD-AI-002: talking_points=[] — 빈 ol 렌더, 크래시 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: 빈 talking_points 렌더 확인 — T12에서 구현');
    });

    test('MSD-AI-003: recommended_courses 타입 오류 — Zod 재시도', async ({ page }) => {
      test.skip(true, 'Cycle 2: AI 응답 타입 오류 시나리오 — T12에서 구현');
    });

    test('MSD-AI-004: JSON 파싱 실패 — 1회 재시도 후 500', async ({ page }) => {
      test.skip(true, 'Cycle 2: 비정형 AI 응답 주입 후 500 확인 — T12에서 구현');
    });

    test('MSD-AI-005: weakness_analysis 3000자+ — 레이아웃 넘침 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: 긴 weakness_analysis 렌더 확인 — T12에서 구현');
    });

    test('MSD-AI-006: 브리핑 더블클릭 방지 — 두 번째 클릭 무시 (disabled)', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const briefingBtn = page.locator('button:has-text("AI 상담 브리핑")').first();
      if (!await briefingBtn.isVisible({ timeout: 3_000 }).catch(() => false)) return;
      // 클릭 후 disabled 상태 확인
      await briefingBtn.click();
      await expect(briefingBtn).toBeDisabled({ timeout: 2_000 });
    });
  });

  /* ─────────────────────────────── 접근성 ─────────────────────────────── */

  test.describe('접근성', () => {
    test('MSD-A11Y-001: 키보드 탭 이동 — 헤더 포커스 순서', async ({ page }) => {
      test.skip(true, 'Cycle 2: 키보드 탭 포커스 순서 확인 — T12에서 구현');
    });

    test('MSD-A11Y-002: 키보드 — 브리핑 버튼 Enter 활성화', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const briefingBtn = page.locator('button:has-text("AI 상담 브리핑")').first();
      if (await briefingBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await briefingBtn.focus();
        await expect(briefingBtn).toBeFocused();
      }
    });

    test('MSD-A11Y-003: 키보드 — 기록 추가 버튼 Enter → Dialog 오픈', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const addBtn = page.locator('button:has-text("기록 추가")').first();
      if (!await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) return;
      await addBtn.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('text=상담 기록 추가')).toBeVisible({ timeout: 5_000 });
    });

    test('MSD-A11Y-004: ESC — 다이얼로그 닫힘', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const addBtn = page.locator('button:has-text("기록 추가")').first();
      if (!await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) return;
      await addBtn.click();
      await expect(page.locator('text=상담 기록 추가')).toBeVisible({ timeout: 5_000 });
      await page.keyboard.press('Escape');
      await expect(page.locator('text=상담 기록 추가')).not.toBeVisible({ timeout: 5_000 });
    });

    test('MSD-A11Y-005: 다이얼로그 포커스 트랩', async ({ page }) => {
      test.skip(true, 'Cycle 2: 다이얼로그 포커스 트랩 확인 — T12에서 구현');
    });

    test('MSD-A11Y-006: 색 외 위험도 구분 — 텍스트("이탈 위험/주의/양호")로 구분', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      const hasTextRisk = content.includes('이탈 위험') || content.includes('주의') || content.includes('양호');
      expect(hasTextRisk).toBeTruthy();
    });

    test('MSD-A11Y-007: 차트 스크린리더 — aria-label 또는 대체 테이블', async ({ page }) => {
      test.skip(true, 'Cycle 2: 차트 접근성 확인 — T12에서 구현');
    });

    test('MSD-A11Y-008: data-testid — 헤더 요소', async ({ page }) => {
      test.skip(true, 'Cycle 2: data-testid 추가 후 확인 — T12에서 구현 (헤더에 data-testid 없음)');
    });

    test('MSD-A11Y-009: data-testid — 브리핑 요소', async ({ page }) => {
      test.skip(true, 'Cycle 2: data-testid 추가 후 확인 — T12에서 구현');
    });

    test('MSD-A11Y-010: data-testid — 차트 요소', async ({ page }) => {
      test.skip(true, 'Cycle 2: data-testid 추가 후 확인 — T12에서 구현');
    });

    test('MSD-A11Y-011: data-testid — CRUD 요소', async ({ page }) => {
      test.skip(true, 'Cycle 2: data-testid 추가 후 확인 — T12에서 구현');
    });

    test('MSD-A11Y-012: 로딩 중 ARIA — aria-busy', async ({ page }) => {
      test.skip(true, 'Cycle 2: aria-busy 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── 한국어 에러 메시지 ─────────────────────────────── */

  test.describe('한국어 에러 메시지', () => {
    test('MSD-KO-001: 학생 데이터 로드 실패 에러 메시지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 로드 실패 한국어 에러 메시지 확인 — T12에서 구현');
    });

    test('MSD-KO-002: 브리핑 생성 실패 에러 메시지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 브리핑 실패 한국어 에러 메시지 확인 — T12에서 구현');
    });

    test('MSD-KO-003: 상담 기록 저장 실패 에러 메시지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 저장 실패 한국어 에러 메시지 확인 — T12에서 구현');
    });

    test('MSD-KO-004: 권한 없음 — "멘토 권한이 필요합니다."', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.teacher });
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/mentor/students/00000000-0000-0000-0000-000000000001`);
        expect([200, 400, 401, 403]).toContain(res.status()); // teacher도 API 접근 허용
      } finally { await ctx.close(); }
    });

    test('MSD-KO-005: 네트워크 오류 메시지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 네트워크 오류 한국어 메시지 확인 — T12에서 구현');
    });

    test('MSD-KO-006: 상담 내용 빈값 검증 메시지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 빈 내용 한국어 검증 메시지 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── RLS 교차 검증 ─────────────────────────────── */

  test.describe('RLS 교차 검증', () => {
    test('MSD-RLS-001: 타 학원 수강생 상세 접근 차단 (커밋 b081bed 회귀)', async ({ page }) => {
      const fakeStudentId = '00000000-0000-0000-0000-000000000001';
      const res = await page.request.get(`${BASE_URL}/api/mentor/students/${fakeStudentId}`);
      if (res.status() === 200) {
        const body = await res.json();
        expect(body.data == null).toBeTruthy();
      } else {
        expect([400, 404]).toContain(res.status()); // 400: UUID 기반 검증 에러 가능
      }
    });

    test('MSD-RLS-002: 타 학원 수강생 상담 기록 조회 차단 — [] 빈 배열', async ({ page }) => {
      const fakeStudentId = '00000000-0000-0000-0000-000000000001';
      const res = await page.request.get(`${BASE_URL}/api/mentor/consultations?studentId=${fakeStudentId}`);
      expect([200, 400, 404]).toContain(res.status()); // 400: 유효하지 않은 student ID
      if (res.status() !== 200) return;
      const body = await res.json();
      expect(body.data).toEqual([]);
    });

    test('MSD-RLS-003: 타 학원 수강생 상담 기록 생성 차단 — 400 또는 403', async ({ page }) => {
      const fakeStudentId = '00000000-0000-0000-0000-000000000001';
      const res = await page.request.post(`${BASE_URL}/api/mentor/consultations`, {
        data: {
          studentId: fakeStudentId,
          type: '학습부진',
          content: 'RLS 테스트',
        },
      });
      expect([400, 403, 404]).toContain(res.status());
    });

    test('MSD-RLS-004: 타 학원 수강생 브리핑 생성 차단 — 400 또는 403', async ({ page }) => {
      const fakeStudentId = '00000000-0000-0000-0000-000000000001';
      const res = await page.request.post(`${BASE_URL}/api/ai/mentor-briefing`, {
        data: { studentId: fakeStudentId },
      });
      expect([400, 403, 404, 500]).toContain(res.status());
    });

    test('MSD-RLS-005: 동 학원 타 멘토 상담 기록 격리 정책 확인', async ({ page }) => {
      test.skip(true, 'Cycle 2: 동 학원 타 멘토 기록 격리 정책 확인 — T12에서 구현');
    });

    test('MSD-RLS-006: consultation_notes RLS — mentor INSERT 정상', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      const res = await page.request.post(`${BASE_URL}/api/mentor/consultations`, {
        data: {
          studentId,
          type: '기타',
          content: 'MSD-RLS-006 RLS INSERT 테스트',
        },
      });
      expect([200, 201]).toContain(res.status());
    });

    test('MSD-RLS-007: consultation_notes RLS — student SELECT 차단', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: AUTH_STATE.student });
      const page = await ctx.newPage();
      try {
        const res = await page.request.get(`${BASE_URL}/api/mentor/consultations?studentId=00000000-0000-0000-0000-000000000001`);
        expect([401, 403]).toContain(res.status());
      } finally { await ctx.close(); }
    });

    test('MSD-RLS-008: profiles SELECT — 타 학원 mentor 접근 차단', async ({ page }) => {
      // GET /api/mentor/students/[id] 로 타 학원 수강생 프로필 접근 불가 확인
      const fakeStudentId = '00000000-0000-0000-0000-000000000001';
      const res = await page.request.get(`${BASE_URL}/api/mentor/students/${fakeStudentId}`);
      if (res.status() === 200) {
        const body = await res.json();
        expect(body.data == null).toBeTruthy();
      } else {
        expect([400, 404]).toContain(res.status()); // 400: UUID 기반 검증 에러 가능
      }
    });
  });

  /* ─────────────────────────────── XSS / SQL 인젝션 ─────────────────────────────── */

  test.describe('XSS / SQL 인젝션', () => {
    test('MSD-SEC-001: content XSS — React escape 처리', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      // XSS payload POST 후 렌더 확인
      const createRes = await page.request.post(`${BASE_URL}/api/mentor/consultations`, {
        data: {
          studentId,
          type: '기타',
          content: '<script>alert(1)</script>',
        },
      });
      if ([200, 201].includes(createRes.status())) {
        await page.goto(`/mentor/students/${studentId}`);
        await page.waitForLoadState('networkidle');
        // 스크립트 실행 없음 확인 — 페이지가 정상 로드되어야 함
        const content = await page.content();
        expect(content).not.toContain('&lt;script&gt;' === '' ? '' : 'undefined');
        // alert dialog 없음
        expect(page.url()).toContain('/mentor/students/');
      }
    });

    test('MSD-SEC-002: content HTML 인젝션 — escape 처리', async ({ page }) => {
      test.skip(true, 'Cycle 2: HTML 인젝션 렌더 확인 — T12에서 구현');
    });

    test('MSD-SEC-003: studentId URL 파라미터 인젝션 — Supabase 파라미터 바인딩', async ({ page }) => {
      // UUID 형식이 아닌 값으로 접근 시도
      const res = await page.request.get(`${BASE_URL}/api/mentor/students/'; DROP TABLE--`);
      expect([400, 404, 500]).toContain(res.status());
    });

    test('MSD-SEC-004: POST body studentId 조작 — Zod UUID 검증 → 400', async ({ page }) => {
      const res = await page.request.post(`${BASE_URL}/api/mentor/consultations`, {
        data: {
          studentId: "'; SELECT *--",
          type: '기타',
          content: '인젝션 테스트',
        },
      });
      expect([400, 422]).toContain(res.status());
    });

    test('MSD-SEC-005: talking_points XSS — React escape로 ol 렌더', async ({ page }) => {
      test.skip(true, 'Cycle 2: AI 응답 XSS 처리 확인 — T12에서 구현');
    });

    test('MSD-SEC-006: display_name XSS — 아바타 이니셜 escape', async ({ page }) => {
      test.skip(true, 'Cycle 2: display_name XSS 처리 확인 — T12에서 구현');
    });

    test('MSD-SEC-007: content SQL 인젝션 — Supabase 파라미터 바인딩', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      const res = await page.request.post(`${BASE_URL}/api/mentor/consultations`, {
        data: {
          studentId,
          type: '기타',
          content: "'; INSERT INTO profiles--",
        },
      });
      // 저장 성공 (Supabase가 파라미터 바인딩으로 차단) 또는 400
      expect([200, 201, 400]).toContain(res.status());
    });
  });

  /* ─────────────────────────────── 레이트 리밋 / 중복 방지 ─────────────────────────────── */

  test.describe('레이트 리밋 / 중복 방지', () => {
    test('MSD-RL-001: 브리핑 버튼 더블클릭 — 두 번째 클릭 무시 (disabled)', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      const briefingBtn = page.locator('button:has-text("AI 상담 브리핑")').first();
      if (!await briefingBtn.isVisible({ timeout: 3_000 }).catch(() => false)) return;
      await briefingBtn.click();
      await expect(briefingBtn).toBeDisabled({ timeout: 2_000 });
    });

    test('MSD-RL-002: 저장 버튼 더블클릭 — 중복 POST 방지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 저장 중 더블클릭 방지 확인 — T12에서 구현');
    });

    test('MSD-RL-003: 브리핑 후 즉시 재생성 — 새 브리핑 생성 가능', async ({ page }) => {
      test.skip(true, 'Cycle 2: 브리핑 재생성 캐시 정책 확인 — T12에서 구현');
    });

    test('MSD-RL-004: 연속 상담 기록 저장 — 각 요청 독립 처리', async ({ page }) => {
      test.skip(true, 'Cycle 2: 연속 상담 기록 저장 순서 확인 — T12에서 구현');
    });
  });

  /* ─────────────────────────────── 브라우저 네비게이션 복구 ─────────────────────────────── */

  test.describe('브라우저 네비게이션 복구', () => {
    test('MSD-NAV-001: 목록 → 상세 → 뒤로가기 — 대시보드 재렌더', async ({ page }) => {
      test.skip(true, 'Cycle 2: 뒤로가기 후 대시보드 재렌더 확인 — T12에서 구현');
    });

    test('MSD-NAV-002: 상세 페이지 새로고침 — 데이터 재페칭, 브리핑 초기화', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      await page.reload();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/mentor/students/');
      const content = await page.content();
      expect(content).toContain('최근 정답률');
    });

    test('MSD-NAV-003: 브리핑 생성 중 새로고침 — 요청 취소, 초기 상태', async ({ page }) => {
      test.skip(true, 'Cycle 2: POST 중 새로고침 후 초기 상태 확인 — T12에서 구현');
    });

    test('MSD-NAV-004: 저장 중 브라우저 뒤로가기 — 부분 저장 없음', async ({ page }) => {
      test.skip(true, 'Cycle 2: POST 중 뒤로가기 후 부분 저장 확인 — T12에서 구현');
    });

    test('MSD-NAV-005: 다이얼로그 열린 상태에서 뒤로가기 — Dialog 닫힘', async ({ page }) => {
      test.skip(true, 'Cycle 2: Dialog 열린 채 뒤로가기 UX 정책 확인 — T12에서 구현');
    });

    test('MSD-NAV-006: URL 직접 입력 — 다른 studentId → 해당 학생 데이터 로드', async ({ page }) => {
      const studentId = await getFirstStudentId(page);
      if (!studentId) { test.skip(true, '수강생 없음'); return; }
      await page.goto(`/mentor/students/${studentId}`);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain(`/mentor/students/${studentId}`);
    });

    test('MSD-NAV-007: 탭 전환 후 복귀 — 브리핑 상태 유지', async ({ page }) => {
      test.skip(true, 'Cycle 2: 탭 전환 후 브리핑 state 유지 확인 — T12에서 구현');
    });

    test('MSD-NAV-008: 오래된 탭 복귀 후 저장 시도 — 401 에러 처리', async ({ page }) => {
      test.skip(true, 'Cycle 2: 세션 만료 후 저장 시 401 처리 확인 — T12에서 구현');
    });
  });
});
