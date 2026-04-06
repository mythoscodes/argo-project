import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { GET, POST } from "./route";

type MockedCreateClient = ReturnType<typeof vi.fn>;

function setMockClient(mockSupabase: Record<string, unknown>): void {
  (createClient as unknown as MockedCreateClient).mockResolvedValue(
    mockSupabase
  );
}

const TEACHER_ID = "550e8400-e29b-41d4-a716-446655440001";
const ACADEMY_ID = "550e8400-e29b-41d4-a716-446655440002";
const STUDENT_ID = "550e8400-e29b-41d4-a716-446655440010";

const mockConsultation = {
  id: "c0000000-0000-0000-0000-000000000001",
  instructor_id: TEACHER_ID,
  student_id: STUDENT_ID,
  academy_id: ACADEMY_ID,
  type: "학습부진",
  content: "JPA 개념 부족 — 보충 학습 안내",
  next_consultation_date: "2026-04-10",
  created_at: "2026-04-06T10:00:00Z",
};

interface MockOverrides {
  userId?: string | null;
  authError?: Error | null;
  profileRole?: string;
  consultations?: typeof mockConsultation[] | null;
  consultationInsert?: typeof mockConsultation | null;
  insertError?: Error | null;
  studentAcademyId?: string;
}

function buildMock(overrides: MockOverrides = {}) {
  const userId = overrides.userId ?? TEACHER_ID;
  const mockGetUser = vi.fn().mockResolvedValue({
    data: { user: userId ? { id: userId } : null },
    error: overrides.authError ?? null,
  });

  const profileSingle = vi.fn().mockResolvedValue({
    data: {
      role: overrides.profileRole ?? "teacher",
      academy_id: ACADEMY_ID,
    },
    error: null,
  });

  const studentProfileSingle = vi.fn().mockResolvedValue({
    data: {
      academy_id: overrides.studentAcademyId ?? ACADEMY_ID,
    },
    error: null,
  });

  const consultationSelectResult = {
    data: overrides.consultations ?? [mockConsultation],
    error: null,
  };

  const consultationInsertSingle = vi.fn().mockResolvedValue({
    data: overrides.consultationInsert ?? mockConsultation,
    error: overrides.insertError ?? null,
  });

  let profileCallCount = 0;
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "profiles") {
      profileCallCount++;
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.single =
        profileCallCount <= 1 ? profileSingle : studentProfileSingle;
      return chain;
    }
    if (table === "consultation_notes") {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockResolvedValue(consultationSelectResult);
      chain.insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: consultationInsertSingle,
        }),
      });
      return chain;
    }
    return { select: vi.fn().mockReturnThis() };
  });

  return {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  };
}

function makeRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>
) {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => vi.clearAllMocks());

// ──────────────────────────────────────────────────────────
// GET /api/mentor/consultations
// ──────────────────────────────────────────────────────────
describe("GET /api/mentor/consultations", () => {
  it("미인증 시 401 반환", async () => {
    setMockClient(
      buildMock({ userId: null, authError: new Error("no auth") })
    );
    const req = makeRequest(
      "GET",
      `/api/mentor/consultations?studentId=${STUDENT_ID}`
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("수강생 역할이면 403 반환", async () => {
    setMockClient(buildMock({ profileRole: "student" }));
    const req = makeRequest(
      "GET",
      `/api/mentor/consultations?studentId=${STUDENT_ID}`
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("studentId 없으면 400 반환", async () => {
    setMockClient(buildMock());
    const req = makeRequest("GET", `/api/mentor/consultations`);
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("정상 요청 시 상담 기록 목록 반환", async () => {
    setMockClient(buildMock());
    const req = makeRequest(
      "GET",
      `/api/mentor/consultations?studentId=${STUDENT_ID}`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.consultations).toHaveLength(1);
    expect(json.data.consultations[0].type).toBe("학습부진");
  });

  it("빈 상담 기록이면 빈 배열 반환", async () => {
    setMockClient(buildMock({ consultations: [] }));
    const req = makeRequest(
      "GET",
      `/api/mentor/consultations?studentId=${STUDENT_ID}`
    );
    const res = await GET(req);
    const json = await res.json();
    expect(json.data.consultations).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────
// POST /api/mentor/consultations
// ──────────────────────────────────────────────────────────
describe("POST /api/mentor/consultations", () => {
  it("미인증 시 401 반환", async () => {
    setMockClient(
      buildMock({ userId: null, authError: new Error("no auth") })
    );
    const req = makeRequest("POST", "/api/mentor/consultations", {
      studentId: STUDENT_ID,
      type: "학습부진",
      content: "테스트",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("수강생 역할이면 403 반환", async () => {
    setMockClient(buildMock({ profileRole: "student" }));
    const req = makeRequest("POST", "/api/mentor/consultations", {
      studentId: STUDENT_ID,
      type: "학습부진",
      content: "테스트",
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("유효하지 않은 type이면 400 반환", async () => {
    setMockClient(buildMock());
    const req = makeRequest("POST", "/api/mentor/consultations", {
      studentId: STUDENT_ID,
      type: "invalid_type",
      content: "테스트",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("content 없으면 400 반환", async () => {
    setMockClient(buildMock());
    const req = makeRequest("POST", "/api/mentor/consultations", {
      studentId: STUDENT_ID,
      type: "학습부진",
      content: "",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("다른 학원 수강생이면 403 반환", async () => {
    setMockClient(buildMock({ studentAcademyId: "different-academy-id" }));
    const req = makeRequest("POST", "/api/mentor/consultations", {
      studentId: STUDENT_ID,
      type: "학습부진",
      content: "테스트 상담",
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("정상 요청 시 201 반환", async () => {
    setMockClient(buildMock());
    const req = makeRequest("POST", "/api/mentor/consultations", {
      studentId: STUDENT_ID,
      type: "학습부진",
      content: "JPA 개념 부족 — 보충 학습 안내",
      nextConsultationDate: "2026-04-10",
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.consultation.type).toBe("학습부진");
  });

  it("nextConsultationDate 생략 가능", async () => {
    setMockClient(buildMock());
    const req = makeRequest("POST", "/api/mentor/consultations", {
      studentId: STUDENT_ID,
      type: "진로",
      content: "진로 상담 진행",
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("모든 상담 유형 허용 (학습부진/진로/출결/기타)", async () => {
    for (const type of ["학습부진", "진로", "출결", "기타"]) {
      setMockClient(buildMock());
      const req = makeRequest("POST", "/api/mentor/consultations", {
        studentId: STUDENT_ID,
        type,
        content: `${type} 상담`,
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    }
  });
});
