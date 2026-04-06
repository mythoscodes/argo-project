import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import type { Database } from "@/types/database";

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

  const { data, error } = await supabase
    .from("sessions")
    .select("*, session_participants(student_id, joined_at)")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: "세션을 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ data });
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
    if (status === "active") updateData.started_at = new Date().toISOString();
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
