import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import { WEAK_TOPIC_THRESHOLD } from "@/lib/constants";

const analysisGetQuerySchema = z.object({
  sessionId: z.string().uuid(),
  round: z.coerce.number().int().positive().optional(),
});

const analysisRequestSchema = z.object({
  sessionId: z.string().uuid(),
});

type ResponseWithQuiz = {
  id: string;
  quiz_id: string;
  student_id: string;
  selected_answer: string;
  is_correct: boolean;
  round_number: number;
  quizzes: {
    topic_tag: string;
    misconception_tags: string[] | null;
    correct_answer: string;
  };
};

type MisconceptionCluster = {
  wrongAnswer: string;
  count: number;
  misconceptionTags: string[];
};

function computeUnderstandingScores(
  responses: ResponseWithQuiz[]
): Record<string, number> {
  const topicStats: Record<string, { correct: number; total: number }> = {};

  for (const response of responses) {
    const topic = response.quizzes.topic_tag;
    if (!topicStats[topic]) {
      topicStats[topic] = { correct: 0, total: 0 };
    }
    topicStats[topic].total += 1;
    if (response.is_correct) {
      topicStats[topic].correct += 1;
    }
  }

  const scores: Record<string, number> = {};
  for (const [topic, stats] of Object.entries(topicStats)) {
    scores[topic] =
      stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  }

  return scores;
}

function extractWeakTopics(
  understandingScores: Record<string, number>
): string[] {
  return Object.entries(understandingScores)
    .filter(([, score]) => score <= WEAK_TOPIC_THRESHOLD)
    .map(([topic]) => topic);
}

function buildMisconceptionClusters(
  responses: ResponseWithQuiz[]
): Record<string, MisconceptionCluster[]> {
  // quiz_id별로 오답 패턴 집계
  const quizWrongAnswers: Record<
    string,
    {
      topic: string;
      misconceptionTags: string[];
      wrongAnswerCounts: Record<string, number>;
    }
  > = {};

  for (const response of responses) {
    if (response.is_correct) continue;

    const quizId = response.quiz_id;
    if (!quizWrongAnswers[quizId]) {
      quizWrongAnswers[quizId] = {
        topic: response.quizzes.topic_tag,
        misconceptionTags: response.quizzes.misconception_tags ?? [],
        wrongAnswerCounts: {},
      };
    }

    const { wrongAnswerCounts } = quizWrongAnswers[quizId];
    const answer = response.selected_answer;
    wrongAnswerCounts[answer] = (wrongAnswerCounts[answer] ?? 0) + 1;
  }

  // topic별 misconception 클러스터 생성
  const clusters: Record<string, MisconceptionCluster[]> = {};

  for (const quizData of Object.values(quizWrongAnswers)) {
    const { topic, misconceptionTags, wrongAnswerCounts } = quizData;
    if (!clusters[topic]) {
      clusters[topic] = [];
    }

    for (const [wrongAnswer, count] of Object.entries(wrongAnswerCounts)) {
      clusters[topic].push({
        wrongAnswer,
        count,
        misconceptionTags,
      });
    }
  }

  return clusters;
}

type RoundAnalysis = {
  round: number;
  understandingScores: Record<string, number>;
  weakTopics: string[];
};

