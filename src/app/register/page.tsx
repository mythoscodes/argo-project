"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_OPTIONS = [
  { value: "teacher", label: "강사", description: "수업 세션 생성 및 AI 퀴즈 관리" },
  { value: "student", label: "수강생", description: "수업 참여 및 퀴즈 응답" },
  { value: "owner", label: "원장", description: "학원 경영 대시보드 및 수강생 관리" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!role) {
      setError("역할을 선택해주세요.");
      return;
    }

    if (role === "owner" && !academyName.trim()) {
      setError("학원명을 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName,
          role,
          ...(role === "owner" ? { academy_name: academyName } : {}),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "회원가입에 실패했습니다.");
        return;
      }

      // 가입 성공 — 자동 로그인
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        // 가입은 됐지만 자동 로그인 실패 → 로그인 페이지로
        router.push("/login");
        return;
      }

      // 역할별 리다이렉트
      switch (role) {
        case "teacher":
          router.push("/instructor");
          break;
        case "student":
          router.push("/student/join");
          break;
        case "owner":
          router.push("/owner");
          break;
        default:
          router.push("/");
      }
    } finally {
      setIsLoading(false);
    }
  }

  const selectedRoleInfo = ROLE_OPTIONS.find((r) => r.value === role);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-background to-indigo-50 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
              <Eye className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Argos</h1>
          <p className="text-muted-foreground text-sm">
            100개의 눈으로 교실을 본다
          </p>
        </div>

        {/* Register Card */}
        <Card>
          <CardHeader>
            <CardTitle>회원가입</CardTitle>
            <CardDescription>
              계정을 만들고 Argos를 시작하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">이름</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="홍길동"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@kit.ac.kr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="6자 이상"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              {/* Password Confirm */}
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
                <Input
                  id="passwordConfirm"
                  type="password"
                  placeholder="비밀번호 재입력"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label>역할 선택</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="역할을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRoleInfo && (
                  <p className="text-xs text-muted-foreground">
                    {selectedRoleInfo.description}
                  </p>
                )}
              </div>

              {/* Academy Name (owner only) */}
              {role === "owner" && (
                <div className="space-y-2">
                  <Label htmlFor="academyName">학원명</Label>
                  <Input
                    id="academyName"
                    type="text"
                    placeholder="코리아IT아카데미 부산캠퍼스"
                    value={academyName}
                    onChange={(e) => setAcademyName(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    새로운 학원이 등록됩니다
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-sm text-destructive font-medium">{error}</p>
              )}

              {/* Submit */}
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "가입 중..." : "회원가입"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Login Link */}
        <p className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
