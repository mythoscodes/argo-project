import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { generateText } from "ai";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/ai/model", () => ({ getModel: vi.fn() }));
vi.mock("ai", () => ({ generateText: vi.fn(), Output: { object: vi.fn().mockReturnValue({}) } }));
vi.mock("@/lib/ai/prompts/report", () => ({
  buildReportSystemPrompt: vi.fn().mockReturnValue("system prompt"),
  buildReportUserPrompt: vi.fn().mockReturnValue("user prompt"),
}));

import { createClient } from "@/lib/supabase/server";
import { POST, GET } from "./route";

type MockedCreateClient = ReturnType<typeof vi.fn>;

function setMockClient(mockSupabase: Record<string, unknown>): void {
  (createClient as unknown as MockedCreateClient).mockResolvedValue(mockSupabase);
}

// ──────────────────────────────────────────────────────────
// 픽스처
// ──────────────────────────────────────────────────────────
const VALID_SESSION_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const VALID_STUDENT_ID = "550e8400-e29b-41d4-a716-446655440001";
const VALID_TEACHER_ID = "550e8400-e29b-41d4-a716-446655440002";
const VALID_ACADEMY_ID = "550e8400-e29b-41d4-a716-446655440003";
const VALID_REPORT_ID  = "550e8400-e29b-41d4-a716-446655440004";

const validReportData = {
  overallScore: 75,
  summary: "전반적으로 잘 이해하고 있습니다.",
  topicResults: [{ topic: "Spring Bean", score: 85, feedback: "잘 하고 있어요." }],
  weakTopics: ["DI"],
  recommendations: ["추천1", "추천2", "추천3"],
  encouragement: "잘 하고 있습니다!",
};

const savedReportRow = {
  id: VALID_REPORT_ID,
  student_id: VALID_STUDENT_ID,
  academy_id: VALID_ACADEMY_ID,
  session_id: VALID_SESSION_ID,
  report_type: "session",
  understanding_summary: validReportData,
  weak_topics: ["DI"],
  recommendations: "추천1\n추천2\n추천3",
  created_at: "2026-04-06T00:00:00.000Z",
};

