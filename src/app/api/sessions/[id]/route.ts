import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import type { Database } from "@/types/database";
import { SESSION_CODE_LENGTH } from "@/lib/constants";

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < SESSION_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

type SessionUpdate = Database["public"]["Tables"]["sessions"]["Update"];

const updateSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(100).optional(),
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
  topics: z.array(z.string()).optional(),
  status: z.enum(["draft", "active", "completed"]).optional(),
  anonymousMode: z.boolean().optional(),
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "유효하지 않은 세션 ID입니다." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isTeacher = profile && ["owner", "teacher"].includes(profile.role);

  const { data: session, error } = await supabase
    .from("sessions")
    .select("*, session_participants(student_id, joined_at)")
    .eq("id", id)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "세션을 찾을 수 없습니다" }, { status: 404 });
  }

  // 수강생에게는 join_code 미노출
  if (!isTeacher) {
    const safeSession = Object.fromEntries(
      Object.entries(session as Record<string, unknown>).filter(([key]) => key !== "join_code")
    );
    return NextResponse.json({ data: safeSession });
  }

  return NextResponse.json({ data: session });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "유효하지 않은 세션 ID입니다." }, { status: 400 });
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

  const parsed = updateSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const updateData: SessionUpdate = {};
  const { title, subject, courseCategory, topics, status, anonymousMode } =
    parsed.data;

  if (title !== undefined) updateData.title = title;
  if (subject !== undefined) updateData.subject = subject;
  if (courseCategory !== undefined) updateData.course_category = courseCategory;
  if (topics !== undefined) updateData.topics = topics as string[];
  if (anonymousMode !== undefined) updateData.anonymous_mode = anonymousMode;

  if (status !== undefined) {
    // 세션 상태 전환 검증: draft→active→completed 만 허용
    const { data: currentSession } = await supabase
      .from("sessions")
      .select("status")
      .eq("id", id)
      .eq("teacher_id", user.id)
      .single();

    if (!currentSession) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    const allowedTransitions: Record<string, string[]> = {
      draft: ["active"],
      active: ["completed"],
      completed: [],
    };

    const allowed = allowedTransitions[currentSession.status] ?? [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `${currentSession.status} → ${status} 상태 전환은 허용되지 않습니다.` },
        { status: 422 }
      );
    }

    updateData.status = status;
    if (status === "active") {
      updateData.started_at = new Date().toISOString();
      // draft → active 전환 시 join_code 최초 발급
      updateData.join_code = generateJoinCode();
    }
    if (status === "completed") updateData.ended_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("sessions")
    .update(updateData)
    .eq("id", id)
    .eq("teacher_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.code === "PGRST116" ? "세션을 찾을 수 없거나 권한이 없습니다." : error.message },
      { status: error.code === "PGRST116" ? 404 : 500 }
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "유효하지 않은 세션 ID입니다." }, { status: 400 });
  }

  // 세션 존재 + 소유권 확인
  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json(
      { error: "세션을 찾을 수 없거나 권한이 없습니다." },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", id)
    .eq("teacher_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { deleted: true } });
}
