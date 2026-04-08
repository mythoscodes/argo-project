"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SESSION_CODE_LENGTH } from "@/lib/constants";

export default function StudentJoinPage() {
  const router = useRouter();
  const [code, setCode] = useState<string[]>(Array(SESSION_CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleInput(index: number, value: string) {
    if (!/^[0-9a-zA-Z]?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.toUpperCase();
    setCode(newCode);

    // Auto-focus next
    if (value && index < SESSION_CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
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
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Eye className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">수업 참여</h1>
          <p className="text-muted-foreground mt-1">강사가 알려준 참여 코드를 입력하세요</p>
        </div>

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
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