// ──────────────────────────────────────────────────────────
// Supabase mock 헬퍼
// ──────────────────────────────────────────────────────────
function buildSupabaseMock(overrides?: {
  getUserResult?: { data: { user: { id: string } | null }; error: Error | null };
  profileResult?: { data: { role: string; academy_id: string } | null; error: Error | null };
  sessionResult?: { data: { id: string; teacher_id: string; title: string; subject: string } | null; error: Error | null };
  participationResult?: { data: { id: string } | null };
  studentProfileResult?: { data: { display_name: string } | null; error: Error | null };
  responsesResult?: { data: Array<{ quiz_id: string; is_correct: boolean }> | null };
  quizzesResult?: { data: Array<{ id: string; topic_tag: string }> | null };
  insertReportResult?: { data: { id: string } | null; error: Error | null };
  reportsResult?: { data: Array<typeof savedReportRow> | null; error: Error | null };
}) {
  const mockGetUser = vi.fn().mockResolvedValue(
    overrides?.getUserResult ?? {
      data: { user: { id: VALID_STUDENT_ID } },
      error: null,
    }
  );

  // single() 은 쿼리마다 다른 값을 반환해야 하므로 호출 순서로 관리
  const singleCallResults: Array<{ data: unknown; error: Error | null }> = [];

  // POST 기본 흐름 순서: profile → session → studentProfile
  singleCallResults.push(
    overrides?.profileResult ?? { data: { role: "student", academy_id: VALID_ACADEMY_ID }, error: null }
  );
  singleCallResults.push(
    overrides?.sessionResult ?? {
      data: { id: VALID_SESSION_ID, teacher_id: VALID_TEACHER_ID, title: "Spring 기초", subject: "Spring" },
      error: null,
    }
  );
  singleCallResults.push(
    overrides?.studentProfileResult ?? { data: { display_name: "홍길동" }, error: null }
  );
  // insert().select().single()
  singleCallResults.push(
    overrides?.insertReportResult ?? { data: { id: VALID_REPORT_ID }, error: null }
  );

  let singleCallIndex = 0;
  const mockSingle = vi.fn().mockImplementation(() => {
    const result = singleCallResults[singleCallIndex] ?? { data: null, error: null };
    singleCallIndex++;
    return Promise.resolve(result);
  });

  const mockMaybeSingle = vi.fn().mockResolvedValue(
    overrides?.participationResult ?? { data: { id: "part-id" } }
  );

  const mockOrder = vi.fn().mockResolvedValue(
    overrides?.reportsResult ?? { data: [savedReportRow], error: null }
  );

  const mockEq = vi.fn();
  mockEq.mockImplementation(() => ({
    eq: mockEq,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    order: mockOrder,
  }));

  const mockSelect = vi.fn().mockImplementation(() => ({
    eq: mockEq,
    order: mockOrder,
  }));

  const mockInsertSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });

  // responses, quizzes 는 .eq().eq() 체인 후 배열 반환
  // 위의 mockEq 가 Promise가 아닌 객체를 반환하므로, 해당 from 호출에서 배열을 직접 반환하도록
  // responses/quizzes 결과는 mockEq 마지막 체인이 await 될 때 값을 반환해야 함.
  // 현재 구조에서는 `.eq("student_id", ...)` 결과가 직접 await 되지 않고,
  // 내부 `const { data } = await supabase.from("responses").select(...).eq(...).eq(...)` 패턴임.
  // mockEq 의 반환 객체를 thenable 로 만들어 두 번째 .eq() 결과가 await 가능하도록 처리.
  const responsesData = overrides?.responsesResult ?? { data: [] };
  const quizzesData = overrides?.quizzesResult ?? { data: [] };

  // from 이름별로 다르게 동작하도록 구성
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "responses") {
      const eqChain = vi.fn().mockImplementation(() => {
        const inner = vi.fn().mockResolvedValue(responsesData);
        inner.mockImplementation(() => Promise.resolve(responsesData));
        return { eq: inner, ...responsesData };
      });
      // 두 번의 .eq() 후 await → thenable 체인
      const firstEq = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(responsesData) });
      return { select: vi.fn().mockReturnValue({ eq: firstEq }) };
    }
    if (table === "quizzes") {
      const firstEq = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(quizzesData) });
      return { select: vi.fn().mockReturnValue({ eq: firstEq }) };
    }
    if (table === "student_reports") {
      // GET 핸들러: .select().eq().order() 혹은 .select().eq().eq().order()
      const orderMock = vi.fn().mockResolvedValue(
        overrides?.reportsResult ?? { data: [savedReportRow], error: null }
      );
      const eqChainForGet = vi.fn().mockImplementation(() => ({
        eq: eqChainForGet,
        order: orderMock,
      }));
      return {
        select: vi.fn().mockReturnValue({ eq: eqChainForGet }),
        insert: mockInsert,
      };
    }
    // profiles, sessions, session_participants
    return { select: mockSelect, insert: mockInsert };
  });

  const mockSupabase = {
    from: mockFrom,
    auth: { getUser: mockGetUser },
  };

  return { mockSupabase, mockSingle, mockMaybeSingle, mockGetUser, mockOrder };
}

// ──────────────────────────────────────────────────────────
// 요청 헬퍼
// ──────────────────────────────────────────────────────────
function makePostRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/ai/report", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }) as unknown as NextRequest;
}

function makeGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/ai/report");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url.toString(), { method: "GET" }) as unknown as NextRequest;
}

