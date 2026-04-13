"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, TrendingUp, Brain, Download, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

interface RoundAnalysis {
  round: number;
  understandingScores: Record<string, number>;
  weakTopics: string[];
}

export default function ReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const [rounds, setRounds] = useState<RoundAnalysis[]>([]);
  const [delta, setDelta] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/ai/analysis?sessionId=${sessionId}`);
      if (response.ok) {
        const result = await response.json();
        // GET 응답: { data: { rounds: [...], delta: {} } }
        setRounds(result.data?.rounds ?? []);
        setDelta(result.data?.delta ?? {});
      }
      // 422 = 응답 데이터 없음 → 빈 상태 유지
      setIsLoading(false);
    }
    load();
  }, [sessionId]);

  async function handleGenerateReport() {
    setIsGenerating(true);
    setError(null);
    try {
      // 먼저 분석 실행
      const analysisRes = await fetch("/api/ai/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!analysisRes.ok) {
        const errResult = await analysisRes.json().catch(() => null);
        setError(errResult?.error ?? "분석에 실패했습니다.");
        return;
      }

      // 분석 완료 후 다시 조회
      const reloadRes = await fetch(`/api/ai/analysis?sessionId=${sessionId}`);
      if (reloadRes.ok) {
        const result = await reloadRes.json();
        setRounds(result.data?.rounds ?? []);
        setDelta(result.data?.delta ?? {});
      }
    } finally {
      setIsGenerating(false);
    }
  }

  // Build chart data
  const chartData = rounds.map((r) => ({
    round: `라운드 ${r.round}`,
    ...r.understandingScores,
  }));

  const allTopics = [...new Set(rounds.flatMap((r) => Object.keys(r.understandingScores)))];
  const topicColors = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/instructor/sessions/${sessionId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            대시보드로
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
              <FileText className="h-4 w-4" />
            </div>
            수업 리포트
          </h1>
        </div>
        <Button onClick={handleGenerateReport} disabled={isGenerating}>
          {isGenerating ? (
            <><Spinner size="sm" className="mr-1" /> 분석중...</>
          ) : (
            <><Download className="h-4 w-4 mr-1" /> 분석 실행</>
          )}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Trend Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              라운드별 이해도 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="round" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                {allTopics.map((topic, idx) => (
                  <Line
                    key={topic}
                    type="monotone"
                    dataKey={topic}
                    stroke={topicColors[idx % topicColors.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              {allTopics.map((topic, idx) => (
                <div key={topic} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: topicColors[idx % topicColors.length] }}
                  />
                  {topic}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delta */}
      {Object.keys(delta).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">라운드 간 변화 (Delta)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(delta).map(([topic, change]) => (
                <div key={topic} className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{topic}</p>
                  <p className={`text-xl font-bold ${
                    change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-slate-400"
                  }`}>
                    {change > 0 ? "+" : ""}{change}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Round Details */}
      {rounds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>아직 분석 데이터가 없습니다</p>
            <p className="text-sm mt-1">수업 대시보드에서 퀴즈를 발송하고 응답을 수집한 후 분석을 실행하세요</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rounds.map((round) => (
            <Card key={round.round}>
              <CardHeader>
                <CardTitle className="text-base">라운드 {round.round} 분석</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(round.understandingScores).map(([topic, score]) => (
                    <div key={topic} className="rounded-lg border p-2 text-center">
                      <p className="text-xs text-muted-foreground">{topic}</p>
                      <p className={`text-lg font-bold ${
                        score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600"
                      }`}>
                        {score}%
                      </p>
                    </div>
                  ))}
                </div>
                {round.weakTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-sm font-medium mr-1">약점 토픽:</span>
                    {round.weakTopics.map((t) => (
                      <Badge key={t} variant="destructive" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
