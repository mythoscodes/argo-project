"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, TrendingUp, Brain, Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

interface AnalysisResult {
  id: string;
  analysis_type: string;
  understanding_scores: Record<string, number> | null;
  weak_topics: string[] | null;
  coaching_suggestion: string | null;
  created_at: string;
}

export default function ReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/ai/analysis?sessionId=${sessionId}`);
      if (response.ok) {
        const result = await response.json();
        setAnalyses(Array.isArray(result.data) ? result.data : result.data ? [result.data] : []);
      }
      setIsLoading(false);
    }
    load();
  }, [sessionId]);

  async function handleGenerateReport() {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (response.ok) {
        // Reload analyses
        const reloadRes = await fetch(`/api/ai/analysis?sessionId=${sessionId}`);
        if (reloadRes.ok) {
          const result = await reloadRes.json();
          setAnalyses(Array.isArray(result.data) ? result.data : result.data ? [result.data] : []);
        }
      }
    } finally {
      setIsGenerating(false);
    }
  }

  // Build chart data from analyses
  const chartData = analyses
    .filter((a) => a.understanding_scores)
    .map((a, idx) => ({
      round: `분석 ${idx + 1}`,
      ...Object.fromEntries(
        Object.entries(a.understanding_scores!).map(([k, v]) => [k, v])
      ),
    }));

  const allTopics = [...new Set(analyses.flatMap((a) => Object.keys(a.understanding_scores ?? {})))];
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
            <FileText className="h-6 w-6 text-primary" />
            수업 리포트
          </h1>
        </div>
        <Button onClick={handleGenerateReport} disabled={isGenerating}>
          {isGenerating ? (
            <><Spinner size="sm" className="mr-1" /> 생성중...</>
          ) : (
            <><Download className="h-4 w-4 mr-1" /> AI 리포트 생성</>
          )}
        </Button>
      </div>

      {/* Trend Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              라운드별 평균 이해도 추이
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

      {/* Analysis Cards */}
      {analyses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>아직 분석 데이터가 없습니다</p>
            <p className="text-sm mt-1">수업 대시보드에서 이해도 분석을 실행하세요</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <Card key={analysis.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {analysis.analysis_type === "coaching" ? "코칭 분석" : "이해도 분석"}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {new Date(analysis.created_at).toLocaleString("ko-KR")}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.understanding_scores && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(analysis.understanding_scores).map(([topic, score]) => (
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
                )}
                {analysis.weak_topics && analysis.weak_topics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-sm font-medium mr-1">약점 토픽:</span>
                    {analysis.weak_topics.map((t) => (
                      <Badge key={t} variant="destructive" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
                {analysis.coaching_suggestion && (
                  <div className="rounded-lg bg-purple-50 p-3 text-sm leading-relaxed">
                    <p className="font-medium text-purple-700 mb-1">AI 코칭</p>
                    <p className="whitespace-pre-wrap">{analysis.coaching_suggestion}</p>
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
