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
import { Badge } from "@/components/ui/badge";

const ROLE_OPTIONS = [
  { value: "teacher", label: "강사", description: "수업 세션 생성 및 AI 퀴즈 관리" },
  { value: "student", label: "수강생", description: "수업 참여 및 퀴즈 응답" },
  { value: "owner", label: "원장", description: "학원 경영 대시보드 및 수강생 관리" },
  { value: "mentor", label: "멘토", description: "수강생 이탈 위험 감지 및 상담 관리" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
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
          ...(role === "student" ? {
            experience_level: experienceLevel || undefined,
            interests: interests.length > 0 ? interests : undefined,
          } : {}),
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
          router.push("/student");
          break;
        case "owner":
          router.push("/owner");
          break;
        case "mentor":
          router.push("/mentor");
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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-background to-indigo-50 p-4 overflow-hidden">
      {/* Animated bg orbs */}
      <div className="absolute top-[-10%] right-[5%] h-[400px] w-[400px] rounded-full bg-indigo-100 opacity-40 blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-5%] left-[10%] h-[350px] w-[350px] rounded-full bg-blue-100 opacity-40 blur-[80px] animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="relative w-full max-w-md space-y-6">
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

              {/* Student: Experience + Interests */}
              {role === "student" && (
                <>
                  <div className="space-y-2">
                    <Label>경력 수준</Label>
                    <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="현재 수준 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">입문 (비전공, IT 처음)</SelectItem>
                        <SelectItem value="junior">초급 (기초 학습 완료)</SelectItem>
                        <SelectItem value="mid">중급 (실무 경험 1~3년)</SelectItem>
                        <SelectItem value="senior">고급 (실무 경험 3년+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>관심 분야 (복수 선택)</Label>
                    <div className="flex flex-wrap gap-2">
                      {["Spring/Java", "React/JS", "Python", "정보보안", "네트워크", "데이터분석", "AI/ML", "클라우드"].map((interest) => (
                        <Badge
                          key={interest}
                          variant={interests.includes(interest) ? "default" : "outline"}
                          className="cursor-pointer transition-colors"
                          onClick={() =>
                            setInterests((prev) =>
                              prev.includes(interest)
                                ? prev.filter((i) => i !== interest)
                                : [...prev, interest]
                            )
                          }
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      관심 분야를 기반으로 맞춤 수업을 추천받을 수 있습니다
                    </p>
                  </div>
                </>
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

        {/* 가입 혜택 */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {[
            { icon: "AI", label: "AI 퀴즈 & 코칭", color: "text-yellow-600 bg-yellow-50" },
            { icon: "Lv", label: "역량 진단 & 추적", color: "text-purple-600 bg-purple-50" },
            { icon: "Rp", label: "맞춤 학습 리포트", color: "text-blue-600 bg-blue-50" },
          ].map((f) => (
            <div key={f.label} className="text-center">
              <div className={`mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${f.color}`}>
                {f.icon}
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
