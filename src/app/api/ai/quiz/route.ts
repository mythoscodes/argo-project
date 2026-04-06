import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { getModel } from "@/lib/ai/model";
import {
  buildQuizSystemPrompt,
  buildQuizUserPrompt,
} from "@/lib/ai/prompts/quiz-generation";
import {
  QuizGenerationResponseSchema,
  type GeneratedQuizQuestion,
} from "@/lib/ai/schemas/quiz";
import {
  AI_TEMPERATURE_QUIZ,
  AI_MAX_RETRY_COUNT,
  MAX_QUIZ_COUNT,
  MIN_QUIZ_COUNT,
  DEFAULT_QUIZ_COUNT,
} from "@/lib/constants";

const QuizRequestSchema = z.object({
  sessionId: z.string().uuid(),
  subject: z.string().min(1).max(100),
  topic: z.string().min(1).max(200),
  count: z
    .number()
    .int()
    .min(MIN_QUIZ_COUNT)
    .max(MAX_QUIZ_COUNT)
    .default(DEFAULT_QUIZ_COUNT),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("mixed"),
});

type QuizRequest = z.infer<typeof QuizRequestSchema>;

async function callQuizGeneration(
  params: QuizRequest,
  existingQuestions?: string[]
): Promise<GeneratedQuizQuestion[]> {
  const model = getModel("quiz");

  const { output } = await generateText({
    model,
    // temperature: 0.3 — 퀴즈는 정확도 우선, 창의성 최소화
    temperature: AI_TEMPERATURE_QUIZ,
    output: Output.object({ schema: QuizGenerationResponseSchema }),
    system: buildQuizSystemPrompt(),
    prompt: buildQuizUserPrompt({
      subject: params.subject,
      topic: params.topic,
      count: params.count,
      difficulty: params.difficulty,
      existingQuestions,
    }),
  });

  if (!output) throw new Error("AI 응답이 스키마에 맞지 않습니다.");
  return output.questions;
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

  const parseResult = QuizRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "입력값이 올바르지 않습니다.",
        details: parseResult.error.issues,
      },
      { status: 400 }
    );
  }

  const params = parseResult.data;

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, teacher_id, status")
    .eq("id", params.sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "세션을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (session.teacher_id !== user.id) {
    return NextResponse.json(
      { error: "해당 세션의 강사만 퀴즈를 생성할 수 있습니다." },
      { status: 403 }
    );
  }

  // 현재 라운드 번호 계산: 기존 최대 round_number + 1
  const { data: maxRoundData } = await supabase
    .from("quizzes")
    .select("round_number")
    .eq("session_id", params.sessionId)
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const roundNumber = (maxRoundData?.round_number ?? 0) + 1;

  // 동일 토픽의 기존 문제 조회 (재퀴즈 시 중복 방지)
  const { data: existingTopicQuizzes } = await supabase
    .from("quizzes")
    .select("question_text")
    .eq("session_id", params.sessionId)
    .eq("topic_tag", params.topic);

  const existingQuestions = existingTopicQuizzes?.map((q) => q.question_text) ?? [];

  // AI 퀴즈 생성 (실패 시 1회 재시도)
  const questions = await generateQuizzesWithRetry(params, existingQuestions);
  if (!questions.success) {
    return NextResponse.json({ error: questions.error }, { status: 502 });
  }

  // quizzes 테이블에 저장
  const quizInserts = questions.data.map((question, index) => ({
    session_id: params.sessionId,
    question_text: question.question_text,
    question_type: question.question_type,
    code_snippet: question.code_snippet ?? null,
    code_language: question.code_language ?? null,
    options: question.options,
    correct_answer: question.correct_answer,
    topic_tag: question.topic_tag,
    misconception_tags: question.misconception_tags ?? null,
    round_number: roundNumber,
    order_index: index,
  }));

  const { data: savedQuizzes, error: insertError } = await supabase
    .from("quizzes")
    .insert(quizInserts)
    .select();

  if (insertError) {
    return NextResponse.json(
      { error: `퀴즈 저장에 실패했습니다: ${insertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: savedQuizzes }, { status: 201 });
}

type QuizGenerationResult =
  | { success: true; data: GeneratedQuizQuestion[] }
  | { success: false; error: string };

async function generateQuizzesWithRetry(
  params: QuizRequest,
  existingQuestions: string[]
): Promise<QuizGenerationResult> {
  try {
    const data = await callQuizGeneration(params, existingQuestions);
    return { success: true, data };
  } catch {
    // 1회 재시도
    try {
      const data = await callQuizGeneration(params, existingQuestions);
      return { success: true, data };
    } catch (retryError) {
      const errorMessage =
        retryError instanceof Error ? retryError.message : "알 수 없는 오류";
      return {
        success: false,
        error: `AI 퀴즈 생성에 실패했습니다. (재시도 ${AI_MAX_RETRY_COUNT}회 초과): ${errorMessage}`,
      };
    }
  }
}
