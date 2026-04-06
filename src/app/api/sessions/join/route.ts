import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const joinSessionSchema = z.object({
  joinCode: z.string().length(6),
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문을 파싱할 수 없습니다." },
      { status: 400 }
    );
  }

  const parsed = joinSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "참여 코드를 확인해주세요" },
      { status: 400 }
    );
  }

  const { joinCode } = parsed.data;

  // 수강생 역할 확인
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student") {
    return NextResponse.json(
      { error: "수강생만 세션에 참여할 수 있습니다." },
      { status: 403 }
    );
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, status, title")
    .eq("join_code", joinCode.toUpperCase())
    .single();

  if (!session) {
    return NextResponse.json(
      { error: "유효하지 않은 참여 코드입니다" },
      { status: 404 }
    );
  }

  if (session.status !== "active") {
    return NextResponse.json(
      { error: "현재 진행 중인 세션이 아닙니다" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("session_participants")
    .upsert(
      { session_id: session.id, student_id: user.id },
      { onConflict: "session_id,student_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      sessionId: session.id,
      sessionTitle: session.title,
      participant: data,
    },
  });
}
