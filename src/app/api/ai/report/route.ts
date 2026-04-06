import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { getModel } from "@/lib/ai/model";
import {
  buildReportSystemPrompt,
  buildReportUserPrompt,
} from "@/lib/ai/prompts/report";
import {
  reportResponseSchema,
  type ReportResponse,
} from "@/lib/ai/schemas/report";
import {
  AI_TEMPERATURE_REPORT,
  AI_MAX_RETRY_COUNT,
  WEAK_TOPIC_THRESHOLD,
} from "@/lib/constants";
import type { Json } from "@/types/database";

const PostRequestSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid().optional(),
});

const GetRequestSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid().optional(),
});

type PostRequest = z.infer<typeof PostRequestSchema>;

async function callReportGeneration(params: {
  studentName: string;
  sessionTitle: string;
  subject: string;
  topicScores: Record<string, number>;
  totalQuizzes: number;
  correctCount: number;
  weakTopics: string[];
}): Promise<ReportResponse> {
  const model = getModel("report");

  const { output } = await generateText({
    model,
    // temperature: 0.5 — 리포트는 자연스러운 서술과 다양한 추천 표현이 필요
    temperature: AI_TEMPERATURE_REPORT,
    output: Output.object({ schema: reportResponseSchema }),
    system: buildReportSystemPrompt(),
    prompt: buildReportUserPrompt(params),
  });

  if (!output) throw new Error("AI 응답이 스키마에 맞지 않습니다.");
  return output;
}

type ReportResult =
  | { success: true; data: ReportResponse }
  | { success: false; error: string };

async function generateReportWithRetry(params: {
  studentName: string;
  sessionTitle: string;
  subject: string;
  topicScores: Record<string, number>;
  totalQuizzes: number;
  correctCount: number;
  weakTopics: string[];
}): Promise<ReportResult> {
  try {
    const data = await callReportGeneration(params);
    return { success: true, data };
  } catch {
    // 1회 재시도
    try {
      const data = await callReportGeneration(params);
      return { success: true, data };
    } catch (retryError) {
      const errorMessage =
        retryError instanceof Error ? retryError.message : "알 수 없는 오류";
      return {
        success: false,
        error: `AI 리포트 생성에 실패했습니다. (재시도 ${AI_MAX_RETRY_COUNT}회 초과): ${errorMessage}`,
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

  const { sessionId, studentId: requestedStudentId }: PostRequest =
    parseResult.data;

  const isTeacher = ["owner", "teacher"].includes(profile.role);

  // 강사는 studentId 필수, 수강생은 본인 리포트만 생성 가능
  if (isTeacher && !requestedStudentId) {
    return NextResponse.json(
      { error: "강사는 studentId를 지정해야 합니다." },
      { status: 400 }
    );
  }

  const targetStudentId = isTeacher ? requestedStudentId! : user.id;

  // 세션 정보 조회
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, teacher_id, title, subject")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "세션을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 강사는 본인 세션의 수강생 리포트만 생성 가능
  if (isTeacher && session.teacher_id !== user.id) {
    return NextResponse.json(
      { error: "해당 세션의 강사만 리포트를 생성할 수 있습니다." },
      { status: 403 }
    );
  }

  // 수강생은 자신이 참여한 세션인지 확인
  if (!isTeacher) {
    const { data: participation } = await supabase
      .from("session_participants")
      .select("id")
      .eq("session_id", sessionId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (!participation) {
      return NextResponse.json(
        { error: "참여한 세션의 리포트만 조회할 수 있습니다." },
        { status: 403 }
      );
    }
  }

  // 대상 수강생 이름 조회
  const { data: studentProfile, error: studentProfileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", targetStudentId)
    .single();

  if (studentProfileError || !studentProfile) {
    return NextResponse.json(
      { error: "수강생 정보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 수강생의 응답 데이터 집계
  const { data: studentResponses } = await supabase
    .from("responses")
    .select("quiz_id, is_correct")
    .eq("session_id", sessionId)
    .eq("student_id", targetStudentId);

  const { data: sessionQuizzes } = await supabase
    .from("quizzes")
    .select("id, topic_tag")
    .eq("session_id", sessionId);

  const quizTopicMap = new Map(
    (sessionQuizzes ?? []).map((q) => [q.id, q.topic_tag])
  );

  const topicStats = new Map<string, { correct: number; total: number }>();
  let totalCorrect = 0;

  for (const response of studentResponses ?? []) {
    const topicTag = quizTopicMap.get(response.quiz_id) ?? "기타";
    const existing = topicStats.get(topicTag) ?? { correct: 0, total: 0 };
    const isCorrect = response.is_correct ? 1 : 0;
    topicStats.set(topicTag, {
      correct: existing.correct + isCorrect,
      total: existing.total + 1,
    });
    totalCorrect += isCorrect;
  }

  const topicScores: Record<string, number> = Object.fromEntries(
    Array.from(topicStats.entries()).map(([tag, stats]) => [
      tag,
      stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    ])
  );

  const weakTopics = Object.entries(topicScores)
    .filter(([, score]) => score <= WEAK_TOPIC_THRESHOLD)
    .map(([topic]) => topic);

  const totalQuizzes = studentResponses?.length ?? 0;

  // AI 리포트 생성 (실패 시 1회 재시도)
  const reportResult = await generateReportWithRetry({
    studentName: studentProfile.display_name,
    sessionTitle: session.title,
    subject: session.subject,
    topicScores,
    totalQuizzes,
    correctCount: totalCorrect,
    weakTopics,
  });

  if (!reportResult.success) {
    return NextResponse.json({ error: reportResult.error }, { status: 502 });
  }

  // student_reports 테이블에 저장
  const { data: savedReport, error: saveError } = await supabase
    .from("student_reports")
    .insert({
      student_id: targetStudentId,
      academy_id: profile.academy_id,
      session_id: sessionId,
      report_type: "session",
      understanding_summary: reportResult.data as unknown as Json,
      weak_topics: weakTopics as unknown as Json,
      recommendations: reportResult.data.recommendations.join("\n"),
    })
    .select()
    .single();

  if (saveError) {
    return NextResponse.json(
      { error: `리포트 저장에 실패했습니다: ${saveError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: { report: reportResult.data, reportId: savedReport.id } },
    { status: 201 }
  );
}

export async function GET(req: NextRequest) {
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
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "프로필을 찾을 수 없습니다." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const rawParams = {
    sessionId: searchParams.get("sessionId") ?? undefined,
    studentId: searchParams.get("studentId") ?? undefined,
  };

  const parseResult = GetRequestSchema.safeParse(rawParams);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "쿼리 파라미터가 올바르지 않습니다.",
        details: parseResult.error.issues,
      },
      { status: 400 }
    );
  }

  const { sessionId, studentId: requestedStudentId } = parseResult.data;
  const isTeacher = ["owner", "teacher"].includes(profile.role);

  let query = supabase
    .from("student_reports")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (isTeacher) {
    // 강사: 특정 수강생 지정 시 해당 수강생, 미지정 시 세션 전체
    if (requestedStudentId) {
      query = query.eq("student_id", requestedStudentId);
    }
  } else {
    // 수강생: 본인 리포트만 조회 (studentId 파라미터 무시)
    query = query.eq("student_id", user.id);
  }

  const { data: reports, error: fetchError } = await query;

  if (fetchError) {
    return NextResponse.json(
      { error: `리포트 조회에 실패했습니다: ${fetchError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { reports } });
}
