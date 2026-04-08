"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Target, Lightbulb } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface ReportData {
  understanding_summary: Record<string, number> | null;
  weak_topics: string[] | null;
  recommendations: string | null;
}

export default function StudentReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/ai/report?sessionId=${sessionId}`);
      if (response.ok) {
        const result = await response.json();
        setReport(result.data ?? null);
      }
      setIsLoading(false);
    }
    load();
  }, [sessionId]);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (response.ok) {
        const result = await response.json();
        setReport(result.data ?? null);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const radarData = report?.understanding_summary
    ? Object.entries(report.understanding_summary).map(([topic, score]) => ({
        topic,
        score,
        fullMark: 100,
      }))
    : [];

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6 pb-20">
      <Link
        href={`/student/sessions/${sessionId}/result`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        결과로 돌아가기
      </Link>

      <div className="text-center">
        <BookOpen className="h-10 w-10 text-primary mx-auto mb-2" />
        <h1 className="text-2xl font-bold">학습 리포트</h1>
        <p className="text-muted-foreground text-sm">AI가 분석한 나의 이해도 리포트</p>
      </div>

      {!report ? (
        <Card className="text-center">
          <CardContent className="py-8">
            <p className="text-muted-foreground mb-4">아직 리포트가 생성되지 않았습니다</p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <><Spinner size="sm" className="mr-1" /> 생성 중...</>
              ) : (
                "AI 리포트 생성"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Radar Chart */}
          {radarData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-5 w-5 text-primary" />
                  개념별 이해도
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="topic" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      dataKey="score"
                      stroke="#2563eb"
                      fill="#2563eb"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Weak Topics */}
          {report.weak_topics && report.weak_topics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                  <Target className="h-5 w-5" />
                  취약 개념
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {report.weak_topics.map((topic) => (
                    <Badge key={topic} variant="destructive" className="text-sm px-3 py-1">
                      {topic}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  이 개념들에 대한 추가 학습을 권장합니다
                </p>
              </CardContent>
            </Card>
          )}

          {/* AI Recommendations */}
          {report.recommendations && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  AI 학습 추천
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-blue-50 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {report.recommendations}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
