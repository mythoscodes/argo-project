import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WEAK_TOPIC_THRESHOLD, RESPONSE_RATE_THRESHOLD } from "@/lib/constants";

interface SessionStatRow {
  sessionId: string;
  title: string;
  subject: string;
  teacherName: string;
  status: string;
  studentCount: number;
  avgUnderstanding: number;
  createdAt: string;
}

interface AtRiskStudentRow {
  studentId: string;
  studentName: string;
  sessionTitle: string;
  avgScore: number;
  responseRate: number;
}

interface DashboardSummary {
  totalSessions: number;
  activeSessions: number;
  totalStudents: number;
  academyAvgUnderstanding: number;
}

interface DashboardData {
  sessionStats: SessionStatRow[];
  atRiskStudents: AtRiskStudentRow[];
  summary: DashboardSummary;
}

interface SessionRow {
  id: string;
  title: string;
  subject: string;
  status: string;
  created_at: string;
  teacher_id: string;
  profiles: { display_name: string } | null;
}

interface ResponseRow {
  session_id: string;
  student_id: string;
  is_correct: boolean;
}

interface QuizRow {
  id: string;
  session_id: string;
}

interface ParticipantRow {
  session_id: string;
  student_id: string;
}

interface ProfileRow {
  id: string;
  display_name: string;
}

function isSessionRow(value: unknown): value is SessionRow {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.subject === "string" &&
    typeof obj.status === "string" &&
    typeof obj.created_at === "string" &&
    typeof obj.teacher_id === "string"
  );
}

function isResponseRow(value: unknown): value is ResponseRow {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.session_id === "string" &&
    typeof obj.student_id === "string" &&
    typeof obj.is_correct === "boolean"
  );
}

function isQuizRow(value: unknown): value is QuizRow {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.id === "string" && typeof obj.session_id === "string";
}

function isParticipantRow(value: unknown): value is ParticipantRow {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.session_id === "string" && typeof obj.student_id === "string"
  );
}

