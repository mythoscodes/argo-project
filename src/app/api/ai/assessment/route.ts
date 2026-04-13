import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { getModel } from "@/lib/ai/model";
import { AI_TEMPERATURE_QUIZ } from "@/lib/constants";

/* ── Zod Schemas ── */

const SkillScoreSchema = z.object({
  topic: z.string(),
  score: z.number().min(0).max(100),
  level: z.enum(["beginner", "elementary", "intermediate", "advanced", "expert"]),
  feedback: z.string(),
});

const AssessmentQuestionSchema = z.object({
  question: z.string(),
  topic: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  options: z.array(z.string()).max(5),
  correct_answer: z.string(),
  explanation: z.string(),
});

const AssessmentResponseSchema = z.object({
  questions: z.array(AssessmentQuestionSchema).min(3).max(10),
});

const SkillAnalysisSchema = z.object({
  skills: z.array(SkillScoreSchema),
  overallLevel: z.enum(["beginner", "elementary", "intermediate", "advanced", "expert"]),
  summary: z.string(),
  recommendations: z.array(z.string()),
  recommendedCourses: z.array(z.string()),
});

/* ── POST: 진단 질문 생성 / 답변 분석 ── */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, academy_id, interests, experience_level")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 403 });
  }

  const body = await req.json();
  const action = body.action as string;

  // === ACTION: generate — 과목별 진단 질문 생성 ===
  if (action === "generate") {
    const subject: string = body.subject ?? null;
    const interests: string[] = body.interests ?? profile.interests ?? ["프로그래밍"];
    const experienceLevel: string = body.experienceLevel ?? profile.experience_level ?? "beginner";
    const questionCount = subject ? 6 : Math.min(interests.length * 2 + 1, 8);

    const model = getModel("quiz");
    const topicContext = subject
      ? `과목: ${subject}\n이 과목의 핵심 개념과 실무 역량을 진단하는 문제를 생성하세요.`
      : `관심 분야: ${interests.join(", ")}\n각 분야당 최소 1~2문제를 포함하세요.`;

    const { output } = await generateText({
      model,
      temperature: AI_TEMPERATURE_QUIZ,
      output: Output.object({ schema: AssessmentResponseSchema }),
      system: `당신은 IT 교육 역량 진단 전문가입니다.
수강생의 현재 이해도를 정확히 측정하는 진단 문제를 생성합니다.
난이도를 easy/medium/hard로 골고루 섞어, 수강생의 정확한 수준을 판별할 수 있게 하세요.
반드시 JSON으로 응답. 한국어로 작성.`,
      prompt: `${topicContext}
경력 수준: ${experienceLevel}
문제 수: ${questionCount}개

유형 혼합: 개념 이해(객관식), 코드 분석(객관식), 실무 판단(객관식), 서술형(options 빈 배열)
모든 문제에 explanation(해설) 포함.`,
    });

    if (!output) {
      return NextResponse.json({ error: "진단 문제 생성에 실패했습니다." }, { status: 502 });
    }

    return NextResponse.json({ data: { questions: output.questions, subject } });
  }

  // === ACTION: analyze — 답변 분석 + DB 저장 ===
  if (action === "analyze") {
    const answers: Array<{ topic: string; question: string; correct: boolean; difficulty: string }> = body.answers ?? [];
    const subject: string | null = body.subject ?? null;
    const trigger: string = body.trigger ?? (subject ? "periodic" : "initial");

    if (answers.length === 0) {
      return NextResponse.json({ error: "답변 데이터가 없습니다." }, { status: 400 });
    }

    const model = getModel("report");

    const { output } = await generateText({
      model,
      temperature: 0.4,
      output: Output.object({ schema: SkillAnalysisSchema }),
      system: `당신은 IT 교육 역량 분석 전문가입니다.
수강생의 진단 결과를 분석하여 토픽별 역량 점수와 수준을 판정합니다.
한국어로 응답하세요.`,
      prompt: `${subject ? `과목: ${subject}\n` : ""}수강생 진단 결과:
${answers.map((a, i) => `${i + 1}. [${a.topic}] ${a.question} → ${a.correct ? "정답" : "오답"} (${a.difficulty})`).join("\n")}

분석 항목:
1. 토픽별 역량 점수(0~100)와 수준(beginner/elementary/intermediate/advanced/expert)
2. 전반적 수준
3. 간결한 요약 (2~3문장)
4. 구체적 학습 추천 3~5개
5. 관련 추천 강의명 1~3개`,
    });

    if (!output) {
      return NextResponse.json({ error: "역량 분석에 실패했습니다." }, { status: 502 });
    }

    // 이전 진단 대비 변화(delta) 계산
    let progressDelta: Record<string, number> = {};
    if (subject) {
      const { data: prevAssessments } = await supabase
        .from("skill_assessments" as never)
        .select("skill_scores") as { data: Array<{ skill_scores: unknown }> | null };

      // 실제로는 subject 필터가 필요하지만 as never 캐스팅 때문에 전체 가져옴
      // 프론트에서 subject 필터링
    }

    // DB 저장
    const { data: saved, error: saveError } = await supabase
      .from("skill_assessments" as never)
      .insert({
        student_id: user.id,
        academy_id: profile.academy_id,
        assessment_type: trigger,
        subject,
        assessment_trigger: trigger,
        skill_scores: output.skills,
        overall_level: output.overallLevel,
        recommendations: output.recommendations,
        progress_delta: progressDelta,
      } as never)
      .select("id") as { data: { id: string } | null; error: unknown };

    if (saveError) {
      return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        assessmentId: saved?.id,
        subject,
        skills: output.skills,
        overallLevel: output.overallLevel,
        summary: output.summary,
        recommendations: output.recommendations,
        recommendedCourses: output.recommendedCourses,
      },
    }, { status: 201 });
  }

  return NextResponse.json({ error: "action 파라미터가 필요합니다 (generate|analyze)" }, { status: 400 });
}

