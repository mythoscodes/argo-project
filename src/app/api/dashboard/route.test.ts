import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

type MockedCreateClient = ReturnType<typeof vi.fn>;

function setMockClient(mockSupabase: Record<string, unknown>): void {
  (createClient as unknown as MockedCreateClient).mockResolvedValue(mockSupabase);
}

// ──────────────────────────────────────────────────────────
// 픽스처
// ──────────────────────────────────────────────────────────
const VALID_ACADEMY_ID = "550e8400-e29b-41d4-a716-446655440001";
const VALID_OWNER_ID   = "550e8400-e29b-41d4-a716-446655440002";
const VALID_TEACHER_ID = "550e8400-e29b-41d4-a716-446655440003";
const VALID_SESSION_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const VALID_SESSION_ID_2 = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
const VALID_STUDENT_ID_1 = "550e8400-e29b-41d4-a716-446655440010";
const VALID_STUDENT_ID_2 = "550e8400-e29b-41d4-a716-446655440011";

const mockSession = {
  id: VALID_SESSION_ID,
  title: "Spring 기초",
  subject: "Spring",
  status: "active",
  created_at: "2026-04-01T00:00:00.000Z",
  teacher_id: VALID_TEACHER_ID,
  profiles: { display_name: "김강사" },
};

const mockSession2 = {
  id: VALID_SESSION_ID_2,
  title: "React 심화",
  subject: "React",
  status: "ended",
  created_at: "2026-04-02T00:00:00.000Z",
  teacher_id: VALID_TEACHER_ID,
  profiles: { display_name: "김강사" },
};

const mockQuizzes = [
  { id: "quiz-1", session_id: VALID_SESSION_ID },
  { id: "quiz-2", session_id: VALID_SESSION_ID },
  { id: "quiz-3", session_id: VALID_SESSION_ID },
];

const mockParticipants = [
  { session_id: VALID_SESSION_ID, student_id: VALID_STUDENT_ID_1 },
  { session_id: VALID_SESSION_ID, student_id: VALID_STUDENT_ID_2 },
];

// VALID_STUDENT_ID_1: 3개 응답, 2개 정답 → avgScore=67, responseRate=100 → 정상
// VALID_STUDENT_ID_2: 1개 응답, 0개 정답 → avgScore=0, responseRate=33 → 이탈위험
const mockResponses = [
  { session_id: VALID_SESSION_ID, student_id: VALID_STUDENT_ID_1, is_correct: true },
  { session_id: VALID_SESSION_ID, student_id: VALID_STUDENT_ID_1, is_correct: true },
  { session_id: VALID_SESSION_ID, student_id: VALID_STUDENT_ID_1, is_correct: false },
  { session_id: VALID_SESSION_ID, student_id: VALID_STUDENT_ID_2, is_correct: false },
];

const mockStudentProfiles = [
  { id: VALID_STUDENT_ID_1, display_name: "홍길동" },
  { id: VALID_STUDENT_ID_2, display_name: "이수강" },
];

// ──────────────────────────────────────────────────────────
// Supabase mock 헬퍼
// ──────────────────────────────────────────────────────────
interface MockOptions {
  userResult?: { data: { user: { id: string } | null }; error: Error | null };
  profileResult?: { data: { role: string; academy_id: string } | null; error: Error | null };
  sessionsResult?: { data: typeof mockSession[] | null; error: Error | null };
  responsesResult?: { data: typeof mockResponses | null };
  quizzesResult?: { data: typeof mockQuizzes | null };
  participantsResult?: { data: typeof mockParticipants | null };
  studentProfilesResult?: { data: typeof mockStudentProfiles | null };
}

