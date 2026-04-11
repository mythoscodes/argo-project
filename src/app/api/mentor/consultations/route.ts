import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";

const PostRequestSchema = z.object({
  studentId: z.string().uuid(),
  type: z.enum(["학습부진", "진로", "출결", "기타"]),
  content: z.string().min(1).max(2000),
  nextConsultationDate: z.string().date().optional(),
});

const GetQuerySchema = z.object({
  studentId: z.string().uuid(),
});

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

  if (!["owner", "teacher", "mentor"].includes(profile.role)) {
    return NextResponse.json(
      { error: "강사/원장/멘토만 접근할 수 있습니다." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const rawParams = {
    studentId: searchParams.get("studentId") ?? undefined,
  };

  const parseResult = GetQuerySchema.safeParse(rawParams);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "studentId 파라미터가 필요합니다.",
        details: parseResult.error.issues,
      },
      { status: 400 }
    );
  }

  const { studentId } = parseResult.data;

  const { data: consultations, error: fetchError } = await supabase
    .from("consultation_notes")
    .select("*")
    .eq("instructor_id", user.id)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (fetchError) {
    return NextResponse.json(
      { error: `상담 기록 조회에 실패했습니다: ${fetchError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: consultations ?? [] });
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

  if (!["owner", "teacher", "mentor"].includes(profile.role)) {
    return NextResponse.json(
      { error: "강사/원장/멘토만 접근할 수 있습니다." },
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

  const { studentId, type, content, nextConsultationDate } = parseResult.data;

  // 수강생이 같은 학원 소속인지 확인
  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", studentId)
    .single();

  if (!studentProfile || studentProfile.academy_id !== profile.academy_id) {
    return NextResponse.json(
      { error: "같은 학원의 수강생만 상담 기록을 작성할 수 있습니다." },
      { status: 403 }
    );
  }

  const { data: consultation, error: insertError } = await supabase
    .from("consultation_notes")
    .insert({
      instructor_id: user.id,
      student_id: studentId,
      academy_id: profile.academy_id,
      type,
      content,
      next_consultation_date: nextConsultationDate ?? null,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: `상담 기록 저장에 실패했습니다: ${insertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: consultation }, { status: 201 });
}