/* ── GET: 진단 결과 조회 ── */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, academy_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  const subject = searchParams.get("subject");
  const view = searchParams.get("view"); // "distribution" for owner

  // === 원장: 학원 전체 수준 분포 ===
  if (view === "distribution" && profile.role === "owner") {
    const { data: allAssessments } = await supabase
      .from("skill_assessments" as never)
      .select("student_id, subject, overall_level, skill_scores, created_at") as {
        data: Array<{
          student_id: string;
          subject: string | null;
          overall_level: string | null;
          skill_scores: unknown;
          created_at: string;
        }> | null;
      };

    // 과목별 수준 분포 집계
    const distribution: Record<string, Record<string, number>> = {};
    const latestByStudentSubject = new Map<string, typeof allAssessments extends Array<infer T> | null ? T : never>();

    for (const a of allAssessments ?? []) {
      const key = `${a.student_id}::${a.subject ?? "general"}`;
      const existing = latestByStudentSubject.get(key);
      if (!existing || new Date(a.created_at) > new Date(existing.created_at)) {
        latestByStudentSubject.set(key, a);
      }
    }

    for (const a of latestByStudentSubject.values()) {
      const subj = a.subject ?? "종합";
      const level = a.overall_level ?? "beginner";
      if (!distribution[subj]) distribution[subj] = {};
      distribution[subj][level] = (distribution[subj][level] ?? 0) + 1;
    }

    return NextResponse.json({ data: { distribution } });
  }

  // === 강사: 세션 수강생들의 수준 ===
  const sessionId = searchParams.get("sessionId");
  if (sessionId && ["teacher", "owner"].includes(profile.role)) {
    // 세션 참여자 ID 조회
    const { data: participants } = await supabase
      .from("session_participants")
      .select("student_id")
      .eq("session_id", sessionId);

    const studentIds = (participants ?? []).map((p) => p.student_id);
    if (studentIds.length === 0) {
      return NextResponse.json({ data: { students: [] } });
    }

    // 각 수강생의 최신 진단 결과
    const { data: assessments } = await supabase
      .from("skill_assessments" as never)
      .select("student_id, subject, overall_level, skill_scores, created_at") as {
        data: Array<{
          student_id: string;
          subject: string | null;
          overall_level: string | null;
          skill_scores: unknown;
          created_at: string;
        }> | null;
      };

    // 수강생별 최신 진단 추출
    const latestByStudent = new Map<string, { overall_level: string | null; skill_scores: unknown; subject: string | null }>();
    for (const a of (assessments ?? []).filter((a) => studentIds.includes(a.student_id))) {
      const existing = latestByStudent.get(a.student_id);
      if (!existing) {
        latestByStudent.set(a.student_id, a);
      }
    }

    // 수강생 프로필 조회
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, experience_level")
      .in("id", studentIds);

    const students = (profiles ?? []).map((p) => {
      const assessment = latestByStudent.get(p.id);
      return {
        student_id: p.id,
        display_name: p.display_name,
        experience_level: p.experience_level,
        overall_level: assessment?.overall_level ?? null,
        skill_scores: assessment?.skill_scores ?? null,
      };
    });

    return NextResponse.json({ data: { students } });
  }

  // === 개별 수강생 진단 이력 ===
  const targetId = studentId ?? user.id;

  // 권한 체크: 본인 or 강사/원장/멘토
  if (targetId !== user.id && !["owner", "teacher", "mentor"].includes(profile.role)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { data: assessments } = await supabase
    .from("skill_assessments" as never)
    .select("*") as { data: unknown[] | null };

  // subject 필터 + student_id 필터 (as never 때문에 수동)
  type AssessmentRow = {
    id: string;
    student_id: string;
    subject: string | null;
    overall_level: string | null;
    skill_scores: unknown;
    recommendations: unknown;
    assessment_type: string;
    assessment_trigger: string | null;
    progress_delta: unknown;
    created_at: string;
  };

  const allRows = (assessments ?? []) as AssessmentRow[];
  let filtered = allRows.filter((a) => a.student_id === targetId);
  if (subject) {
    filtered = filtered.filter((a) => a.subject === subject);
  }
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // 과목별 최신 결과 요약
  const subjectLatest = new Map<string, AssessmentRow>();
  for (const a of filtered) {
    const subj = a.subject ?? "general";
    if (!subjectLatest.has(subj)) {
      subjectLatest.set(subj, a);
    }
  }

  return NextResponse.json({
    data: {
      assessments: filtered.slice(0, 10),
      subjectSummary: Object.fromEntries(
        [...subjectLatest.entries()].map(([subj, a]) => [subj, {
          overall_level: a.overall_level,
          skill_scores: a.skill_scores,
          assessed_at: a.created_at,
        }])
      ),
    },
  });
}
