import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const submitResponseSchema = z.object({
  quizId: z.string().uuid(),
  sessionId: z.string().uuid(),
  selectedAnswer: z.string().min(1).max(500),
  responseTimeMs: z.number().int().min(0).max(600_000).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, academy_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "프로필을 찾을 수 없습니다" },
      { status: 403 }
    );
  }

  if (profile.role !== "student") {
    return NextResponse.json(
      { error: "수강생만 응답을 제출할 수 있습니다" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문을 파싱할 수 없습니다." },
      { status: 400 }
    );
  }

  const parsed = submitResponseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { quizId, sessionId, selectedAnswer, responseTimeMs } = parsed.data;

  // 퀴즈 조회: 정답 및 round_number 확인
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("id, correct_answer, round_number, session_id")
    .eq("id", quizId)
    .eq("session_id", sessionId)
    .single();

  if (quizError || !quiz) {
    return NextResponse.json(
      { error: "퀴즈를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  // 세션이 active 상태인지 확인
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "세션을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  if (session.status !== "active") {
    return NextResponse.json(
      { error: "활성화된 세션에서만 응답을 제출할 수 있습니다" },
      { status: 409 }
    );
  }

  const isCorrect = quiz.correct_answer === selectedAnswer;

  const { data: responseData, error: insertError } = await supabase
    .from("responses")
    .insert({
      quiz_id: quizId,
      session_id: sessionId,
      student_id: user.id,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      response_time_ms: responseTimeMs ?? null,
      round_number: quiz.round_number,
    })
    .select()
    .single();

  if (insertError) {
    // PostgreSQL unique violation: 중복 응답
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "이미 해당 퀴즈에 응답하셨습니다" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ data: responseData }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId 파라미터가 필요합니다" },
      { status: 400 }
    );
  }

  const sessionIdParsed = z.string().uuid().safeParse(sessionId);
  if (!sessionIdParsed.success) {
    return NextResponse.json(
      { error: "sessionId 형식이 올바르지 않습니다" },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "프로필을 찾을 수 없습니다" },
      { status: 403 }
    );
  }

  // 강사는 세션 전체 응답 조회, 수강생은 본인 응답만 조회
  let query = supabase
    .from("responses")
    .select("*")
    .eq("session_id", sessionIdParsed.data)
    .order("created_at", { ascending: true });

  if (profile.role === "student") {
    query = query.eq("student_id", user.id);
  }

  const { data: responsesData, error: fetchError } = await query;

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json({ data: responsesData });
}
