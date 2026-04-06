import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { getModel } from "@/lib/ai/model";
import {
  buildCoachingSystemPrompt,
  buildCoachingUserPrompt,
} from "@/lib/ai/prompts/coaching";
import {
  coachingResponseSchema,
  type CoachingResponse,
} from "@/lib/ai/schemas/coaching";
import { AI_TEMPERATURE_COACHING, AI_MAX_RETRY_COUNT } from "@/lib/constants";
import type { Json } from "@/types/database";

const CoachingRequestSchema = z.object({
  sessionId: z.string().uuid(),
});

type CoachingRequest = z.infer<typeof CoachingRequestSchema>;

interface IncorrectPattern {
  question: string;
  wrongAnswer: string;
  count: number;
}

function isUnderstandingScores(
  value: Json | null
): value is Record<string, number> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((v) => typeof v === "number");
}

async function callCoachingGeneration(params: {
  topic: string;
  understandingScores: Record<string, number>;
  incorrectPatterns: IncorrectPattern[];
  totalStudents: number;
}): Promise<CoachingResponse> {
  const model = getModel("coaching");

  const { object } = await generateObject({
    model,
    // temperature: 0.5 — 코칭은 자연스러운 제안과 다양한 교수법 아이디어가 필요
    temperature: AI_TEMPERATURE_COACHING,
    schema: coachingResponseSchema,
    system: buildCoachingSystemPrompt(),
    prompt: buildCoachingUserPrompt(params),
  });

  return object;
}

type CoachingResult =
  | { success: true; data: CoachingResponse }
  | { success: false; error: string };

async function generateCoachingWithRetry(params: {
  topic: string;
  understandingScores: Record<string, number>;
  incorrectPatterns: IncorrectPattern[];
  totalStudents: number;
}): Promise<CoachingResult> {
  try {
    const data = await callCoachingGeneration(params);
    return { success: true, data };
  } catch {
    // 1회 재시도
    try {
      const data = await callCoachingGeneration(params);
      return { success: true, data };
    } catch (retryError) {
      const errorMessage =
        retryError instanceof Error ? retryError.message : "알 수 없는 오류";
      return {
        success: false,
        error: `AI 코칭 생성에 실패했습니다. (재시도 ${AI_MAX_RETRY_COUNT}회 초과): ${errorMessage}`,
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
    .select("role")
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
      { error: "강사 권한이 필요합니다." },
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

  const parseResult = CoachingRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "입력값이 올바르지 않습니다.",
        details: parseResult.error.issues,
      },
      { status: 400 }
    );
  }

  const { sessionId }: CoachingRequest = parseResult.data;

  // 세션 정보 조회
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, teacher_id, subject, topics")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "세션을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (session.teacher_id !== user.id) {
    return NextResponse.json(
      { error: "해당 세션의 강사만 코칭을 생성할 수 있습니다." },
      { status: 403 }
    );
  }

  // 주제 결정: subject + topics 첫 번째 항목
  const topicsArray = Array.isArray(session.topics) ? session.topics : [];
  const firstTopic =
    topicsArray.length > 0 && typeof topicsArray[0] === "string"
      ? topicsArray[0]
      : null;
  const topic = firstTopic
    ? `${session.subject} - ${firstTopic}`
    : session.subject;

  // 이해도 데이터 조회: analysis_results에서 최신 understanding 분석 결과
  const { data: latestAnalysis } = await supabase
    .from("analysis_results")
    .select("understanding_scores")
    .eq("session_id", sessionId)
    .eq("analysis_type", "understanding")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let understandingScores: Record<string, number>;

  if (latestAnalysis && isUnderstandingScores(latestAnalysis.understanding_scores)) {
    understandingScores = latestAnalysis.understanding_scores;
  } else {
    // analysis_results 없으면 responses에서 직접 계산
    const { data: allResponses } = await supabase
      .from("responses")
      .select("quiz_id, is_correct")
      .eq("session_id", sessionId);

    const { data: sessionQuizzes } = await supabase
      .from("quizzes")
      .select("id, topic_tag")
      .eq("session_id", sessionId);

    const quizTopicMap = new Map(
      (sessionQuizzes ?? []).map((q) => [q.id, q.topic_tag])
    );

    const topicStats = new Map<string, { correct: number; total: number }>();

    for (const response of allResponses ?? []) {
      const topicTag = quizTopicMap.get(response.quiz_id) ?? "기타";
      const existing = topicStats.get(topicTag) ?? { correct: 0, total: 0 };
      topicStats.set(topicTag, {
        correct: existing.correct + (response.is_correct ? 1 : 0),
        total: existing.total + 1,
      });
    }

    understandingScores = Object.fromEntries(
      Array.from(topicStats.entries()).map(([tag, stats]) => [
        tag,
        stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      ])
    );
  }

  // 오답 패턴 추출: 세션의 오답 응답 집계
  const { data: incorrectResponses } = await supabase
    .from("responses")
    .select("quiz_id, selected_answer")
    .eq("session_id", sessionId)
    .eq("is_correct", false);

  const { data: quizzesForSession } = await supabase
    .from("quizzes")
    .select("id, question_text")
    .eq("session_id", sessionId);

  const quizTextMap = new Map(
    (quizzesForSession ?? []).map((q) => [q.id, q.question_text])
  );

  const patternCountMap = new Map<string, number>();
  const patternKeyData = new Map<
    string,
    { question: string; wrongAnswer: string }
  >();

  for (const response of incorrectResponses ?? []) {
    const questionText =
      quizTextMap.get(response.quiz_id) ?? "알 수 없는 문제";
    const patternKey = `${response.quiz_id}::${response.selected_answer}`;
    patternCountMap.set(patternKey, (patternCountMap.get(patternKey) ?? 0) + 1);
    patternKeyData.set(patternKey, {
      question: questionText,
      wrongAnswer: response.selected_answer,
    });
  }

  const incorrectPatterns: IncorrectPattern[] = Array.from(
    patternCountMap.entries()
  ).map(([key, count]) => ({
    ...patternKeyData.get(key)!,
    count,
  }));

  // 수강생 수 조회
  const { count: totalStudents } = await supabase
    .from("session_participants")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);

  // AI 코칭 생성 (실패 시 1회 재시도)
  const coachingResult = await generateCoachingWithRetry({
    topic,
    understandingScores,
    incorrectPatterns,
    totalStudents: totalStudents ?? 0,
  });

  if (!coachingResult.success) {
    return NextResponse.json({ error: coachingResult.error }, { status: 502 });
  }

  // analysis_results에 coaching_suggestion으로 저장
  const { data: savedAnalysis, error: saveError } = await supabase
    .from("analysis_results")
    .insert({
      session_id: sessionId,
      analysis_type: "coaching",
      coaching_suggestion: JSON.stringify(coachingResult.data),
    })
    .select()
    .single();

  if (saveError) {
    return NextResponse.json(
      { error: `코칭 결과 저장에 실패했습니다: ${saveError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: { coaching: coachingResult.data, analysisId: savedAnalysis.id } },
    { status: 201 }
  );
}
