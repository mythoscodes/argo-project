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

  // 평균 응답 시간
  const timesMs = results.filter((r) => r.response_time_ms).map((r) => r.response_time_ms!);
  const avgTimeSec = timesMs.length > 0 ? (timesMs.reduce((s, t) => s + t, 0) / timesMs.length / 1000).toFixed(1) : null;
  const fastestSec = timesMs.length > 0 ? (Math.min(...timesMs) / 1000).toFixed(1) : null;

  // 토픽별 정답률
  const topicMap = new Map<string, { correct: number; total: number }>();
  for (const r of results) {
    const existing = topicMap.get(r.topic_tag) ?? { correct: 0, total: 0 };
    topicMap.set(r.topic_tag, {
      correct: existing.correct + (r.is_correct ? 1 : 0),
      total: existing.total + 1,
    });
  }
  const topicScores = [...topicMap.entries()].map(([topic, stats]) => ({
    topic,
    accuracy: Math.round((stats.correct / stats.total) * 100),
    correct: stats.correct,
    total: stats.total,
  }));

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6 pb-20">
      {/* Score Summary */}
      <Card className="overflow-hidden text-center">
        <div className={cn(
          "py-8 px-4",
          scorePercent >= 80
            ? "bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 text-white"
            : scorePercent >= 60
              ? "bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 text-white"
              : "bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 text-white"
        )}>
          <Trophy className="h-14 w-14 mx-auto mb-3 opacity-90" />
          <h2 className="text-4xl font-extrabold">
            {correctCount} / {totalCount}
          </h2>
          <p className="opacity-80 mt-1 text-lg">정답률 {scorePercent}%</p>
          <div className="flex justify-center gap-2 mt-3">
            <Badge className="bg-white/20 text-white border-white/30 text-sm px-4 py-1">
              {scorePercent >= 80 ? "우수" : scorePercent >= 60 ? "보통" : "복습 필요"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Stats Row */}
      {(avgTimeSec || topicScores.length > 1) && (
        <div className="grid grid-cols-2 gap-3">
          {avgTimeSec && (
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">평균 응답시간</p>
                <p className="text-xl font-bold">{avgTimeSec}<span className="text-sm font-normal text-muted-foreground">초</span></p>
              </CardContent>
            </Card>
          )}
          {fastestSec && (
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">최빠른 응답</p>
                <p className="text-xl font-bold">{fastestSec}<span className="text-sm font-normal text-muted-foreground">초</span></p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Topic Breakdown */}
      {topicScores.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">토픽별 성적</p>
            <div className="space-y-2">
              {topicScores.map((t) => (
                <div key={t.topic} className="flex items-center gap-3">
                  <span className="text-xs w-20 truncate font-medium">{t.topic}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        t.accuracy >= 80 ? "bg-green-500" : t.accuracy >= 60 ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{ width: `${t.accuracy}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-xs font-mono font-bold w-14 text-right",
                    t.accuracy >= 80 ? "text-green-600" : t.accuracy >= 60 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {t.correct}/{t.total} ({t.accuracy}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
