import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import type { Database } from "@/types/database";

type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];
type QuizForStudent = Omit<QuizRow, "correct_answer">;

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

  const { data: quizzes, error: fetchError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("session_id", sessionIdParsed.data)
    .order("order_index", { ascending: true });

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // 강사/원장은 정답 포함 전체 조회, 수강생은 응답 완료 전 정답 숨김
  if (profile.role !== "student") {
    return NextResponse.json({ data: quizzes });
  }

  // 수강생: 이미 응답 완료한 퀴즈 ID 조회
  const { data: completedResponses } = await supabase
    .from("responses")
    .select("quiz_id")
    .eq("session_id", sessionIdParsed.data)
    .eq("student_id", user.id);

  const completedQuizIds = new Set(
    (completedResponses ?? []).map((r) => r.quiz_id)
  );

  // 응답 완료 전 퀴즈는 correct_answer 제거
  const quizzesForStudent: Array<QuizForStudent | QuizRow> = (
    quizzes ?? []
  ).map((quiz) => {
    if (completedQuizIds.has(quiz.id)) {
      return quiz;
    }
    const { correct_answer: _omitted, ...quizWithoutAnswer } = quiz;
    return quizWithoutAnswer;
  });

  return NextResponse.json({ data: quizzesForStudent });
}
