import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import { SESSION_CODE_LENGTH } from "@/lib/constants";

const createSessionSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().min(1).max(100),
  courseCategory: z
    .enum([
      "programming",
      "security",
      "network",
      "data_science",
      "ai_development",
      "ai_software",
    ])
    .optional(),
  topics: z.array(z.string()).default([]),
  anonymousMode: z.boolean().default(true),
});

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < SESSION_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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
    .select("role, academy_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const isTeacher = ["owner", "teacher"].includes(profile.role);

  if (isTeacher) {
    // 강사/원장: 본인 세션만 (join_code 포함)
    let query = supabase
      .from("sessions")
      .select("*, session_participants(count)")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  }

  // 수강생: 참여한 세션만 (join_code 제외)
  const { data: participations } = await supabase
    .from("session_participants")
    .select("session_id")
    .eq("student_id", user.id);

  const sessionIds = (participations ?? []).map((p) => p.session_id);

  if (sessionIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  let query = supabase
    .from("sessions")
    .select("id, title, subject, course_category, status, created_at, started_at, ended_at, session_participants(count)")
    .in("id", sessionIds)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
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

  const parsed = createSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { title, subject, courseCategory, topics, anonymousMode } = parsed.data;
  const joinCode = generateJoinCode();

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      teacher_id: user.id,
      academy_id: profile.academy_id,
      title,
      subject,
      course_category: courseCategory,
      topics,
      join_code: joinCode,
      anonymous_mode: anonymousMode,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