// ──────────────────────────────────────────────────────────
// POST 테스트
// ──────────────────────────────────────────────────────────
describe("POST /api/ai/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateText).mockResolvedValue({
      output: validReportData,
    } as Awaited<ReturnType<typeof generateText>>);
  });

  // 1. auth.getUser() 오류 시 401
  it("auth.getUser() 오류 시 401 반환", async () => {
    const { mockSupabase } = buildSupabaseMock({
      getUserResult: { data: { user: null }, error: new Error("auth error") },
    });
    setMockClient(mockSupabase);

    const res = await POST(makePostRequest({ sessionId: VALID_SESSION_ID }));
    expect(res.status).toBe(401);
  });

  // 2. 인증된 사용자 없을 때 401
  it("인증된 사용자 없을 때 401 반환", async () => {
    const { mockSupabase } = buildSupabaseMock({
      getUserResult: { data: { user: null }, error: null },
    });
    setMockClient(mockSupabase);

    const res = await POST(makePostRequest({ sessionId: VALID_SESSION_ID }));
    expect(res.status).toBe(401);
  });

  // 3. 프로필 조회 실패 시 403
  it("프로필 조회 실패 시 403 반환", async () => {
    const { mockSupabase } = buildSupabaseMock({
      profileResult: { data: null, error: new Error("profile error") },
    });
    setMockClient(mockSupabase);

    const res = await POST(makePostRequest({ sessionId: VALID_SESSION_ID }));
    expect(res.status).toBe(403);
  });

  // 4. sessionId 누락 시 400
  it("sessionId 누락 시 400 반환", async () => {
    const { mockSupabase } = buildSupabaseMock();
    setMockClient(mockSupabase);

    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  // 5. 유효하지 않은 UUID sessionId → 400
  it("유효하지 않은 UUID sessionId 시 400 반환", async () => {
    const { mockSupabase } = buildSupabaseMock();
    setMockClient(mockSupabase);

    const res = await POST(makePostRequest({ sessionId: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  // 6. 요청 본문이 JSON이 아닐 때 400
  it("요청 본문이 JSON이 아닐 때 400 반환", async () => {
    const { mockSupabase } = buildSupabaseMock();
    setMockClient(mockSupabase);

    const req = new Request("http://localhost/api/ai/report", {
      method: "POST",
      body: "invalid json{{",
      headers: { "Content-Type": "application/json" },
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // 7. 세션을 찾을 수 없을 때 404
  it("세션을 찾을 수 없을 때 404 반환", async () => {
    const { mockSupabase } = buildSupabaseMock({
      sessionResult: { data: null, error: new Error("not found") },
    });
    setMockClient(mockSupabase);

    const res = await POST(makePostRequest({ sessionId: VALID_SESSION_ID }));
    expect(res.status).toBe(404);
  });

  // 8. 강사가 본인 세션이 아닌 세션 요청 시 403
  it("강사가 본인 세션이 아닌 세션 요청 시 403 반환", async () => {
    const OTHER_TEACHER_ID = "550e8400-e29b-41d4-a716-446655440005";
    const { mockSupabase } = buildSupabaseMock({
      getUserResult: { data: { user: { id: OTHER_TEACHER_ID } }, error: null },
      profileResult: { data: { role: "teacher", academy_id: VALID_ACADEMY_ID }, error: null },
      // teacher_id 가 OTHER_TEACHER_ID 와 다름
      sessionResult: {
        data: { id: VALID_SESSION_ID, teacher_id: VALID_TEACHER_ID, title: "Spring 기초", subject: "Spring" },
        error: null,
      },
    });
    setMockClient(mockSupabase);

    const res = await POST(makePostRequest({ sessionId: VALID_SESSION_ID }));
    expect(res.status).toBe(403);
  });

  // 9. 수강생이 참여하지 않은 세션 요청 시 403
  it("수강생이 참여하지 않은 세션 요청 시 403 반환", async () => {
    const { mockSupabase } = buildSupabaseMock({
      participationResult: { data: null },
    });
    setMockClient(mockSupabase);

    const res = await POST(makePostRequest({ sessionId: VALID_SESSION_ID }));
    expect(res.status).toBe(403);
  });

  // 10. 수강생이 본인 리포트 성공 생성 → 201
  it("수강생이 본인 리포트 성공 생성 시 201 + { data: { report, reportId } } 반환", async () => {
    const { mockSupabase } = buildSupabaseMock();
    setMockClient(mockSupabase);

    const res = await POST(makePostRequest({ sessionId: VALID_SESSION_ID }));
    expect(res.status).toBe(201);

    const json = await res.json() as { data: { report: typeof validReportData; reportId: string } };
    expect(json.data).toHaveProperty("report");
    expect(json.data).toHaveProperty("reportId");
    expect(json.data.report.overallScore).toBe(75);
    expect(json.data.reportId).toBe(VALID_REPORT_ID);
  });

  // 11. 강사가 특정 수강생 리포트 성공 생성 → 201
  it("강사가 특정 수강생 리포트 성공 생성 시 201 반환", async () => {
    const { mockSupabase } = buildSupabaseMock({
      getUserResult: { data: { user: { id: VALID_TEACHER_ID } }, error: null },
      profileResult: { data: { role: "teacher", academy_id: VALID_ACADEMY_ID }, error: null },
      sessionResult: {
        data: { id: VALID_SESSION_ID, teacher_id: VALID_TEACHER_ID, title: "Spring 기초", subject: "Spring" },
        error: null,
      },
    });
    setMockClient(mockSupabase);

    const res = await POST(
      makePostRequest({ sessionId: VALID_SESSION_ID, studentId: VALID_STUDENT_ID })
    );
    expect(res.status).toBe(201);
  });

  // 12. AI 생성 실패 시 1회 재시도 후 502 반환
  it("AI 생성 실패 시 1회 재시도 후 502 반환", async () => {
    const { mockSupabase } = buildSupabaseMock();
    setMockClient(mockSupabase);
    vi.mocked(generateText).mockRejectedValue(new Error("AI 서비스 오류"));

    const res = await POST(makePostRequest({ sessionId: VALID_SESSION_ID }));
    expect(res.status).toBe(502);
    // generateText 가 2회(최초 1회 + 재시도 1회) 호출되어야 함
    expect(vi.mocked(generateText)).toHaveBeenCalledTimes(2);
  });
});

// ──────────────────────────────────────────────────────────
// GET 테스트
// ──────────────────────────────────────────────────────────
describe("GET /api/ai/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildGetSupabaseMock(options?: {
    userResult?: { data: { user: { id: string } | null }; error: Error | null };
    profileResult?: { data: { role: string } | null; error: Error | null };
    reportsResult?: { data: Array<typeof savedReportRow> | null; error: Error | null };
  }) {
    const mockGetUser = vi.fn().mockResolvedValue(
      options?.userResult ?? { data: { user: { id: VALID_STUDENT_ID } }, error: null }
    );

    const singleResults = [
      options?.profileResult ?? { data: { role: "student" }, error: null },
    ];
    let singleIdx = 0;
    const mockSingle = vi.fn().mockImplementation(() => {
      const r = singleResults[singleIdx] ?? { data: null, error: null };
      singleIdx++;
      return Promise.resolve(r);
    });

    const reportsResult = options?.reportsResult ?? { data: [savedReportRow], error: null };

    // order() 반환값은 await 가능해야 하며, 추가 .eq() 체이닝도 지원해야 함
    // route.ts GET: .select().eq("session_id").order() → query = query.eq("student_id") → await query
    // 즉 orderMock() 반환값에 .eq()가 있고, 그 .eq() 반환값이 await 가능해야 함
    const awaitableQueryBuilder = {
      ...reportsResult,
      then: (resolve: (v: typeof reportsResult) => void) => resolve(reportsResult),
      eq: vi.fn().mockResolvedValue(reportsResult),
    };
    // eq() 추적을 위해 eqChain 생성
    const eqChain = vi.fn().mockImplementation(() => awaitableQueryBuilder);
    awaitableQueryBuilder.eq = eqChain;

    const orderMock = vi.fn().mockReturnValue(awaitableQueryBuilder);

    const eqForSelect = vi.fn().mockImplementation(() => ({
      eq: eqForSelect,
      order: orderMock,
      single: mockSingle,
    }));
    const selectForGet = vi.fn().mockReturnValue({ eq: eqForSelect, order: orderMock });

    const selectForProfile = vi.fn().mockReturnValue({ eq: eqForSelect });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "student_reports") {
        return { select: selectForGet };
      }
      return { select: selectForProfile };
    });

    const mockSupabase = { from: mockFrom, auth: { getUser: mockGetUser } };
    return { mockSupabase, eqChain, orderMock };
  }

  // 13. 인증 없을 때 401
  it("인증 없을 때 401 반환", async () => {
    const { mockSupabase } = buildGetSupabaseMock({
      userResult: { data: { user: null }, error: new Error("no auth") },
    });
    setMockClient(mockSupabase);

    const res = await GET(makeGetRequest({ sessionId: VALID_SESSION_ID }));
    expect(res.status).toBe(401);
  });

  // 14. sessionId 쿼리 파라미터 누락 시 400
  it("sessionId 쿼리 파라미터 누락 시 400 반환", async () => {
    const { mockSupabase } = buildGetSupabaseMock();
    setMockClient(mockSupabase);

    const res = await GET(makeGetRequest({}));
    expect(res.status).toBe(400);
  });

  // 15. 수강생은 본인 리포트만 조회 (student_id 필터 적용 확인)
  it("수강생은 student_id 필터로 본인 리포트만 조회", async () => {
    const { mockSupabase, eqChain } = buildGetSupabaseMock({
      profileResult: { data: { role: "student" }, error: null },
    });
    setMockClient(mockSupabase);

    const res = await GET(makeGetRequest({ sessionId: VALID_SESSION_ID }));
    expect(res.status).toBe(200);

    const json = await res.json() as { data: { reports: typeof savedReportRow[] } };
    expect(json.data.reports).toHaveLength(1);

    // student_id 필터(VALID_STUDENT_ID)가 포함되어 있는지 확인
    const eqCalls = eqChain.mock.calls as [string, string][];
    const hasStudentFilter = eqCalls.some(
      ([field, value]) => field === "student_id" && value === VALID_STUDENT_ID
    );
    expect(hasStudentFilter).toBe(true);
  });

  // 16. 강사가 studentId 지정 시 해당 수강생 리포트 조회
  it("강사가 studentId 지정 시 해당 수강생 리포트 조회", async () => {
    const { mockSupabase, eqChain } = buildGetSupabaseMock({
      userResult: { data: { user: { id: VALID_TEACHER_ID } }, error: null },
      profileResult: { data: { role: "teacher" }, error: null },
    });
    setMockClient(mockSupabase);

    const res = await GET(
      makeGetRequest({ sessionId: VALID_SESSION_ID, studentId: VALID_STUDENT_ID })
    );
    expect(res.status).toBe(200);

    // student_id 필터가 적용되어야 함
    const eqCalls = eqChain.mock.calls as [string, string][];
    const hasStudentFilter = eqCalls.some(
      ([field, value]) => field === "student_id" && value === VALID_STUDENT_ID
    );
    expect(hasStudentFilter).toBe(true);
  });

  // 17. 강사가 studentId 미지정 시 세션 전체 리포트 조회
  it("강사가 studentId 미지정 시 세션 전체 리포트 조회 (student_id 필터 없음)", async () => {
    const { mockSupabase, eqChain } = buildGetSupabaseMock({
      userResult: { data: { user: { id: VALID_TEACHER_ID } }, error: null },
      profileResult: { data: { role: "teacher" }, error: null },
    });
    setMockClient(mockSupabase);

    const res = await GET(makeGetRequest({ sessionId: VALID_SESSION_ID }));
    expect(res.status).toBe(200);

    // student_id 필터가 적용되지 않아야 함
    const eqCalls = eqChain.mock.calls as [string, string][];
    const hasStudentFilter = eqCalls.some(([field]) => field === "student_id");
    expect(hasStudentFilter).toBe(false);
  });

  // 18. DB 오류 시 500
  it("DB 오류 시 500 반환", async () => {
    const { mockSupabase } = buildGetSupabaseMock({
      reportsResult: { data: null, error: new Error("DB connection failed") },
    });
    setMockClient(mockSupabase);

    const res = await GET(makeGetRequest({ sessionId: VALID_SESSION_ID }));
    expect(res.status).toBe(500);
  });
});
