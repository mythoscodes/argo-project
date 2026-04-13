"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Target, Lightbulb, AlertCircle } from "lucide-react";
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
  understandingSummary: Record<string, number>;
  weakTopics: string[];
  recommendations: string;
}

/**
 * DB 레코드(snake_case JSON)에서 표시용 데이터를 추출한다.
 * understanding_summary는 AI 응답 전체가 JSON으로 저장되어 있을 수 있으므로
 * topicScores 또는 understanding_summary 자체가 Record<string,number>인 경우를 모두 처리한다.
 */
function parseDbReport(row: Record<string, unknown>): ReportData {
  // understanding_summary: AI 응답 전체를 저장한 JSON 또는 {topic: score} 형태
  const rawSummary = row.understanding_summary;
  let scores: Record<string, number> = {};

  if (rawSummary && typeof rawSummary === "object" && !Array.isArray(rawSummary)) {
    const summaryObj = rawSummary as Record<string, unknown>;
    // AI 응답 전체가 저장된 경우 topicScores 필드를 찾는다
    if (summaryObj.topicScores && typeof summaryObj.topicScores === "object") {
      scores = summaryObj.topicScores as Record<string, number>;
    } else {
      // 직접 {topic: score} 형태
      const entries = Object.entries(summaryObj).filter(
        ([, v]) => typeof v === "number"
      );
      if (entries.length > 0) {
        scores = Object.fromEntries(entries) as Record<string, number>;
      }
    }
  }

  // weak_topics: string[] 또는 JSON
  const rawWeak = row.weak_topics;
  const weakTopics: string[] = Array.isArray(rawWeak)
    ? (rawWeak as string[])
    : [];

  // recommendations: string (줄바꿈 구분) 또는 AI 응답 내부
  let recommendations = "";
  if (typeof row.recommendations === "string") {
    recommendations = row.recommendations;
  } else if (
    rawSummary &&
    typeof rawSummary === "object" &&
    !Array.isArray(rawSummary)
  ) {
    const summaryObj = rawSummary as Record<string, unknown>;
    if (Array.isArray(summaryObj.recommendations)) {
      recommendations = (summaryObj.recommendations as string[]).join("\n");
    } else if (typeof summaryObj.recommendations === "string") {
      recommendations = summaryObj.recommendations;
    }
  }

  return { understandingSummary: scores, weakTopics, recommendations };
}

export default function StudentReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/ai/report?sessionId=${sessionId}`);
      if (response.ok) {
        const result = await response.json();
        // GET 응답: { data: { reports: [...] } }
        const reports = result.data?.reports ?? [];
        if (reports.length > 0) {
          setReport(parseDbReport(reports[0]));
        }
        // 리포트가 없으면 null 유지 → "생성" 버튼 표시
      }
      setIsLoading(false);
    }
    load();
  }, [sessionId]);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const errResult = await response.json().catch(() => null);
        setError(errResult?.error ?? "리포트 생성에 실패했습니다.");
        return;
      }

      const result = await response.json();
      // POST 응답: { data: { report: { topicScores, weakTopics, ... }, reportId } }
      const aiReport = result.data?.report;
      if (aiReport) {
        const topicScores: Record<string, number> =
          aiReport.topicScores ?? aiReport.understanding_summary ?? {};
        const weakTopics: string[] =
          aiReport.weakTopics ?? aiReport.weak_topics ?? [];
        const recommendations: string = Array.isArray(aiReport.recommendations)
          ? aiReport.recommendations.join("\n")
          : aiReport.recommendations ?? "";

        setReport({
          understandingSummary: topicScores,
          weakTopics,
          recommendations,
        });
      } else {
        // fallback: DB 레코드에서 다시 로드
        const reloadRes = await fetch(`/api/ai/report?sessionId=${sessionId}`);
        if (reloadRes.ok) {
          const reloadResult = await reloadRes.json();
          const reports = reloadResult.data?.reports ?? [];
          if (reports.length > 0) {
            setReport(parseDbReport(reports[0]));
          }
        }
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

  const radarData = report?.understandingSummary
    ? Object.entries(report.understandingSummary)
        .filter(([, score]) => typeof score === "number")
        .map(([topic, score]) => ({
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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 mb-3">
          <BookOpen className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold">학습 리포트</h1>
        <p className="text-muted-foreground text-sm mt-1">AI가 분석한 나의 이해도 리포트</p>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">
                퀴즈 응답이 있어야 리포트를 생성할 수 있습니다
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
          {report.weakTopics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                  <Target className="h-5 w-5" />
                  취약 개념
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {report.weakTopics.map((topic) => (
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

          {/* No data fallback */}
          {radarData.length === 0 && report.weakTopics.length === 0 && !report.recommendations && (
            <Card className="text-center">
              <CardContent className="py-8">
                <p className="text-muted-foreground mb-4">리포트 데이터를 표시할 수 없습니다</p>
                <Button onClick={handleGenerate} disabled={isGenerating} variant="outline">
                  {isGenerating ? (
                    <><Spinner size="sm" className="mr-1" /> 재생성 중...</>
                  ) : (
                    "리포트 재생성"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
