// E2E 테스트 계정 상수 — global-setup.ts에서 생성됨
export const TEST_USERS = {
  owner: {
    email: 'e2e-owner@test.argos',
    password: 'TestPass123',
    displayName: 'E2E 원장',
    role: 'owner' as const,
    academyName: 'E2E 테스트 학원',
  },
  teacher: {
    email: 'e2e-teacher@test.argos',
    password: 'TestPass123',
    displayName: 'E2E 강사',
    role: 'teacher' as const,
  },
  student: {
    email: 'e2e-student@test.argos',
    password: 'TestPass123',
    displayName: 'E2E 수강생',
    role: 'student' as const,
  },
  mentor: {
    email: 'e2e-mentor@test.argos',
    password: 'TestPass123',
    displayName: 'E2E 멘토',
    role: 'mentor' as const,
  },
} as const;

export const AUTH_STATE_DIR = 'tests/e2e/fixtures/.auth';

export const AUTH_STATE = {
  owner: `${AUTH_STATE_DIR}/owner.json`,
  teacher: `${AUTH_STATE_DIR}/teacher.json`,
  student: `${AUTH_STATE_DIR}/student.json`,
  mentor: `${AUTH_STATE_DIR}/mentor.json`,
} as const;
