"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, BookOpen, Users, Clock, ChevronRight, Zap, BarChart3, CheckCircle2, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

const STATUS_CONFIG: Record<string, { label: string; variant: "draft" | "active" | "completed" }> = {
  draft: { label: "대기중", variant: "draft" },
  active: { label: "진행중", variant: "active" },
  completed: { label: "종료", variant: "completed" },
};

export default function InstructorSessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      const response = await fetch("/api/sessions");
      if (response.ok) {
        const result = await response.json();
        setSessions(result.data ?? []);
      }
      setIsLoading(false);
    }
    loadSessions();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const activeSessions = sessions.filter((s) => s.status === "active");
  const draftSessions = sessions.filter((s) => s.status === "draft");
  const completedSessions = sessions.filter((s) => s.status === "completed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">수업 세션</h1>
          <p className="text-muted-foreground mt-1">AI 퀴즈와 실시간 이해도 분석으로 수업을 관리하세요</p>
        </div>
        <Button asChild size="lg">
          <Link href="/instructor/sessions/new">
            <Plus className="h-4 w-4 mr-2" />
            새 세션 만들기
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Activity, label: "진행중", value: activeSessions.length, gradient: "from-blue-500 to-cyan-500", bg: "bg-blue-50", ring: activeSessions.length > 0 },
          { icon: Clock, label: "대기중", value: draftSessions.length, gradient: "from-slate-400 to-slate-500", bg: "bg-slate-50" },
          { icon: CheckCircle2, label: "완료", value: completedSessions.length, gradient: "from-green-500 to-emerald-500", bg: "bg-green-50" },
          { icon: Zap, label: "전체 세션", value: sessions.length, gradient: "from-violet-500 to-purple-600", bg: "bg-violet-50" },
        ].map((stat) => (
          <Card key={stat.label} className={stat.ring ? "ring-2 ring-blue-200" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-sm`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Session List */}
      {sessions.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            icon={<BookOpen className="h-12 w-12" />}
            title="아직 세션이 없습니다"
            description="새 세션을 만들어 수업을 시작하세요"
            action={
              <Button asChild size="lg">
                <Link href="/instructor/sessions/new">
                  <Plus className="h-4 w-4 mr-2" />
                  첫 세션 만들기
                </Link>
              </Button>
            }
          />

          {/* 빠른 시작 가이드 */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Argos 빠른 시작 가이드
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { step: "1", title: "세션 만들기", desc: "수업 제목, 과목, 주제 태그를 입력합니다. 주제가 구체적일수록 AI 퀴즈 품질이 올라갑니다." },
                  { step: "2", title: "수업 시작하기", desc: "\"수업 시작\" 버튼을 누르면 참여 코드가 발급됩니다. 프로젝터에 코드를 보여주세요." },
                  { step: "3", title: "AI 퀴즈 발송", desc: "대시보드에서 \"AI 퀴즈 생성\"을 클릭하면 수업 주제에 맞는 코딩 퀴즈가 자동 생성됩니다." },
                  { step: "4", title: "실시간 분석", desc: "수강생 응답이 들어오면 히트맵이 실시간 업데이트됩니다. AI 코칭도 자동으로 제공됩니다." },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active first, then draft, then completed */}
          {[...activeSessions, ...draftSessions, ...completedSessions].map((session) => {
            const config = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.draft;
            const topics = Array.isArray(session.topics) ? session.topics : [];

            const statusGradient =
              session.status === "active" ? "from-blue-500 to-cyan-500" :
              session.status === "completed" ? "from-green-500 to-emerald-500" :
              "from-slate-300 to-slate-400";

            return (
              <Link key={session.id} href={`/instructor/sessions/${session.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex">
                    <div className={`w-1.5 bg-gradient-to-b ${statusGradient} shrink-0`} />
                    <CardContent className="p-4 flex items-center gap-4 flex-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{session.title}</h3>
                          <Badge variant={config.variant}>{config.label}</Badge>
                          {session.status === "active" && (
                            <span className="flex items-center gap-1 text-xs text-blue-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{session.subject}</span>
                          {session.course_category && (
                            <>
                              <span className="text-border">|</span>
                              <span>{session.course_category}</span>
                            </>
                          )}
                          <span className="text-border">|</span>
                          <span>{new Date(session.created_at).toLocaleDateString("ko-KR")}</span>
                        </div>
                        {topics.length > 0 && (
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {(topics as string[]).slice(0, 5).map((topic) => (
                              <Badge key={topic} variant="secondary" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                            {topics.length > 5 && (
                              <Badge variant="secondary" className="text-xs">
                                +{topics.length - 5}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
                    </CardContent>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
