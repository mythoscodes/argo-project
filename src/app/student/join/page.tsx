"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  Keyboard,
  Monitor,
  HelpCircle,
  CheckCircle2,
  Smartphone,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SESSION_CODE_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function StudentJoinPage() {
  const router = useRouter();
  const [code, setCode] = useState<string[]>(Array(SESSION_CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleInput(index: number, value: string) {
    if (!/^[0-9a-zA-Z]?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.toUpperCase();
    setCode(newCode);
    if (value && index < SESSION_CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (value && index === SESSION_CODE_LENGTH - 1) {
      const fullCode = newCode.join("");
      if (fullCode.length === SESSION_CODE_LENGTH) {
        handleJoin(fullCode);
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().toUpperCase().slice(0, SESSION_CODE_LENGTH);
    const newCode = Array(SESSION_CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    if (pasted.length === SESSION_CODE_LENGTH) {
      handleJoin(pasted);
    }
  }

  async function handleJoin(joinCode?: string) {
    const finalCode = joinCode ?? code.join("");
    if (finalCode.length !== SESSION_CODE_LENGTH) {
      setError("참여 코드를 모두 입력해주세요.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/sessions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: finalCode }),
      });
      if (!response.ok) {
        const result = await response.json();
        setError(result.error ?? "참여에 실패했습니다. 코드를 확인해주세요.");
        return;
      }
      const result = await response.json();
      router.push(`/student/sessions/${result.data.sessionId}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Eye className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">수업 참여</h1>
          <p className="text-muted-foreground mt-1">강사가 알려준 참여 코드를 입력하세요</p>
        </div>

        {/* 참여 방법 스텝 가이드 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { step: 1, icon: Monitor, label: "강사 화면 확인", desc: "프로젝터에 표시된 코드" },
            { step: 2, icon: Keyboard, label: "코드 입력", desc: "6자리 영숫자 입력" },
            { step: 3, icon: Smartphone, label: "퀴즈 응답", desc: "AI 퀴즈에 바로 응답" },
          ].map((s) => (
            <div key={s.step} className="text-center space-y-1.5">
              <div className={cn(
                "mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                s.step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {s.step}
              </div>
              <s.icon className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-xs font-medium">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* 코드 입력 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-center text-base">
              <Keyboard className="h-4 w-4" />
              참여 코드 입력
            </CardTitle>
            <CardDescription className="text-center">
              화면에 표시된 {SESSION_CODE_LENGTH}자리 코드를 입력하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
              {code.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInput(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="h-14 w-12 rounded-lg border-2 border-input bg-background text-center text-2xl font-mono font-bold uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium text-center mb-4">{error}</p>
            )}

            <Button
              onClick={() => handleJoin()}
              className="w-full"
              size="xl"
              disabled={isLoading || code.join("").length !== SESSION_CODE_LENGTH}
            >
              {isLoading ? "참여 중..." : "참여하기"}
              {!isLoading && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>

            {/* 팁 */}
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3">
              <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                코드를 복사했다면 입력창에 <strong>붙여넣기(Ctrl+V)</strong>하면 자동으로 입력됩니다
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 도움말 토글 */}
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-1.5 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <HelpCircle className="h-4 w-4" />
          {showHelp ? "도움말 닫기" : "코드를 못 찾겠어요"}
        </button>

        {showHelp && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-amber-600" />
                자주 묻는 질문
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">참여 코드는 어디서 확인하나요?</p>
                  <p className="text-muted-foreground mt-0.5">
                    강사가 프로젝터 또는 화면 공유로 보여주는 <strong>6자리 영숫자</strong>입니다.
                    강사 대시보드 좌측 상단에 큰 글씨로 표시됩니다.
                  </p>
                </div>

                <div>
                  <p className="font-medium">코드를 입력했는데 &ldquo;유효하지 않음&rdquo;이라고 해요</p>
                  <p className="text-muted-foreground mt-0.5">
                    수업이 아직 시작되지 않았거나 이미 종료된 경우입니다.
                    강사에게 수업 상태를 확인해달라고 요청하세요.
                  </p>
                </div>

                <div>
                  <p className="font-medium">수업 중에 화면이 꺼졌어요</p>
                  <p className="text-muted-foreground mt-0.5">
                    걱정 마세요! 같은 코드로 다시 참여하면 이전 응답이 유지됩니다.
                    수업이 끝나기 전까지 언제든 재접속 가능합니다.
                  </p>
                </div>

                <div>
                  <p className="font-medium">모바일에서도 참여할 수 있나요?</p>
                  <p className="text-muted-foreground mt-0.5">
                    네! 스마트폰, 태블릿, PC 모두 지원합니다.
                    퀴즈 응답은 모바일에 최적화되어 있습니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 하단 안내 */}
        <div className="text-center">
          <Badge variant="secondary" className="text-xs">
            Argos — AI 실시간 수업 분석 플랫폼
          </Badge>
        </div>
      </div>
    </div>
  );
}
