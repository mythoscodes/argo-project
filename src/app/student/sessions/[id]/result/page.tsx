"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Trophy, ArrowRight, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface QuizWithResponse {
  quiz_id: string;
  question_text: string;
  code_snippet: string | null;
  code_language: string | null;
  options: string[];
  correct_answer: string;
  topic_tag: string;
  selected_answer: string;
  is_correct: boolean;
  response_time_ms: number | null;
  round_number: number;
}

export default function StudentResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const router = useRouter();
  const [results, setResults] = useState<QuizWithResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [quizRes, responseRes] = await Promise.all([
        fetch(`/api/quizzes?sessionId=${sessionId}`),
        fetch(`/api/responses?sessionId=${sessionId}`),
      ]);

      if (quizRes.ok && responseRes.ok) {
        const quizData = (await quizRes.json()).data ?? [];
        const responseData = (await responseRes.json()).data ?? [];

        const merged: QuizWithResponse[] = responseData.map((resp: { quiz_id: string; selected_answer: string; is_correct: boolean; response_time_ms: number | null; round_number: number }) => {
          const quiz = quizData.find((q: { id: string }) => q.id === resp.quiz_id);
          return {
            quiz_id: resp.quiz_id,
            question_text: quiz?.question_text ?? "",
            code_snippet: quiz?.code_snippet ?? null,
            code_language: quiz?.code_language ?? null,
            options: quiz?.options ?? [],
            correct_answer: quiz?.correct_answer ?? "",
            topic_tag: quiz?.topic_tag ?? "",
            selected_answer: resp.selected_answer,
            is_correct: resp.is_correct,
            response_time_ms: resp.response_time_ms,
            round_number: resp.round_number,
          };
        });

        setResults(merged);
      }
      setIsLoading(false);
    }
    load();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const correctCount = results.filter((r) => r.is_correct).length;
  const totalCount = results.length;
  const scorePercent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6 pb-20">
      {/* Score Summary */}
      <Card className="text-center">
        <CardContent className="py-8">
          <Trophy className={cn(
            "h-14 w-14 mx-auto mb-3",
            scorePercent >= 80 ? "text-yellow-500" : scorePercent >= 60 ? "text-blue-500" : "text-muted-foreground"
          )} />
          <h2 className="text-3xl font-bold">
            {correctCount} / {totalCount}
          </h2>
          <p className="text-muted-foreground mt-1">정답률 {scorePercent}%</p>
          <div className="flex justify-center gap-2 mt-3">
            <Badge variant={scorePercent >= 80 ? "success" : scorePercent >= 60 ? "warning" : "destructive"}>
              {scorePercent >= 80 ? "우수" : scorePercent >= 60 ? "보통" : "복습 필요"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Question Results */}
      <div className="space-y-3">
        {results.map((result, idx) => (
          <Card key={result.quiz_id}>
            <CardHeader className="pb-2">
              <div className="flex items-start gap-2">
                {result.is_correct ? (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <CardTitle className="text-sm leading-relaxed">
                    <span className="text-muted-foreground mr-1">Q{idx + 1}.</span>
                    {result.question_text}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.code_snippet && (
                <div className="rounded-lg bg-slate-900 p-3 overflow-x-auto">
                  <div className="flex items-center gap-2 mb-1">
                    <Code2 className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-400">{result.code_language ?? "code"}</span>
                  </div>
                  <pre className="text-xs text-slate-100 font-mono">{result.code_snippet}</pre>
                </div>
              )}

              <div className="space-y-1">
                {result.options.map((opt, optIdx) => {
                  const label = String.fromCharCode(65 + optIdx);
                  const isMyAnswer = opt === result.selected_answer;
                  const isCorrect = opt === result.correct_answer;

                  return (
                    <div
                      key={optIdx}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs",
                        isCorrect
                          ? "bg-green-50 text-green-700 font-medium border border-green-200"
                          : isMyAnswer && !result.is_correct
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "text-muted-foreground"
                      )}
                    >
                      <span className="font-bold">{label}.</span>
                      <span>{opt}</span>
                      {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-green-600" />}
                      {isMyAnswer && !result.is_correct && <XCircle className="h-3.5 w-3.5 ml-auto text-red-600" />}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <Badge variant="secondary" className="text-xs">{result.topic_tag}</Badge>
                {result.response_time_ms && (
                  <span>{(result.response_time_ms / 1000).toFixed(1)}초</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action */}
      <Button
        onClick={() => router.push(`/student/sessions/${sessionId}/report`)}
        className="w-full"
        size="lg"
      >
        학습 리포트 보기
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
