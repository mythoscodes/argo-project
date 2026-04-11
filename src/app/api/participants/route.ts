/**
 * @wiki api-participants
 * @wiki feature-f3-response-collection
 *
 * POST /api/participants — 수강생이 join_code로 세션 참여 (session_participants INSERT).
 * GET  /api/participants?sessionId= — teacher/owner가 참여자 목록 조회.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const postSchema = z.object({
  joinCode: z.string().length(6),
});

const getSchema = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
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

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "joinCode는 6자리여야 합니다.", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { joinCode } = parsed.data;

  // 수강생 role 확인
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, academy_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student") {
    return NextResponse.json(
      { error: "수강생만 세션에 참여할 수 있습니다." },
      { status: 403 }
    );
  }

  // join_code로 세션 조회
  const { data: session } = await supabase
    .from("sessions")
    .select("id, status, title, academy_id")
    .eq("join_code", joinCode.toUpperCase())
    .single();

  if (!session) {
    return NextResponse.json(
      { error: "유효하지 않은 참여 코드입니다." },
      { status: 400 }
    );
  }

  if (session.status !== "active") {
    return NextResponse.json(
      { error: "현재 진행 중인 세션이 아닙니다." },
      { status: 400 }
    );
  }

  // 학원 교차 참여 방지 — 수강생의 academy_id와 세션의 academy_id 일치 확인
  if (session.academy_id !== profile.academy_id) {
    return NextResponse.json(
      { error: "유효하지 않은 참여 코드입니다." },
      { status: 400 }
    );
  }

  // 이미 참여 중인지 확인
  const { data: existing } = await supabase
    .from("session_participants")
    .select("session_id")
    .eq("session_id", session.id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "이미 참여 중인 세션입니다." },
      { status: 409 }
    );
  }

  const { data: participant, error: insertError } = await supabase
    .from("session_participants")
    .insert({ session_id: session.id, student_id: user.id })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      data: {
        session_id: session.id,
        session_title: session.title,
        participant,
      },
    },
    { status: 201 }
  );
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const parseResult = getSchema.safeParse({ sessionId: searchParams.get("sessionId") });
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "sessionId(UUID)가 필요합니다.", details: parseResult.error.issues },
      { status: 400 }
    );
  }

  const { sessionId } = parseResult.data;

  // teacher/owner만 조회 가능
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, academy_id")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "teacher"].includes(profile.role)) {
    return NextResponse.json(
      { error: "강사/원장만 참여자 목록을 조회할 수 있습니다." },
      { status: 403 }
    );
  }

  // 세션 소유권 + 학원 격리 확인
  const { data: session } = await supabase
    .from("sessions")
    .select("id, academy_id, teacher_id")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  }

  if (session.academy_id !== profile.academy_id) {
    return NextResponse.json(
      { error: "같은 학원의 세션만 조회할 수 있습니다." },
      { status: 403 }
    );
  }

  const { data: participants, error } = await supabase
    .from("session_participants")
    .select("session_id, student_id, joined_at")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: participants ?? [] });
}
