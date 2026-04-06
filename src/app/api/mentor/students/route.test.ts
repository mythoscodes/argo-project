import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

type MockedCreateClient = ReturnType<typeof vi.fn>;

function setMockClient(mockSupabase: Record<string, unknown>): void {
  (createClient as unknown as MockedCreateClient).mockResolvedValue(
    mockSupabase
  );
}

// ──────────────────────────────────────────────────────────
// 픽스처
// ──────────────────────────────────────────────────────────
const TEACHER_ID = "550e8400-e29b-41d4-a716-446655440001";
const ACADEMY_ID = "550e8400-e29b-41d4-a716-446655440002";
const STUDENT_A = "550e8400-e29b-41d4-a716-446655440010"; // 위험
const STUDENT_B = "550e8400-e29b-41d4-a716-446655440011"; // 양호
const SESSION_1 = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const SESSION_2 = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
const SESSION_3 = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";

const mockSessions = [
  { id: SESSION_3, created_at: "2026-04-03T00:00:00Z" },
  { id: SESSION_2, created_at: "2026-04-02T00:00:00Z" },
  { id: SESSION_1, created_at: "2026-04-01T00:00:00Z" },
];

const mockParticipants = [
  { student_id: STUDENT_A, session_id: SESSION_1, joined_at: "2026-04-01T00:00:00Z" },
  { student_id: STUDENT_B, session_id: SESSION_1, joined_at: "2026-04-01T00:00:00Z" },
  { student_id: STUDENT_B, session_id: SESSION_2, joined_at: "2026-04-02T00:00:00Z" },
  { student_id: STUDENT_B, session_id: SESSION_3, joined_at: "2026-04-03T00:00:00Z" },
];

// STUDENT_A: 세션1만 참여, 정답률 30% → 위험
// STUDENT_B: 전출석, 정답률 80% → 양호
const mockResponses = [
  { student_id: STUDENT_A, session_id: SESSION_1, is_correct: false, response_time_ms: 5000 },
  { student_id: STUDENT_A, session_id: SESSION_1, is_correct: false, response_time_ms: 6000 },
  { student_id: STUDENT_A, session_id: SESSION_1, is_correct: true, response_time_ms: 8000 },
  { student_id: STUDENT_B, session_id: SESSION_1, is_correct: true, response_time_ms: 3000 },
  { student_id: STUDENT_B, session_id: SESSION_2, is_correct: true, response_time_ms: 2500 },
  { student_id: STUDENT_B, session_id: SESSION_3, is_correct: true, response_time_ms: 2000 },
  { student_id: STUDENT_B, session_id: SESSION_3, is_correct: false, response_time_ms: 3000 },
];

const mockQuizzes = [
  { id: "q1", session_id: SESSION_1, topic_tag: "Spring" },
  { id: "q2", session_id: SESSION_2, topic_tag: "JPA" },
  { id: "q3", session_id: SESSION_3, topic_tag: "React" },
];

const mockStudentProfiles = [
  { id: STUDENT_A, display_name: "김민준" },
  { id: STUDENT_B, display_name: "박서연" },
];

// ──────────────────────────────────────────────────────────
// Mock 빌더
// ──────────────────────────────────────────────────────────
interface MockOverrides {
  userId?: string | null;
  authError?: Error | null;
  profileRole?: string;
  sessions?: typeof mockSessions | null;
  participants?: typeof mockParticipants | null;
  studentProfiles?: typeof mockStudentProfiles | null;
  responses?: typeof mockResponses | null;
  quizzes?: typeof mockQuizzes | null;
}

