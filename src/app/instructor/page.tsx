"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, BookOpen, Users, Clock, ChevronRight } from "lucide-react";
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeSessions.length}</p>
              <p className="text-xs text-muted-foreground">진행중 세션</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{draftSessions.length}</p>
              <p className="text-xs text-muted-foreground">대기중 세션</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedSessions.length}</p>
              <p className="text-xs text-muted-foreground">완료 세션</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session List */}
      {sessions.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="아직 세션이 없습니다"
          description="새 세션을 만들어 수업을 시작하세요"
          action={
            <Button asChild>
              <Link href="/instructor/sessions/new">
                <Plus className="h-4 w-4 mr-2" />
                첫 세션 만들기
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {/* Active first, then draft, then completed */}
          {[...activeSessions, ...draftSessions, ...completedSessions].map((session) => {
            const config = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.draft;
            const topics = Array.isArray(session.topics) ? session.topics : [];

            return (
              <Link key={session.id} href={`/instructor/sessions/${session.id}`}>
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{session.title}</h3>
                        <Badge variant={config.variant}>{config.label}</Badge>
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
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
