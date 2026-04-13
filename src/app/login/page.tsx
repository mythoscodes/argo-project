"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye, FlaskConical, GraduationCap, BookOpen, Shield, Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DEMO_ACCOUNTS = [
  { email: "owner@kit.ac.kr", name: "박원장", role: "원장", icon: Shield, desc: "학원 경영 대시보드 · 수준 분포 · 이탈 관리", color: "border-amber-200 bg-amber-50 hover:border-amber-400" },
  { email: "teacher@kit.ac.kr", name: "김강사", role: "강사", icon: GraduationCap, desc: "세션 관리 · AI 퀴즈 · 실시간 히트맵 · AI 코칭", color: "border-blue-200 bg-blue-50 hover:border-blue-400" },
  { email: "mentor@kit.ac.kr", name: "이멘토", role: "멘토", icon: Users, desc: "이탈 위험 감지 · AI 상담 브리핑 · 상담 기록", color: "border-purple-200 bg-purple-50 hover:border-purple-400" },
  { email: "student1@kit.ac.kr", name: "김민준", role: "수강생", icon: BookOpen, desc: "이탈 위험 · JPA 35% · 정답률 급락 패턴", color: "border-red-200 bg-red-50 hover:border-red-400", badge: "위험", badgeColor: "bg-red-100 text-red-700" },
  { email: "student2@kit.ac.kr", name: "이지수", role: "수강생", icon: BookOpen, desc: "React 60% · TypeScript 부족 · 정체 패턴", color: "border-yellow-200 bg-yellow-50 hover:border-yellow-400", badge: "주의", badgeColor: "bg-yellow-100 text-yellow-700" },
  { email: "student3@kit.ac.kr", name: "박서연", role: "수강생", icon: BookOpen, desc: "JPA 85% · 경력자 · 꾸준한 향상 패턴", color: "border-green-200 bg-green-50 hover:border-green-400", badge: "양호", badgeColor: "bg-green-100 text-green-700" },
];

const DEMO_PASSWORD = "test1234";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  function handleSelectDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("로그인에 실패했습니다.");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      switch (profile?.role) {
        case "teacher":
          router.push("/instructor");
          break;
        case "student":
          router.push("/student");
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

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-background to-indigo-50 p-4 overflow-hidden">
      {/* Animated bg orbs */}
      <div className="absolute top-[-10%] left-[5%] h-[400px] w-[400px] rounded-full bg-blue-100 opacity-40 blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-5%] right-[10%] h-[350px] w-[350px] rounded-full bg-indigo-100 opacity-40 blur-[80px] animate-pulse" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-[40%] right-[30%] h-[200px] w-[200px] rounded-full bg-violet-100 opacity-30 blur-[60px] animate-pulse" style={{ animationDelay: "0.8s" }} />

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

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>로그인</CardTitle>
            <CardDescription>
              이메일과 비밀번호를 입력하여 시작하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive font-medium">{error}</p>
              )}
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Mode Toggle */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setDemoMode(!demoMode)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all cursor-pointer",
              demoMode
                ? "bg-violet-100 text-violet-700 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FlaskConical className="h-4 w-4" />
            {demoMode ? "테스트 모드 ON" : "테스트 계정으로 체험하기"}
          </button>
        </div>

        {/* Demo Accounts */}
        {demoMode && (
          <Card className="border-violet-200 bg-violet-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-violet-700">
                <FlaskConical className="h-4 w-4" />
                테스트 계정 선택
              </CardTitle>
              <CardDescription>
                클릭하면 이메일이 자동 입력됩니다 (비밀번호: {DEMO_PASSWORD})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {DEMO_ACCOUNTS.map((account) => {
                const isSelected = email === account.email;
                return (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => handleSelectDemo(account.email)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-violet-400 bg-violet-100 shadow-sm ring-2 ring-violet-200"
                        : account.color
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                      isSelected ? "bg-violet-600 text-white" : "bg-white/80 text-muted-foreground"
                    )}>
                      <account.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{account.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{account.role}</Badge>
                        {account.badge && (
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", account.badgeColor)}>
                            {account.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{account.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="text-xs font-bold text-violet-600 shrink-0">선택됨</div>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-sm text-muted-foreground">
          계정이 없으신가요?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            회원가입
          </Link>
        </p>

        {/* 기능 하이라이트 */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {[
            { icon: "AI", label: "AI 퀴즈 자동생성", color: "text-yellow-600 bg-yellow-50" },
            { icon: "RT", label: "실시간 이해도 분석", color: "text-blue-600 bg-blue-50" },
            { icon: "RP", label: "AI 학습 리포트", color: "text-purple-600 bg-purple-50" },
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
