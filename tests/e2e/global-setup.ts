import { chromium } from '@playwright/test';
import fs from 'fs';
import { TEST_USERS, AUTH_STATE, AUTH_STATE_DIR } from './fixtures/users';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

const SERVER_READY_TIMEOUT_MS = 120_000;
const SERVER_READY_POLL_INTERVAL_MS = 1_000;

async function waitForServer(): Promise<void> {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE_URL, { method: 'HEAD' });
      if (res.status < 500) {
        console.log('[global-setup] 서버 준비 완료');
        return;
      }
    } catch {
      // 아직 기동 중 — 재시도
    }
    await new Promise((resolve) => setTimeout(resolve, SERVER_READY_POLL_INTERVAL_MS));
  }
  throw new Error(`[global-setup] 서버가 ${SERVER_READY_TIMEOUT_MS}ms 내에 응답하지 않았습니다.`);
}

type RegisterPayload = {
  email: string;
  password: string;
  display_name: string;
  role: string;
  academy_name?: string;
};

async function registerUser(payload: RegisterPayload): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.status === 409) {
    // 이미 존재 — 정상
    return true;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.warn(`[global-setup] 계정 생성 실패 (${payload.email}): ${JSON.stringify(body)}`);
    return false;
  }

  return true;
}

async function saveAuthState(
  email: string,
  password: string,
  storageStatePath: string,
): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#email', email);
    await page.fill('#password', password);
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 }),
      page.click('button[type="submit"]'),
    ]);

    // Cycle 2 warm-up: Server Component 렌더 + 쿠키 리프레시 사이클 완주
    await page.waitForLoadState('networkidle', { timeout: 10_000 });
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    await context.storageState({ path: storageStatePath });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function cleanupTestSessions(storageStatePath: string): Promise<void> {
  if (!fs.existsSync(storageStatePath)) return;
  try {
    const state = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8')) as {
      cookies: Array<{ name: string; value: string; domain: string }>;
    };
    const cookieHeader = state.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    if (!cookieHeader) return;

    // 테스트 강사 계정의 모든 세션 목록 조회
    const listRes = await fetch(`${BASE_URL}/api/sessions`, {
      headers: { Cookie: cookieHeader },
    });
    if (!listRes.ok) return;

    const { data: sessions } = await listRes.json().catch(() => ({ data: [] }));
    if (!Array.isArray(sessions) || sessions.length === 0) return;

    // 병렬로 삭제 (최대 20개씩 배치)
    const BATCH_SIZE = 20;
    for (let i = 0; i < sessions.length; i += BATCH_SIZE) {
      const batch = sessions.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((s: { id: string }) =>
          fetch(`${BASE_URL}/api/sessions/${s.id}`, {
            method: 'DELETE',
            headers: { Cookie: cookieHeader },
          }).catch(() => {})
        )
      );
    }
    console.log(`[global-setup] 테스트 세션 ${sessions.length}개 정리 완료`);
  } catch {
    // 세션 정리 실패는 치명적이지 않음 — 경고 후 계속 진행
    console.warn('[global-setup] 세션 정리 중 오류 발생 (무시하고 진행)');
  }
}

export default async function globalSetup() {
  // Next.js 서버 cold-start 대기 — 1,143개 규모 flaky 차단
  await waitForServer();

  fs.mkdirSync(AUTH_STATE_DIR, { recursive: true });

  // 1. owner 먼저 가입 (학원 생성)
  const ownerOk = await registerUser({
    email: TEST_USERS.owner.email,
    password: TEST_USERS.owner.password,
    display_name: TEST_USERS.owner.displayName,
    role: TEST_USERS.owner.role,
    academy_name: TEST_USERS.owner.academyName,
  });

  // 2. teacher / student / mentor 가입 (학원이 존재해야 함)
  const teacherOk = await registerUser({
    email: TEST_USERS.teacher.email,
    password: TEST_USERS.teacher.password,
    display_name: TEST_USERS.teacher.displayName,
    role: TEST_USERS.teacher.role,
  });

  const studentOk = await registerUser({
    email: TEST_USERS.student.email,
    password: TEST_USERS.student.password,
    display_name: TEST_USERS.student.displayName,
    role: TEST_USERS.student.role,
  });

  const mentorOk = await registerUser({
    email: TEST_USERS.mentor.email,
    password: TEST_USERS.mentor.password,
    display_name: TEST_USERS.mentor.displayName,
    role: TEST_USERS.mentor.role,
  });

  // 3. 각 계정으로 로그인 후 storageState 저장
  if (ownerOk) {
    await saveAuthState(TEST_USERS.owner.email, TEST_USERS.owner.password, AUTH_STATE.owner);
  }
  if (teacherOk) {
    await saveAuthState(TEST_USERS.teacher.email, TEST_USERS.teacher.password, AUTH_STATE.teacher);
    // 이전 테스트 실행에서 누적된 세션 정리 — 장시간 실행 시 성능 저하 방지
    await cleanupTestSessions(AUTH_STATE.teacher);
  }
  if (studentOk) {
    await saveAuthState(TEST_USERS.student.email, TEST_USERS.student.password, AUTH_STATE.student);
  }
  if (mentorOk) {
    await saveAuthState(TEST_USERS.mentor.email, TEST_USERS.mentor.password, AUTH_STATE.mentor);
  }

  console.log('[global-setup] 테스트 계정 준비 완료');
}