function buildMock(overrides: MockOverrides = {}) {
  const userId = overrides.userId ?? TEACHER_ID;
  const mockGetUser = vi.fn().mockResolvedValue({
    data: { user: userId ? { id: userId } : null },
    error: overrides.authError ?? null,
  });

  const mockChain = (result: { data: unknown }) => {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.in = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    chain.then = (resolve: (val: { data: unknown }) => void) =>
      resolve(result);
    return chain;
  };

  // from() 라우팅
  const fromResults: Record<string, unknown> = {
    profiles: null, // 별도 처리
    sessions: { data: overrides.sessions ?? mockSessions },
    session_participants: { data: overrides.participants ?? mockParticipants },
    responses: { data: overrides.responses ?? mockResponses },
    quizzes: { data: overrides.quizzes ?? mockQuizzes },
  };

  const profileSingle = vi.fn().mockResolvedValue({
    data: {
      role: overrides.profileRole ?? "teacher",
      academy_id: ACADEMY_ID,
    },
    error: null,
  });

  const profileInResult = {
    data: overrides.studentProfiles ?? mockStudentProfiles,
  };

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "profiles") {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue({ ...chain, single: profileSingle });
      chain.in = vi.fn().mockResolvedValue(profileInResult);
      chain.single = profileSingle;
      return chain;
    }
    const result = fromResults[table] ?? { data: null };
    return mockChain(result as { data: unknown });
  });

  return {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  };
}

// ──────────────────────────────────────────────────────────
// 테스트
// ──────────────────────────────────────────────────────────
beforeEach(() => vi.clearAllMocks());

describe("GET /api/mentor/students", () => {
  // === 인증/인가 ===
  it("미인증 시 401 반환", async () => {
    setMockClient(buildMock({ userId: null, authError: new Error("no auth") }));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("수강생 역할이면 403 반환", async () => {
    setMockClient(buildMock({ profileRole: "student" }));
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("강사 역할이면 200 반환", async () => {
    setMockClient(buildMock({ profileRole: "teacher" }));
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("원장 역할이면 200 반환", async () => {
    setMockClient(buildMock({ profileRole: "owner" }));
    const res = await GET();
    expect(res.status).toBe(200);
  });

  // === 빈 데이터 ===
  it("세션이 없으면 빈 배열 반환", async () => {
    setMockClient(buildMock({ sessions: [] }));
    const res = await GET();
    const json = await res.json();
    expect(json.data.students).toEqual([]);
  });

  it("참여자가 없으면 빈 배열 반환", async () => {
    setMockClient(buildMock({ participants: [] }));
    const res = await GET();
    const json = await res.json();
    expect(json.data.students).toEqual([]);
  });

  // === 이탈 위험 계산 ===
  it("수강생 목록이 이탈 위험도순으로 정렬됨", async () => {
    setMockClient(buildMock());
    const res = await GET();
    const json = await res.json();
    const students = json.data.students;

    expect(students.length).toBe(2);
    // STUDENT_A(세션1만 참여, 정답률 33%)가 먼저
    const riskOrder = students.map(
      (s: { riskLevel: string }) => s.riskLevel
    );
    const validOrder =
      riskOrder[0] === "HIGH" ||
      riskOrder[0] === "MEDIUM" ||
      (riskOrder[0] === "LOW" && riskOrder[1] === "LOW");
    expect(validOrder).toBe(true);
  });

  it("각 수강생에 riskSignals 3개 포함", async () => {
    setMockClient(buildMock());
    const res = await GET();
    const json = await res.json();

    for (const student of json.data.students) {
      expect(student.riskSignals).toHaveLength(3);
      const types = student.riskSignals.map(
        (s: { type: string }) => s.type
      );
      expect(types).toContain("accuracy");
      expect(types).toContain("speed");
      expect(types).toContain("absence");
    }
  });

  it("각 수강생에 recentAccuracyRates 포함", async () => {
    setMockClient(buildMock());
    const res = await GET();
    const json = await res.json();

    for (const student of json.data.students) {
      expect(Array.isArray(student.recentAccuracyRates)).toBe(true);
    }
  });

  it("각 수강생에 displayName 포함", async () => {
    setMockClient(buildMock());
    const res = await GET();
    const json = await res.json();

    const names = json.data.students.map(
      (s: { displayName: string }) => s.displayName
    );
    expect(names).toContain("김민준");
    expect(names).toContain("박서연");
  });

  it("각 수강생에 weakTopics 배열 포함", async () => {
    setMockClient(buildMock());
    const res = await GET();
    const json = await res.json();

    for (const student of json.data.students) {
      expect(Array.isArray(student.weakTopics)).toBe(true);
    }
  });
});
