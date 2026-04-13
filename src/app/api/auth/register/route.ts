import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
  display_name: z.string().min(1, "이름을 입력해주세요").max(50),
  role: z.enum(["teacher", "student", "owner", "mentor"]),
  academy_id: z.string().uuid().optional(),
  academy_name: z.string().min(1).max(100).optional(),
  experience_level: z.enum(["beginner", "junior", "mid", "senior"]).optional(),
  interests: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { email, password, display_name, role, academy_id, academy_name, experience_level, interests } = parsed.data;
  const admin = createAdminClient();

  // 1. academy_id 결정: 기존 학원 선택 또는 신규 생성 (원장)
  let resolvedAcademyId = academy_id;

  if (!resolvedAcademyId) {
    if (role === "owner" && academy_name) {
      // 원장은 새 학원을 생성
      const { data: academy, error: academyError } = await admin
        .from("academies")
        .insert({ name: academy_name })
        .select("id")
        .single();

      if (academyError || !academy) {
        return NextResponse.json(
          { error: "학원 생성에 실패했습니다." },
          { status: 500 }
        );
      }
      resolvedAcademyId = academy.id;
    } else {
      // 강사/수강생은 기본 학원이 필요 — 첫 번째 학원 사용 또는 에러
      const { data: firstAcademy } = await admin
        .from("academies")
        .select("id")
        .limit(1)
        .single();

      if (!firstAcademy) {
        return NextResponse.json(
          { error: "등록 가능한 학원이 없습니다. 원장이 먼저 가입해야 합니다." },
          { status: 400 }
        );
      }
      resolvedAcademyId = firstAcademy.id;
    }
  }

  // 2. Supabase Auth에 유저 생성
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    if (authError?.message?.includes("already")) {
      return NextResponse.json(
        { error: "이미 가입된 이메일입니다." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: authError?.message ?? "회원가입에 실패했습니다." },
      { status: 500 }
    );
  }

  // 3. profiles 레코드 삽입
  const { error: profileError } = await admin
    .from("profiles")
    .insert({
      id: authData.user.id,
      academy_id: resolvedAcademyId,
      role,
      display_name,
      email,
      experience_level: experience_level ?? null,
      interests: interests ?? [],
    });

  if (profileError) {
    // 롤백: auth 유저 삭제
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: "프로필 생성에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: { user_id: authData.user.id, role } },
    { status: 201 }
  );
}