function buildSupabaseMock(overrides: MockOptions = {}) {
  const mockGetUser = vi.fn().mockResolvedValue(
    overrides.userResult ?? {
      data: { user: { id: VALID_OWNER_ID } },
      error: null,
    }
  );

  // profiles.single() 결과
  const mockProfileSingle = vi.fn().mockResolvedValue(
    overrides.profileResult ?? {
      data: { role: "owner", academy_id: VALID_ACADEMY_ID },
      error: null,
    }
  );

  // sessions: .select().eq().order()
  const sessionsData =
    overrides.sessionsResult ?? {
      data: [mockSession, mockSession2],
      error: null,
    };
  const mockSessionsOrder = vi.fn().mockResolvedValue(sessionsData);
  const mockSessionsEq = vi.fn().mockReturnValue({ order: mockSessionsOrder });
  const mockSessionsSelect = vi.fn().mockReturnValue({ eq: mockSessionsEq });

  // responses: .select().in()
  const responsesData =
    overrides.responsesResult ?? { data: mockResponses };
  const mockResponsesIn = vi.fn().mockResolvedValue(responsesData);
  const mockResponsesSelect = vi.fn().mockReturnValue({ in: mockResponsesIn });

  // quizzes: .select().in()
  const quizzesData =
    overrides.quizzesResult ?? { data: mockQuizzes };
  const mockQuizzesIn = vi.fn().mockResolvedValue(quizzesData);
  const mockQuizzesSelect = vi.fn().mockReturnValue({ in: mockQuizzesIn });

  // session_participants: .select().in()
  const participantsData =
    overrides.participantsResult ?? { data: mockParticipants };
  const mockParticipantsIn = vi.fn().mockResolvedValue(participantsData);
  const mockParticipantsSelect = vi.fn().mockReturnValue({ in: mockParticipantsIn });

  // profiles (students): .select().in()
  const studentProfilesData =
    overrides.studentProfilesResult ?? { data: mockStudentProfiles };
  const mockStudentProfilesIn = vi.fn().mockResolvedValue(studentProfilesData);
  const mockStudentProfilesSelect = vi.fn().mockReturnValue({ in: mockStudentProfilesIn });

  // profiles (owner): .select().eq().single()
  const mockProfileEq = vi.fn().mockReturnValue({ single: mockProfileSingle });
  const mockProfileSelect = vi.fn().mockReturnValue({ eq: mockProfileEq });

  // from() 분기
  let profileCallCount = 0;
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "sessions") {
      return { select: mockSessionsSelect };
    }
    if (table === "responses") {
      return { select: mockResponsesSelect };
    }
    if (table === "quizzes") {
      return { select: mockQuizzesSelect };
    }
    if (table === "session_participants") {
      return { select: mockParticipantsSelect };
    }
    if (table === "profiles") {
      profileCallCount++;
      // 첫 번째 호출은 owner 프로필 조회 (single 체인), 두 번째는 수강생 프로필 조회 (in 체인)
      if (profileCallCount === 1) {
        return { select: mockProfileSelect };
      }
      return { select: mockStudentProfilesSelect };
    }
    return { select: vi.fn() };
  });

  const mockSupabase = {
    from: mockFrom,
    auth: { getUser: mockGetUser },
  };

  return { mockSupabase, mockFrom, mockResponsesIn, mockParticipantsIn };
}

function makeGetRequest(): NextRequest {
  return new Request("http://localhost/api/dashboard", {
    method: "GET",
  }) as unknown as NextRequest;
}

