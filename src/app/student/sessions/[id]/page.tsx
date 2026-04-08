"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Code2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];
type ResponseRow = Database["public"]["Tables"]["responses"]["Row"];

interface QuizWithAnswer extends QuizRow {
  myResponse?: ResponseRow;
}

export default function StudentQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizWithAnswer[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState<number>(0);
  const [sessionStatus, setSessionStatus] = useState<string>("active");

  // Load quizzes and existing responses
  const loadQuizzes = useCallback(async () => {
    const [quizRes, responseRes] = await Promise.all([
      fetch(`/api/quizzes?sessionId=${sessionId}`),
      fetch(`/api/responses?sessionId=${sessionId}`),
    ]);

    const quizData: QuizRow[] = quizRes.ok ? (await quizRes.json()).data ?? [] : [];
    const responseData: ResponseRow[] = responseRes.ok ? (await responseRes.json()).data ?? [] : [];

    const enriched: QuizWithAnswer[] = quizData.map((quiz) => ({
      ...quiz,
      myResponse: responseData.find((r) => r.quiz_id === quiz.id),
    }));

    setQuizzes(enriched);

    // Find first unanswered quiz
    const firstUnanswered = enriched.findIndex((q) => !q.myResponse);
    setCurrentQuizIndex(firstUnanswered >= 0 ? firstUnanswered : enriched.length - 1);
    setStartTime(Date.now());
    setIsLoading(false);
  }, [sessionId]);

  useEffect(() => { loadQuizzes(); }, [loadQuizzes]);

  // Subscribe to new quizzes
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`quizzes:${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "quizzes",
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        loadQuizzes();
      })
      .subscribe();

    // Check session status
    const statusChannel = supabase
      .channel(`session_status:${sessionId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "sessions",
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        const newStatus = (payload.new as { status: string }).status;
        setSessionStatus(newStatus);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      statusChannel.unsubscribe();
    };
  }, [sessionId, loadQuizzes]);

  async function handleSubmit() {
    const quiz = quizzes[currentQuizIndex];
    if (!quiz || !selectedAnswer) return;

    setIsSubmitting(true);
    const responseTimeMs = Date.now() - startTime;

    try {
      const response = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          sessionId,
          selectedAnswer,
          responseTimeMs,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update local state
        setQuizzes((prev) =>
          prev.map((q) =>
            q.id === quiz.id ? { ...q, myResponse: result.data } : q
          )
        );

        // Move to next quiz or show result
        setSelectedAnswer(null);
        if (currentQuizIndex < quizzes.length - 1) {
          setCurrentQuizIndex(currentQuizIndex + 1);
          setStartTime(Date.now());
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (sessionStatus === "completed") {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="py-12">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">수업이 종료되었습니다</h2>
            <p className="text-muted-foreground mb-6">학습 리포트를 확인해보세요</p>
            <Button onClick={() => router.push(`/student/sessions/${sessionId}/result`)}>
              결과 확인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="py-12">
            <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-bold mb-2">대기 중</h2>
            <p className="text-muted-foreground">강사가 퀴즈를 준비하고 있습니다...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuiz = quizzes[currentQuizIndex];
  const isAnswered = !!currentQuiz?.myResponse;
  const allAnswered = quizzes.every((q) => q.myResponse);
  const answeredCount = quizzes.filter((q) => q.myResponse).length;
  const options = currentQuiz ? (currentQuiz.options as string[]) : [];

  if (allAnswered) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="py-12">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">모든 퀴즈 완료!</h2>
            <p className="text-muted-foreground mb-6">
              {answeredCount}개 문제를 모두 풀었습니다
            </p>
            <div className="space-y-2">
              <Button onClick={() => router.push(`/student/sessions/${sessionId}/result`)} className="w-full">
                결과 확인하기
              </Button>
              <p className="text-xs text-muted-foreground">
                다음 라운드 퀴즈가 오면 자동으로 표시됩니다
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        {/* Progress */}
        <div className="flex items-center justify-between text-sm">
          <Badge variant="secondary">라운드 {currentQuiz.round_number}</Badge>
          <span className="text-muted-foreground">
            {currentQuizIndex + 1} / {quizzes.length}
          </span>
        </div>

        {/* Quiz Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                {currentQuizIndex + 1}
              </span>
              <CardTitle className="text-base leading-relaxed">
                {currentQuiz.question_text}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Code Snippet */}
            {currentQuiz.code_snippet && (
              <div className="rounded-lg bg-slate-900 p-4 overflow-x-auto">
                <div className="flex items-center gap-2 mb-2">
                  <Code2 className="h-4 w-4 text-slate-400" />
                  <span className="text-xs text-slate-400 uppercase">
                    {currentQuiz.code_language ?? "code"}
                  </span>
                </div>
                <pre className="text-sm text-slate-100 font-mono whitespace-pre-wrap">
                  {currentQuiz.code_snippet}
                </pre>
              </div>
            )}

            {/* Options */}
            <div className="space-y-2">
              {options.map((option, idx) => {
                const label = String.fromCharCode(65 + idx);
                const isSelected = selectedAnswer === option;
                const isCorrectAfterAnswer = isAnswered && option === currentQuiz.myResponse?.selected_answer;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => setSelectedAnswer(option)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all active:scale-[0.98]",
                      isAnswered
                        ? isCorrectAfterAnswer
                          ? "border-primary bg-primary/5"
                          : "border-border opacity-60"
                        : isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/30 hover:bg-accent/50 cursor-pointer"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0",
                        isSelected || isCorrectAfterAnswer
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {label}
                    </span>
                    <span className="text-sm font-medium">{option}</span>
                  </button>
                );
              })}
            </div>

            {/* Submit */}
            {!isAnswered && (
              <Button
                onClick={handleSubmit}
                disabled={!selectedAnswer || isSubmitting}
                className="w-full"
                size="xl"
              >
                {isSubmitting ? (
                  <><Spinner size="sm" className="mr-2" /> 제출 중...</>
                ) : (
                  <><Send className="h-5 w-5 mr-2" /> 제출</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Topic */}
        <div className="flex justify-center">
          <Badge variant="secondary">{currentQuiz.topic_tag}</Badge>
        </div>
      </div>
    </div>
  );
}