function computeDelta(
  rounds: RoundAnalysis[]
): Record<string, number> {
  if (rounds.length < 2) return {};

  const delta: Record<string, number> = {};
  const sortedRounds = [...rounds].sort((a, b) => a.round - b.round);

  // 모든 토픽 수집
  const allTopics = new Set<string>();
  for (const r of sortedRounds) {
    for (const topic of Object.keys(r.understandingScores)) {
      allTopics.add(topic);
    }
  }

  // 마지막 라운드와 첫 번째 라운드 비교
  const first = sortedRounds[0];
  const last = sortedRounds[sortedRounds.length - 1];

  for (const topic of allTopics) {
    const firstScore = first.understandingScores[topic] ?? 0;
    const lastScore = last.understandingScores[topic] ?? 0;
    delta[topic] = lastScore - firstScore;
  }

  return delta;
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("academy_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "teacher"].includes(profile.role)) {
    return NextResponse.json(
      { error: "강사 권한이 필요합니다" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = analysisGetQuerySchema.safeParse({
    sessionId: searchParams.get("sessionId"),
    round: searchParams.get("round") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { sessionId, round } = parsed.data;

  // 세션 소유권 확인
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, teacher_id, academy_id")
    .eq("id", sessionId)
    .eq("academy_id", profile.academy_id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "세션을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  // responses + quizzes JOIN 조회 (round 필터 옵션 적용)
  let query = supabase
    .from("responses")
    .select(
      `
      id,
      quiz_id,
      student_id,
      selected_answer,
      is_correct,
      round_number,
      quizzes (
        topic_tag,
        misconception_tags,
        correct_answer
      )
    `
    )
    .eq("session_id", sessionId);

  if (round !== undefined) {
    query = query.eq("round_number", round);
  }

  const { data: rawResponses, error: responsesError } = await query;

  if (responsesError) {
    return NextResponse.json(
      { error: responsesError.message },
      { status: 500 }
    );
  }

  if (!rawResponses || rawResponses.length === 0) {
    return NextResponse.json(
      { error: "분석할 응답 데이터가 없습니다" },
      { status: 422 }
    );
  }

  const responses = (rawResponses as unknown as ResponseWithQuiz[]).filter(
    (r) => r.quizzes !== null && !Array.isArray(r.quizzes)
  );

  // round 지정 시: 해당 라운드만 분석
  if (round !== undefined) {
    const understandingScores = computeUnderstandingScores(responses);
    const weakTopics = extractWeakTopics(understandingScores);

    return NextResponse.json({
      data: {
        rounds: [{ round, understandingScores, weakTopics }],
        delta: {},
      },
    });
  }

  // round 미지정 시: 라운드별 분석 + 델타 계산
  const roundNumbers = [...new Set(responses.map((r) => r.round_number))].sort(
    (a, b) => a - b
  );

  const rounds: RoundAnalysis[] = roundNumbers.map((roundNum) => {
    const roundResponses = responses.filter(
      (r) => r.round_number === roundNum
    );
    const understandingScores = computeUnderstandingScores(roundResponses);
    const weakTopics = extractWeakTopics(understandingScores);
    return { round: roundNum, understandingScores, weakTopics };
  });

  const delta = computeDelta(rounds);

  return NextResponse.json({ data: { rounds, delta } });
}

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
    .select("academy_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "teacher"].includes(profile.role)) {
    return NextResponse.json(
      { error: "강사 권한이 필요합니다" },
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

  const parsed = analysisRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { sessionId } = parsed.data;

  // 세션 소유권 확인
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, teacher_id, academy_id")
    .eq("id", sessionId)
    .eq("academy_id", profile.academy_id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "세션을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  // responses + quizzes JOIN 조회
  const { data: rawResponses, error: responsesError } = await supabase
    .from("responses")
    .select(
      `
      id,
      quiz_id,
      student_id,
      selected_answer,
      is_correct,
      round_number,
      quizzes (
        topic_tag,
        misconception_tags,
        correct_answer
      )
    `
    )
    .eq("session_id", sessionId);

  if (responsesError) {
    return NextResponse.json(
      { error: responsesError.message },
      { status: 500 }
    );
  }

  if (!rawResponses || rawResponses.length === 0) {
    return NextResponse.json(
      { error: "분석할 응답 데이터가 없습니다" },
      { status: 422 }
    );
  }

  // Supabase join 결과 타입 정제 (Relationships 미정의로 unknown 캐스팅 필요)
  const responses = (rawResponses as unknown as ResponseWithQuiz[]).filter(
    (r) => r.quizzes !== null && !Array.isArray(r.quizzes)
  );

  const understandingScores = computeUnderstandingScores(responses);
  const weakTopics = extractWeakTopics(understandingScores);
  const misconceptionClusters = buildMisconceptionClusters(responses);

  // analysis_results 테이블에 저장
  const { data: savedAnalysis, error: insertError } = await supabase
    .from("analysis_results")
    .insert({
      session_id: sessionId,
      analysis_type: "realtime",
      understanding_scores: understandingScores,
      weak_topics: weakTopics,
      misconception_clusters: misconceptionClusters,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      data: {
        understandingScores,
        weakTopics,
        misconceptionClusters,
        analysisId: savedAnalysis.id,
        createdAt: savedAnalysis.created_at,
      },
    },
    { status: 201 }
  );
}
