import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import {
  RISK_ACCURACY_THRESHOLD,
  RISK_ACCURACY_SESSION_COUNT,
  RISK_ABSENCE_THRESHOLD,
  RISK_SIGNAL_COUNT_FOR_HIGH,
  WEAK_TOPIC_THRESHOLD,
} from "@/lib/constants";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  if (!["owner", "teacher"].includes(profile.role)) {
    return NextResponse.json(
      { error: "강사/원장만 접근할 수 있습니다." },
      { status: 403 }
    );
  }

  const resolvedParams = await params;
  const parseResult = ParamsSchema.safeParse(resolvedParams);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "유효하지 않은 수강생 ID입니다." },
      { status: 400 }
    );
  }

  const studentId = parseResult.data.id;

  // 수강생 프로필
  const { data: studentProfile, error: studentError } = await supabase
    .from("profiles")
    .select("id, display_name, role, academy_id")
    .eq("id", studentId)
    .single();

  if (studentError || !studentProfile) {
    return NextResponse.json(
      { error: "수강생을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (studentProfile.academy_id !== profile.academy_id) {
    return NextResponse.json(
      { error: "같은 학원의 수강생만 조회할 수 있습니다." },
      { status: 403 }
    );
  }

  // 내 세션 목록
  const { data: mySessions } = await supabase
    .from("sessions")
    .select("id, title, subject, created_at, status")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const sessionIds = (mySessions ?? []).map((s) => s.id);

  // 수강생의 세션 참여 이력
  const { data: participations } = await supabase
    .from("session_participants")
    .select("session_id, joined_at")
    .eq("student_id", studentId)
    .in("session_id", sessionIds);

  const participatedSessionIds = new Set(
    (participations ?? []).map((p) => p.session_id)
  );

  // 수강생의 응답 데이터
  const { data: studentResponses } = await supabase
    .from("responses")
    .select("quiz_id, session_id, is_correct, response_time_ms, created_at")
    .eq("student_id", studentId)
    .in("session_id", sessionIds);

  // 퀴즈 데이터
  const { data: sessionQuizzes } = await supabase
    .from("quizzes")
    .select("id, session_id, topic_tag")
    .in("session_id", sessionIds);

  const quizTopicMap = new Map(
    (sessionQuizzes ?? []).map((q) => [q.id, q.topic_tag])
  );

  // 세션별 정답률 (시간순)
  const sessionAccuracyMap = new Map<
    string,
    { correct: number; total: number; avgResponseTime: number }
  >();

  for (const resp of studentResponses ?? []) {
    const existing = sessionAccuracyMap.get(resp.session_id) ?? {
      correct: 0,
      total: 0,
      avgResponseTime: 0,
    };
    const responseCount = existing.total + 1;
    const newAvgTime =
      (existing.avgResponseTime * existing.total +
        (resp.response_time_ms ?? 0)) /
      responseCount;

    sessionAccuracyMap.set(resp.session_id, {
      correct: existing.correct + (resp.is_correct ? 1 : 0),
      total: responseCount,
      avgResponseTime: Math.round(newAvgTime),
    });
  }

  // 세션별 정답률 배열 (최신순)
  const sessionAccuracyHistory = (mySessions ?? [])
    .filter((s) => sessionAccuracyMap.has(s.id))
    .map((s) => {
      const stats = sessionAccuracyMap.get(s.id)!;
      return {
        sessionId: s.id,
        sessionTitle: s.title,
        createdAt: s.created_at,
        accuracyRate:
          stats.total > 0
            ? Math.round((stats.correct / stats.total) * 100)
            : 0,
        totalQuizzes: stats.total,
        correctCount: stats.correct,
        avgResponseTimeMs: stats.avgResponseTime,
      };
    });

  // 3-signal 이탈 위험 계산
  const recentRates = sessionAccuracyHistory
    .slice(0, RISK_ACCURACY_SESSION_COUNT)
    .map((s) => s.accuracyRate);

  const avgRecentAccuracy =
    recentRates.length > 0
      ? recentRates.reduce((sum, r) => sum + r, 0) / recentRates.length
      : 100;

  const accuracyTriggered = avgRecentAccuracy < RISK_ACCURACY_THRESHOLD;

  // 응답 속도 추세
  const recentSpeeds = sessionAccuracyHistory
    .slice(0, 3)
    .map((s) => s.avgResponseTimeMs);
  const speedTriggered =
    recentSpeeds.length >= 2 &&
    recentSpeeds[0] > recentSpeeds[recentSpeeds.length - 1] * 1.3;

  // 연속 미참여
  let consecutiveAbsence = 0;
  for (const session of mySessions ?? []) {
    if (!participatedSessionIds.has(session.id)) {
      consecutiveAbsence++;
    } else {
      break;
    }
  }
  const absenceTriggered = consecutiveAbsence >= RISK_ABSENCE_THRESHOLD;

  const triggeredCount = [accuracyTriggered, speedTriggered, absenceTriggered].filter(Boolean).length;
  const riskLevel: "HIGH" | "MEDIUM" | "LOW" =
    triggeredCount >= RISK_SIGNAL_COUNT_FOR_HIGH
      ? "HIGH"
      : triggeredCount === 1
        ? "MEDIUM"
        : "LOW";

  const riskSignals = [
    {
      type: "accuracy" as const,
      description: `최근 ${recentRates.length}세션 평균 정답률 ${Math.round(avgRecentAccuracy)}%`,
      triggered: accuracyTriggered,
    },
    {
      type: "speed" as const,
      description: speedTriggered
        ? "응답 속도 30% 이상 증가"
        : "응답 속도 정상",
      triggered: speedTriggered,
    },
    {
      type: "absence" as const,
      description:
        consecutiveAbsence > 0
          ? `최근 ${consecutiveAbsence}회 연속 미참여`
          : "출석 정상",
      triggered: absenceTriggered,
    },
  ];

  // 토픽별 이해도
  const topicStats = new Map<string, { correct: number; total: number }>();
  for (const resp of studentResponses ?? []) {
    const topic = quizTopicMap.get(resp.quiz_id) ?? "기타";
    const existing = topicStats.get(topic) ?? { correct: 0, total: 0 };
    topicStats.set(topic, {
      correct: existing.correct + (resp.is_correct ? 1 : 0),
      total: existing.total + 1,
    });
  }

  const topicScores = [...topicStats.entries()].map(([topic, stats]) => ({
    topic,
    score:
      stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    totalQuizzes: stats.total,
  }));

  const weakTopics = topicScores
    .filter((t) => t.score < WEAK_TOPIC_THRESHOLD)
    .map((t) => t.topic);

  // 상담 기록
  const { data: consultations } = await supabase
    .from("consultation_notes")
    .select("*")
    .eq("student_id", studentId)
    .eq("instructor_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    data: {
      student: {
        id: studentProfile.id,
        displayName: studentProfile.display_name,
      },
      riskLevel,
      riskSignals,
      sessionAccuracyHistory,
      topicScores,
      weakTopics,
      consultations: consultations ?? [],
    },
  });
}