// ──────────────────────────────────────────────────────────
// 테스트
// ──────────────────────────────────────────────────────────
describe("GET /api/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. 인증 없음 → 401
  it("인증 없을 때 401 반환", async () => {
    const { mockSupabase } = buildSupabaseMock({
      userResult: { data: { user: null }, error: new Error("auth error") },
    });
    setMockClient(mockSupabase);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("인증된 사용자 없을 때 (user: null) 401 반환", async () => {
    const { mockSupabase } = buildSupabaseMock({
      userResult: { data: { user: null }, error: null },
    });
    setMockClient(mockSupabase);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  // 2. owner가 아닌 role(teacher) → 403
  it("role이 teacher인 경우 403 반환", async () => {
    const { mockSupabase } = buildSupabaseMock({
      profileResult: {
        data: { role: "teacher", academy_id: VALID_ACADEMY_ID },
        error: null,
      },
    });
    setMockClient(mockSupabase);

    const res = await GET();
    expect(res.status).toBe(403);

    const json = await res.json() as { error: string };
    expect(json.error).toContain("owner");
  });

  // 2-2. owner가 아닌 role(student) → 403
  it("role이 student인 경우 403 반환", async () => {
    const { mockSupabase } = buildSupabaseMock({
      profileResult: {
        data: { role: "student", academy_id: VALID_ACADEMY_ID },
        error: null,
      },
    });
    setMockClient(mockSupabase);

    const res = await GET();
    expect(res.status).toBe(403);
  });

  // 3. 정상 조회 → 200 + 응답 구조 확인
  it("owner 정상 조회 시 200 + summary/sessionStats/atRiskStudents 구조 반환", async () => {
    const { mockSupabase } = buildSupabaseMock();
    setMockClient(mockSupabase);

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json() as {
      data: {
        summary: {
          totalSessions: number;
          activeSessions: number;
          totalStudents: number;
          academyAvgUnderstanding: number;
        };
        sessionStats: Array<{
          sessionId: string;
          title: string;
          subject: string;
          teacherName: string;
          status: string;
          studentCount: number;
          avgUnderstanding: number;
          createdAt: string;
        }>;
        atRiskStudents: Array<{
          studentId: string;
          studentName: string;
          sessionTitle: string;
          avgScore: number;
          responseRate: number;
        }>;
      };
    };

    // 최상위 구조 확인
    expect(json.data).toHaveProperty("summary");
    expect(json.data).toHaveProperty("sessionStats");
    expect(json.data).toHaveProperty("atRiskStudents");

    // summary 필드 확인
    const { summary } = json.data;
    expect(summary).toHaveProperty("totalSessions");
    expect(summary).toHaveProperty("activeSessions");
    expect(summary).toHaveProperty("totalStudents");
    expect(summary).toHaveProperty("academyAvgUnderstanding");

    // sessionStats 항목 구조 확인
    expect(json.data.sessionStats.length).toBeGreaterThan(0);
    const firstStat = json.data.sessionStats[0];
    expect(firstStat).toHaveProperty("sessionId");
    expect(firstStat).toHaveProperty("title");
    expect(firstStat).toHaveProperty("subject");
    expect(firstStat).toHaveProperty("teacherName");
    expect(firstStat).toHaveProperty("status");
    expect(firstStat).toHaveProperty("studentCount");
    expect(firstStat).toHaveProperty("avgUnderstanding");
    expect(firstStat).toHaveProperty("createdAt");

    // atRiskStudents 항목 구조 확인 (있을 경우)
    if (json.data.atRiskStudents.length > 0) {
      const firstAtRisk = json.data.atRiskStudents[0];
      expect(firstAtRisk).toHaveProperty("studentId");
      expect(firstAtRisk).toHaveProperty("studentName");
      expect(firstAtRisk).toHaveProperty("sessionTitle");
      expect(firstAtRisk).toHaveProperty("avgScore");
      expect(firstAtRisk).toHaveProperty("responseRate");
    }
  });

  it("summary 집계값이 올바르게 계산됨", async () => {
    const { mockSupabase } = buildSupabaseMock();
    setMockClient(mockSupabase);

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json() as { data: { summary: { totalSessions: number; activeSessions: number; totalStudents: number } } };
    const { summary } = json.data;

    // mockSession(active) + mockSession2(ended) = 2개
    expect(summary.totalSessions).toBe(2);
    // active 세션 1개
    expect(summary.activeSessions).toBe(1);
    // 고유 수강생: STUDENT_1, STUDENT_2 = 2명
    expect(summary.totalStudents).toBe(2);
  });

  // 4. atRiskStudents 필터링 로직 검증
  it("avgScore < 60 또는 responseRate < 50 인 수강생이 atRiskStudents에 포함됨", async () => {
    const { mockSupabase } = buildSupabaseMock();
    setMockClient(mockSupabase);

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json() as {
      data: {
        atRiskStudents: Array<{
          studentId: string;
          avgScore: number;
          responseRate: number;
        }>;
      };
    };

    const { atRiskStudents } = json.data;

    // VALID_STUDENT_ID_2: 응답 1개(틀림), 퀴즈 3개 → avgScore=0(<60), responseRate=33(<50) → 포함
    const atRiskStudent2 = atRiskStudents.find(
      (s) => s.studentId === VALID_STUDENT_ID_2
    );
    expect(atRiskStudent2).toBeDefined();
    expect(atRiskStudent2!.avgScore).toBe(0);
    expect(atRiskStudent2!.responseRate).toBe(33);

    // VALID_STUDENT_ID_1: 3개 응답(2정답), 퀴즈 3개 → avgScore=67(>=60), responseRate=100(>=50) → 미포함
    const atRiskStudent1 = atRiskStudents.find(
      (s) => s.studentId === VALID_STUDENT_ID_1
    );
    expect(atRiskStudent1).toBeUndefined();
  });

  it("avgScore < 60 이지만 responseRate >= 50 인 경우에도 atRiskStudents에 포함됨", async () => {
    // STUDENT_1을 2개 응답 중 0개 정답으로 변경 → avgScore=0(<60), responseRate=67(>=50) → 포함 (avgScore 기준)
    const lowScoreResponses = [
      { session_id: VALID_SESSION_ID, student_id: VALID_STUDENT_ID_1, is_correct: false },
      { session_id: VALID_SESSION_ID, student_id: VALID_STUDENT_ID_1, is_correct: false },
      { session_id: VALID_SESSION_ID, student_id: VALID_STUDENT_ID_2, is_correct: false },
    ];
    const { mockSupabase } = buildSupabaseMock({
      responsesResult: { data: lowScoreResponses },
    });
    setMockClient(mockSupabase);

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json() as {
      data: { atRiskStudents: Array<{ studentId: string; avgScore: number }> };
    };

    const atRiskStudent1 = json.data.atRiskStudents.find(
      (s) => s.studentId === VALID_STUDENT_ID_1
    );
    expect(atRiskStudent1).toBeDefined();
    expect(atRiskStudent1!.avgScore).toBe(0);
  });

  it("avgScore >= 60 이지만 responseRate < 50 인 경우에도 atRiskStudents에 포함됨", async () => {
    // 퀴즈 10개, STUDENT_1 응답 4개(모두 정답) → avgScore=100(>=60), responseRate=40(<50) → 포함
    const manyQuizzes = Array.from({ length: 10 }, (_, i) => ({
      id: `quiz-${i + 1}`,
      session_id: VALID_SESSION_ID,
    }));
    const fewResponses = [
      { session_id: VALID_SESSION_ID, student_id: VALID_STUDENT_ID_1, is_correct: true },
      { session_id: VALID_SESSION_ID, student_id: VALID_STUDENT_ID_1, is_correct: true },
      { session_id: VALID_SESSION_ID, student_id: VALID_STUDENT_ID_1, is_correct: true },
      { session_id: VALID_SESSION_ID, student_id: VALID_STUDENT_ID_1, is_correct: true },
    ];
    const { mockSupabase } = buildSupabaseMock({
      quizzesResult: { data: manyQuizzes },
      responsesResult: { data: fewResponses },
      participantsResult: { data: [{ session_id: VALID_SESSION_ID, student_id: VALID_STUDENT_ID_1 }] },
    });
    setMockClient(mockSupabase);

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json() as {
      data: { atRiskStudents: Array<{ studentId: string; avgScore: number; responseRate: number }> };
    };

    const atRiskStudent1 = json.data.atRiskStudents.find(
      (s) => s.studentId === VALID_STUDENT_ID_1
    );
    expect(atRiskStudent1).toBeDefined();
    expect(atRiskStudent1!.avgScore).toBe(100);
    expect(atRiskStudent1!.responseRate).toBe(40);
  });

  // 세션이 없을 때 빈 응답
  it("세션이 없는 경우 빈 통계 반환", async () => {
    const { mockSupabase } = buildSupabaseMock({
      sessionsResult: { data: [], error: null },
    });
    setMockClient(mockSupabase);

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json() as {
      data: {
        sessionStats: unknown[];
        atRiskStudents: unknown[];
        summary: { totalSessions: number };
      };
    };

    expect(json.data.sessionStats).toHaveLength(0);
    expect(json.data.atRiskStudents).toHaveLength(0);
    expect(json.data.summary.totalSessions).toBe(0);
  });

  // 세션 조회 DB 오류 시 500
  it("세션 조회 DB 오류 시 500 반환", async () => {
    const { mockSupabase } = buildSupabaseMock({
      sessionsResult: { data: null, error: new Error("DB connection failed") },
    });
    setMockClient(mockSupabase);

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
