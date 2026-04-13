"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Trophy,
  ArrowRight,
  LogIn,
  BarChart3,
  Lightbulb,
  HelpCircle,
  Zap,
  Brain,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SessionWithScore {
  id: string;
  title: string;
  subject: string;
  course_category: string | null;
  status: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  // 프론트에서 계산
  totalQuizzes: number;
  correctCount: number;
  accuracy: number;
  responded: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "active" | "completed" | "draft" }> = {
  active: { label: "진행중", variant: "active" },
  completed: { label: "종료", variant: "completed" },
  draft: { label: "대기", variant: "draft" },
};

export default function StudentDashboardPage() {
  const [sessions, setSessions] = useState<SessionWithScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // 1) 내가 참여한 세션 목록
      const sessionRes = await fetch("/api/sessions");
      if (!sessionRes.ok) {
        setIsLoading(false);
        return;
      }
      const sessionResult = await sessionRes.json();
      const rawSessions: Array<{
        id: string;
        title: string;
        subject: string;
        course_category: string | null;
        status: string;
        created_at: string;
        started_at: string | null;
        ended_at: string | null;
      }> = sessionResult.data ?? [];

      if (rawSessions.length === 0) {
        setSessions([]);
        setIsLoading(false);
        return;
      }

      // 2) 각 세션별 내 응답 데이터를 병렬로 가져옴
      const enriched = await Promise.all(
        rawSessions.map(async (session) => {
          const [respRes, quizRes] = await Promise.all([
            fetch(`/api/responses?sessionId=${session.id}`),
            fetch(`/api/quizzes?sessionId=${session.id}`),
          ]);

          let totalQuizzes = 0;
          let correctCount = 0;
          let responded = false;

          if (quizRes.ok) {
            const quizResult = await quizRes.json();
            totalQuizzes = (quizResult.data ?? []).length;
          }

          if (respRes.ok) {
            const respResult = await respRes.json();
            const responses: Array<{ is_correct: boolean }> = respResult.data ?? [];
            correctCount = responses.filter((r) => r.is_correct).length;
            responded = responses.length > 0;
          }

          const accuracy = totalQuizzes > 0 ? Math.round((correctCount / totalQuizzes) * 100) : 0;

          return { ...session, totalQuizzes, correctCount, accuracy, responded };
        })
      );

      setSessions(enriched);
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const activeSessions = sessions.filter((s) => s.status === "active");
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const respondedSessions = sessions.filter((s) => s.responded);
  const overallAccuracy =
    respondedSessions.length > 0
      ? Math.round(respondedSessions.reduce((sum, s) => sum + s.accuracy, 0) / respondedSessions.length)
      : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">내 수업</h1>
          <p className="text-muted-foreground text-sm mt-1">참여한 수업과 성적을 확인하세요</p>
        </div>
        <Button asChild>
          <Link href="/student/join">
            <LogIn className="h-4 w-4 mr-2" />
            수업 참여
          </Link>
        </Button>
      </div>

      {/* Stats */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{sessions.length}</p>
              <p className="text-xs text-muted-foreground">참여 수업</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className={cn("h-5 w-5 mx-auto mb-1", overallAccuracy >= 70 ? "text-yellow-500" : "text-slate-400")} />
              <p className="text-2xl font-bold">{overallAccuracy}%</p>
              <p className="text-xs text-muted-foreground">평균 정답률</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{completedSessions.length}</p>
              <p className="text-xs text-muted-foreground">완료 수업</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            진행중인 수업
          </h2>
          {activeSessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}

      {/* Completed Sessions */}
      {completedSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            종료된 수업
          </h2>
          {completedSessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}

      {/* AI 역량 진단 바로가기 */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shrink-0">
            <Brain className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">AI 역량 진단</h3>
            <p className="text-xs text-muted-foreground mt-0.5">나의 IT 실력을 AI가 진단하고 맞춤 학습 경로를 추천합니다</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/student/assessment">
              시작하기 <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* 학습 성취 요약 (데이터 있을 때) */}
      {respondedSessions.length > 0 && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              나의 학습 요약
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">총 풀이 문제</p>
                <p className="text-lg font-bold">
                  {sessions.reduce((sum, s) => sum + (s.responded ? s.totalQuizzes : 0), 0)}문제
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">총 정답</p>
                <p className="text-lg font-bold text-green-600">
                  {sessions.reduce((sum, s) => sum + s.correctCount, 0)}개
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">최고 점수 수업</p>
                <p className="text-sm font-medium truncate">
                  {respondedSessions.sort((a, b) => b.accuracy - a.accuracy)[0]?.title ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">최고 정답률</p>
                <p className="text-lg font-bold text-blue-600">
                  {Math.max(...respondedSessions.map((s) => s.accuracy))}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 학습 팁 카드 */}
      {sessions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              학습 팁
            </h3>
            <div className="space-y-2.5 text-sm text-muted-foreground">
              {overallAccuracy < 60 && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-2.5">
                  <span className="text-red-500 shrink-0 mt-0.5">!</span>
                  <p className="text-red-700">평균 정답률이 60% 미만입니다. 수업 후 <strong>학습 리포트</strong>에서 약점 개념을 확인하고 복습하세요.</p>
                </div>
              )}
              {overallAccuracy >= 60 && overallAccuracy < 80 && (
                <div className="flex items-start gap-2 rounded-lg bg-yellow-50 p-2.5">
                  <span className="text-yellow-500 shrink-0 mt-0.5">i</span>
                  <p className="text-yellow-700">좋은 성적입니다! 틀린 문제의 <strong>코드 스니펫</strong>을 다시 분석해보면 이해도가 크게 올라갑니다.</p>
                </div>
              )}
              {overallAccuracy >= 80 && (
                <div className="flex items-start gap-2 rounded-lg bg-green-50 p-2.5">
                  <span className="text-green-500 shrink-0 mt-0.5">*</span>
                  <p className="text-green-700">우수한 성적입니다! 이 페이스를 유지하면 취업 면접에서도 좋은 결과가 있을 거예요.</p>
                </div>
              )}
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p>퀴즈 응답 후 <strong>결과 화면</strong>에서 정답과 오답을 바로 확인하세요</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p>수업이 종료되면 <strong>AI 학습 리포트</strong>에서 개인 맞춤 추천을 받을 수 있습니다</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty — 풍부한 온보딩 */}
      {sessions.length === 0 && (
        <div className="space-y-6">
          <EmptyState
            icon={<BookOpen className="h-12 w-12" />}
            title="아직 참여한 수업이 없습니다"
            description="강사가 알려준 참여 코드를 입력하여 수업에 참여하세요"
            action={
              <Button asChild size="lg">
                <Link href="/student/join">
                  <LogIn className="h-4 w-4 mr-2" />
                  수업 참여하기
                </Link>
              </Button>
            }
          />

          {/* 사용 가이드 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-500" />
                Argos 사용 가이드
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  step: "1",
                  title: "수업에 참여하세요",
                  desc: "강사가 화면에 보여주는 6자리 참여 코드를 입력하면 됩니다.",
                  icon: LogIn,
                  color: "bg-blue-100 text-blue-600",
                },
                {
                  step: "2",
                  title: "AI 퀴즈에 응답하세요",
                  desc: "수업 중 강사가 발송하는 코드 퀴즈에 답을 선택하세요. 코드 출력 예측, 버그 찾기 등 다양한 유형이 나옵니다.",
                  icon: Zap,
                  color: "bg-yellow-100 text-yellow-600",
                },
                {
                  step: "3",
                  title: "결과를 즉시 확인하세요",
                  desc: "제출 후 정답/오답을 바로 확인할 수 있습니다. 토픽별 정답률과 응답 시간도 분석됩니다.",
                  icon: Trophy,
                  color: "bg-green-100 text-green-600",
                },
                {
                  step: "4",
                  title: "AI 리포트를 받으세요",
                  desc: "수업 종료 후 AI가 나의 강점/약점을 분석하고 학습 경로를 추천해줍니다.",
                  icon: BookOpen,
                  color: "bg-purple-100 text-purple-600",
                },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl shrink-0", item.color)}>
                    <item.icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ── Session Card ── */
function SessionCard({ session }: { session: SessionWithScore }) {
  const config = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.draft;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold truncate">{session.title}</h3>
              <Badge variant={config.variant} className="shrink-0">{config.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {session.subject}
              {session.course_category && ` · ${session.course_category}`}
            </p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {new Date(session.created_at).toLocaleDateString("ko-KR")}
          </span>
        </div>

        {/* Score bar */}
        {session.responded ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                정답률
              </span>
              <span className={cn(
                "font-bold",
                session.accuracy >= 80 ? "text-green-600" :
                session.accuracy >= 60 ? "text-yellow-600" : "text-red-600"
              )}>
                {session.correctCount}/{session.totalQuizzes} ({session.accuracy}%)
              </span>
            </div>
            <Progress
              value={session.accuracy}
              className={cn(
                session.accuracy >= 80 ? "[&>div]:bg-green-500" :
                session.accuracy >= 60 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
              )}
            />
          </div>
        ) : session.totalQuizzes > 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            퀴즈 {session.totalQuizzes}개 — 아직 응답하지 않음
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {session.status === "active" && (
            <Button asChild size="sm" className="flex-1">
              <Link href={`/student/sessions/${session.id}`}>
                {session.responded ? "계속 응답하기" : "퀴즈 풀기"}
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          )}
          {session.responded && (
            <Button asChild size="sm" variant="outline" className={session.status === "active" ? "" : "flex-1"}>
              <Link href={`/student/sessions/${session.id}/result`}>
                <Trophy className="h-3.5 w-3.5 mr-1" />
                성적 확인
              </Link>
            </Button>
          )}
          {session.status === "completed" && (
            <Button asChild size="sm" variant="outline" className="flex-1">
              <Link href={`/student/sessions/${session.id}/report`}>
                <BookOpen className="h-3.5 w-3.5 mr-1" />
                학습 리포트
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