function isProfileRow(value: unknown): value is ProfileRow {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.id === "string" && typeof obj.display_name === "string";
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, academy_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "프로필을 찾을 수 없습니다." },
      { status: 403 }
    );
  }

  if (profile.role !== "owner") {
    return NextResponse.json(
      { error: "원장(owner) 권한이 필요합니다." },
      { status: 403 }
    );
  }

  const academyId = profile.academy_id;

  // 1. 세션 목록 조회 (강사 프로필 join)
  // profiles 테이블과의 관계가 database.ts Relationships에 선언되지 않아
  // 쿼리 결과를 unknown으로 캐스팅 후 타입 가드로 처리
  const { data: rawSessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, title, subject, status, created_at, teacher_id, profiles(display_name)")
    .eq("academy_id", academyId)
    .order("created_at", { ascending: false });

  if (sessionsError) {
    return NextResponse.json(
      { error: `세션 조회 실패: ${sessionsError.message}` },
      { status: 500 }
    );
  }

  const sessions = ((rawSessions as unknown[]) ?? []).filter(isSessionRow);
  const sessionIds = sessions.map((s) => s.id);

  if (sessionIds.length === 0) {
    const emptyData: DashboardData = {
      sessionStats: [],
      atRiskStudents: [],
      summary: {
        totalSessions: 0,
        activeSessions: 0,
        totalStudents: 0,
        academyAvgUnderstanding: 0,
      },
    };
    return NextResponse.json({ data: emptyData });
  }

  // 2. 응답 데이터 조회 (세션별 평균 정답률 계산용)
  const { data: rawResponses } = await supabase
    .from("responses")
    .select("session_id, student_id, is_correct")
    .in("session_id", sessionIds);

  const responses = ((rawResponses as unknown[]) ?? []).filter(isResponseRow);

  // 3. 퀴즈 수 조회 (응답률 계산용)
  const { data: rawQuizzes } = await supabase
    .from("quizzes")
    .select("id, session_id")
    .in("session_id", sessionIds);

  const quizzes = ((rawQuizzes as unknown[]) ?? []).filter(isQuizRow);

  // 4. 세션 참여자 조회
  const { data: rawParticipants } = await supabase
    .from("session_participants")
    .select("session_id, student_id")
    .in("session_id", sessionIds);

  const participants = ((rawParticipants as unknown[]) ?? []).filter(
    isParticipantRow
  );

  // 5. 세션별 참여 학생 수 집계
  const studentCountBySession = new Map<string, Set<string>>();
  for (const participant of participants) {
    const studentSet =
      studentCountBySession.get(participant.session_id) ?? new Set<string>();
    studentSet.add(participant.student_id);
    studentCountBySession.set(participant.session_id, studentSet);
  }

  // 6. 세션별 평균 정답률 집계
  const sessionScoreMap = new Map<string, { correct: number; total: number }>();
  for (const response of responses) {
    const existing = sessionScoreMap.get(response.session_id) ?? {
      correct: 0,
      total: 0,
    };
    sessionScoreMap.set(response.session_id, {
      correct: existing.correct + (response.is_correct ? 1 : 0),
      total: existing.total + 1,
    });
  }

  // 7. 세션별 퀴즈 수 집계
  const quizCountBySession = new Map<string, number>();
  for (const quiz of quizzes) {
    quizCountBySession.set(
      quiz.session_id,
      (quizCountBySession.get(quiz.session_id) ?? 0) + 1
    );
  }

  // 8. sessionStats 구성
  const sessionStats: SessionStatRow[] = sessions.map((session) => {
    const scoreStats = sessionScoreMap.get(session.id);
    const avgUnderstanding =
      scoreStats && scoreStats.total > 0
        ? Math.round((scoreStats.correct / scoreStats.total) * 100)
        : 0;

    const teacherName =
      session.profiles && typeof session.profiles === "object"
        ? (session.profiles as { display_name: string }).display_name
        : "알 수 없음";

    return {
      sessionId: session.id,
      title: session.title,
      subject: session.subject,
      teacherName,
      status: session.status,
      studentCount: studentCountBySession.get(session.id)?.size ?? 0,
      avgUnderstanding,
      createdAt: session.created_at,
    };
  });

  // 9. 수강생별 정답률·응답률 계산 → 이탈 위험 필터링
  const studentIds = Array.from(
    new Set(participants.map((p) => p.student_id))
  );

  // 수강생별·세션별 응답 집계
  type StudentSessionKey = `${string}::${string}`;
  const studentSessionStats = new Map<
    StudentSessionKey,
    { correct: number; responded: number }
  >();

  for (const response of responses) {
    const key: StudentSessionKey = `${response.student_id}::${response.session_id}`;
    const existing = studentSessionStats.get(key) ?? {
      correct: 0,
      responded: 0,
    };
    studentSessionStats.set(key, {
      correct: existing.correct + (response.is_correct ? 1 : 0),
      responded: existing.responded + 1,
    });
  }

  // 수강생 display_name 조회
  let profileNameMap = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: rawStudentProfiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", studentIds);

    const studentProfiles = ((rawStudentProfiles as unknown[]) ?? []).filter(
      isProfileRow
    );

    profileNameMap = new Map(
      studentProfiles.map((p) => [p.id, p.display_name])
    );
  }

  // 세션 타이틀 맵
  const sessionTitleMap = new Map(sessions.map((s) => [s.id, s.title]));

  // 이탈 위험 수강생 필터링
  const atRiskStudents: AtRiskStudentRow[] = [];

  for (const participant of participants) {
    const key: StudentSessionKey = `${participant.student_id}::${participant.session_id}`;
    const stats = studentSessionStats.get(key);
    const quizCount = quizCountBySession.get(participant.session_id) ?? 0;

    const responded = stats?.responded ?? 0;
    const correct = stats?.correct ?? 0;

    const avgScore =
      responded > 0 ? Math.round((correct / responded) * 100) : 0;
    const responseRate =
      quizCount > 0 ? Math.round((responded / quizCount) * 100) : 0;

    if (
      avgScore < WEAK_TOPIC_THRESHOLD ||
      responseRate < RESPONSE_RATE_THRESHOLD
    ) {
      atRiskStudents.push({
        studentId: participant.student_id,
        studentName:
          profileNameMap.get(participant.student_id) ?? "알 수 없음",
        sessionTitle:
          sessionTitleMap.get(participant.session_id) ?? "알 수 없음",
        avgScore,
        responseRate,
      });
    }
  }

  // 중복 제거: 같은 수강생이 동일 세션에서 중복 집계되지 않도록
  const uniqueAtRiskStudents = Array.from(
    new Map(
      atRiskStudents.map((s) => [`${s.studentId}::${s.sessionTitle}`, s])
    ).values()
  );

  // 10. summary 집계
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter((s) => s.status === "active").length;
  const totalStudents = new Set(participants.map((p) => p.student_id)).size;

  const scoresWithData = sessionStats
    .filter((s) => s.avgUnderstanding > 0)
    .map((s) => s.avgUnderstanding);
  const academyAvgUnderstanding =
    scoresWithData.length > 0
      ? Math.round(
          scoresWithData.reduce((sum, score) => sum + score, 0) /
            scoresWithData.length
        )
      : 0;

  const dashboardData: DashboardData = {
    sessionStats,
    atRiskStudents: uniqueAtRiskStudents,
    summary: {
      totalSessions,
      activeSessions,
      totalStudents,
      academyAvgUnderstanding,
    },
  };

  return NextResponse.json({ data: dashboardData });
}
