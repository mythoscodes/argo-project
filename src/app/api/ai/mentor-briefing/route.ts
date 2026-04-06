import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { getModel } from "@/lib/ai/model";
import {
  buildMentorBriefingSystemPrompt,
  buildMentorBriefingUserPrompt,
} from "@/lib/ai/prompts/mentor-briefing";
import {
  mentorBriefingResponseSchema,
  type MentorBriefingResponse,
} from "@/lib/ai/schemas/mentor-briefing";
import {
  AI_TEMPERATURE_MENTOR_BRIEFING,
  AI_MAX_RETRY_COUNT,
  WEAK_TOPIC_THRESHOLD,
  RISK_ACCURACY_THRESHOLD,
  RISK_ACCURACY_SESSION_COUNT,
  RISK_ABSENCE_THRESHOLD,
  RISK_SIGNAL_COUNT_FOR_HIGH,
} from "@/lib/constants";

const PostRequestSchema = z.object({
  studentId: z.string().uuid(),
});

async function callMentorBriefingGeneration(params: {
  studentName: string;
  subject: string;
  recentAccuracyRates: number[];
  weakTopics: string[];
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  riskSignals: string[];
  availableCourses: Array<{
    title: string;
    category: string;
    topics: string[];
    instructorName: string;
    schedule: string | null;
  }>;
}): Promise<MentorBriefingResponse> {
  const model = getModel("mentor-briefing");

  const { object } = await generateObject({
    model,
    temperature: AI_TEMPERATURE_MENTOR_BRIEFING,
    schema: mentorBriefingResponseSchema,
    system: buildMentorBriefingSystemPrompt(),
    prompt: buildMentorBriefingUserPrompt(params),
  });

  return object;
}

type BriefingResult =
  | { success: true; data: MentorBriefingResponse }
  | { success: false; error: string };

async function generateBriefingWithRetry(params: {
  studentName: string;
  subject: string;
  recentAccuracyRates: number[];
  weakTopics: string[];
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  riskSignals: string[];
  availableCourses: Array<{
    title: string;
    category: string;
    topics: string[];
    instructorName: string;
    schedule: string | null;
  }>;
}): Promise<BriefingResult> {
  try {
    const data = await callMentorBriefingGeneration(params);
    return { success: true, data };
  } catch {
    // 1회 재시도
    try {
      const data = await callMentorBriefingGeneration(params);
      return { success: true, data };
    } catch (retryError) {
      const errorMessage =
        retryError instanceof Error ? retryError.message : "알 수 없는 오류";
      return {
        success: false,
        error: `AI 상담 브리핑 생성에 실패했습니다. (재시도 ${AI_MAX_RETRY_COUNT}회 초과): ${errorMessage}`,
      };
    }
  }
}

export async function POST(req: NextRequest) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문을 파싱할 수 없습니다." },
      { status: 400 }
    );
  }

  const parseResult = PostRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "입력값이 올바르지 않습니다.",
        details: parseResult.error.issues,
      },
      { status: 400 }
    );
  }

  const { studentId } = parseResult.data;

  // 수강생 프로필
  const { data: studentProfile, error: studentError } = await supabase
    .from("profiles")
    .select("id, display_name, academy_id")
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

  // 내 세션
  const { data: mySessions } = await supabase
    .from("sessions")
    .select("id, subject, created_at")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const sessionIds = (mySessions ?? []).map((s) => s.id);
  const primarySubject = mySessions?.[0]?.subject ?? "IT";

  // 세션 참여 이력
  const { data: participations } = await supabase
    .from("session_participants")
    .select("session_id")
    .eq("student_id", studentId)
    .in("session_id", sessionIds);

  const participatedSessionIds = new Set(
    (participations ?? []).map((p) => p.session_id)
  );

  // 응답 데이터
  const { data: studentResponses } = await supabase
    .from("responses")
    .select("quiz_id, session_id, is_correct, response_time_ms")
    .eq("student_id", studentId)
    .in("session_id", sessionIds);

  // 퀴즈 토픽
  const { data: sessionQuizzes } = await supabase
    .from("quizzes")
    .select("id, topic_tag")
    .in("session_id", sessionIds);

  const quizTopicMap = new Map(
    (sessionQuizzes ?? []).map((q) => [q.id, q.topic_tag])
  );

  // 세션별 정답률
  const sessionAccuracy = new Map<string, { correct: number; total: number }>();
  for (const resp of studentResponses ?? []) {
    const existing = sessionAccuracy.get(resp.session_id) ?? {
      correct: 0,
      total: 0,
    };
    sessionAccuracy.set(resp.session_id, {
      correct: existing.correct + (resp.is_correct ? 1 : 0),
      total: existing.total + 1,
    });
  }

  const recentAccuracyRates = (mySessions ?? [])
    .filter((s) => sessionAccuracy.has(s.id))
    .slice(0, RISK_ACCURACY_SESSION_COUNT)
    .map((s) => {
      const stats = sessionAccuracy.get(s.id)!;
      return stats.total > 0
        ? Math.round((stats.correct / stats.total) * 100)
        : 0;
    });

  // 3-signal 계산
  const avgAccuracy =
    recentAccuracyRates.length > 0
      ? recentAccuracyRates.reduce((s, r) => s + r, 0) /
        recentAccuracyRates.length
      : 100;

  const accuracyTriggered = avgAccuracy < RISK_ACCURACY_THRESHOLD;

  const recentSpeeds = (mySessions ?? [])
    .slice(0, 3)
    .map((s) => {
      const resps = (studentResponses ?? []).filter(
        (r) => r.session_id === s.id && r.response_time_ms !== null
      );
      if (resps.length === 0) return 0;
      return (
        resps.reduce((acc, r) => acc + (r.response_time_ms ?? 0), 0) /
        resps.length
      );
    });

  const speedTriggered =
    recentSpeeds.length >= 2 &&
    recentSpeeds[0] > recentSpeeds[recentSpeeds.length - 1] * 1.3;

  let consecutiveAbsence = 0;
  for (const session of mySessions ?? []) {
    if (!participatedSessionIds.has(session.id)) {
      consecutiveAbsence++;
    } else {
      break;
    }
  }
  const absenceTriggered = consecutiveAbsence >= RISK_ABSENCE_THRESHOLD;

  const triggeredCount = [
    accuracyTriggered,
    speedTriggered,
    absenceTriggered,
  ].filter(Boolean).length;

  const riskLevel: "HIGH" | "MEDIUM" | "LOW" =
    triggeredCount >= RISK_SIGNAL_COUNT_FOR_HIGH
      ? "HIGH"
      : triggeredCount === 1
        ? "MEDIUM"
        : "LOW";

  const riskSignals: string[] = [];
  if (accuracyTriggered)
    riskSignals.push(`평균 정답률 ${Math.round(avgAccuracy)}%로 기준 미달`);
  if (speedTriggered) riskSignals.push("응답 속도 30% 이상 증가");
  if (absenceTriggered)
    riskSignals.push(`${consecutiveAbsence}회 연속 미참여`);

  // 약점 토픽
  const topicStats = new Map<string, { correct: number; total: number }>();
  for (const resp of studentResponses ?? []) {
    const topic = quizTopicMap.get(resp.quiz_id) ?? "기타";
    const existing = topicStats.get(topic) ?? { correct: 0, total: 0 };
    topicStats.set(topic, {
      correct: existing.correct + (resp.is_correct ? 1 : 0),
      total: existing.total + 1,
    });
  }

  const weakTopics = [...topicStats.entries()]
    .filter(
      ([, stats]) =>
        stats.total > 0 &&
        (stats.correct / stats.total) * 100 < WEAK_TOPIC_THRESHOLD
    )
    .map(([topic]) => topic);

  // 내부 강의 목록
  const { data: courses } = await supabase
    .from("courses")
    .select("title, category, topics, instructor_name, schedule")
    .eq("academy_id", profile.academy_id)
    .eq("is_active", true);

  const availableCourses = (courses ?? []).map((c) => ({
    title: c.title,
    category: c.category,
    topics: c.topics,
    instructorName: c.instructor_name,
    schedule: c.schedule,
  }));

  // AI 브리핑 생성
  const briefingResult = await generateBriefingWithRetry({
    studentName: studentProfile.display_name,
    subject: primarySubject,
    recentAccuracyRates,
    weakTopics,
    riskLevel,
    riskSignals,
    availableCourses,
  });

  if (!briefingResult.success) {
    return NextResponse.json(
      { error: briefingResult.error },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { data: { briefing: briefingResult.data, riskLevel, riskSignals } },
    { status: 200 }
  );
}
