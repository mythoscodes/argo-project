"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  Zap,
  Brain,
  BarChart3,
  Users,
  Play,
  Square,
  RefreshCw,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeResponses } from "@/hooks/use-realtime";
import type { Database } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UnderstandingHeatmap } from "@/components/heatmap/understanding-heatmap";
import { DeltaChart } from "@/components/charts/delta-chart";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];

interface ParticipantInfo {
  id: string;
  display_name: string;
  joined_at: string;
}

interface CoachingSuggestion {
  coaching_suggestion: string | null;
  understanding_scores: Record<string, number> | null;
  weak_topics: string[] | null;
  created_at: string;
}

export default function SessionDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [coaching, setCoaching] = useState<CoachingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [analysisData, setAnalysisData] = useState<{
    understanding_scores: Record<string, number>;
    weak_topics: string[];
    delta?: Record<string, number>;
  } | null>(null);

  const { responses, isConnected } = useRealtimeResponses(sessionId);

  // Load session data
  const loadSession = useCallback(async () => {
    const [sessionRes, quizRes] = await Promise.all([
      fetch(`/api/sessions/${sessionId}`),
      fetch(`/api/quizzes?sessionId=${sessionId}`),
    ]);

    if (sessionRes.ok) {
      const result = await sessionRes.json();
      setSession(result.data);
    }
    if (quizRes.ok) {
      const result = await quizRes.json();
      const quizData = result.data ?? [];
      setQuizzes(quizData);
      if (quizData.length > 0) {
        const maxRound = Math.max(...quizData.map((q: QuizRow) => q.round_number));
        setCurrentRound(maxRound);
      }
    }
    setIsLoading(false);
  }, [sessionId]);

  // Load participants via Supabase
  useEffect(() => {
    const supabase = createClient();

    async function loadParticipants() {
      const { data } = await supabase
        .from("session_participants")
        .select("id, student_id, joined_at")
        .eq("session_id", sessionId);

      if (data) {
        const studentIds = data.map((p) => p.student_id);
        if (studentIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", studentIds);

          const participantList: ParticipantInfo[] = data.map((p) => ({
            id: p.student_id,
            display_name: profiles?.find((pr) => pr.id === p.student_id)?.display_name ?? "익명",
            joined_at: p.joined_at,
          }));
          setParticipants(participantList);
        }
      }
    }

    loadParticipants();

    // Subscribe to new participants
    const channel = supabase
      .channel(`participants:${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "session_participants",
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        loadParticipants();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [sessionId]);

  useEffect(() => { loadSession(); }, [loadSession]);

  // Copy join code
  async function handleCopyCode() {
    if (session?.join_code) {
      await navigator.clipboard.writeText(session.join_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }

  // Session status transitions
  async function handleStatusChange(newStatus: string) {
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (response.ok) {
      const result = await response.json();
      setSession(result.data);
    }
  }

  // Generate quiz
  async function handleGenerateQuiz() {
    if (!session) return;
    setIsGeneratingQuiz(true);
    const topics = Array.isArray(session.topics) ? session.topics as string[] : [];
    try {
      const response = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          subject: session.subject,
          topic: topics.join(", ") || session.subject,
          count: 3,
          difficulty: "mixed",
        }),
      });
      if (response.ok) {
        await loadSession();
      }
    } finally {
      setIsGeneratingQuiz(false);
    }
  }

  // Run analysis
  async function handleAnalyze() {
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/ai/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (response.ok) {
        const result = await response.json();
        setAnalysisData(result.data);
      }

      // Also fetch coaching
      const coachingRes = await fetch("/api/ai/coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (coachingRes.ok) {
        const coachResult = await coachingRes.json();
        setCoaching((prev) => [coachResult.data, ...prev]);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  // Re-quiz (next round)
  async function handleReQuiz() {
    if (!session) return;
    setCurrentRound((prev) => prev + 1);
    setIsGeneratingQuiz(true);
    const topics = Array.isArray(session.topics) ? session.topics as string[] : [];
    try {
      const response = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          subject: session.subject,
          topic: topics.join(", ") || session.subject,
          count: 3,
          difficulty: "mixed",
        }),
      });
      if (response.ok) {
        await loadSession();
      }
    } finally {
      setIsGeneratingQuiz(false);
    }
  }

  if (isLoading || !session) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const currentQuizzes = quizzes.filter((q) => q.round_number === currentRound);
  const currentResponses = responses.filter((r) => r.round_number === currentRound);
  const totalExpected = participants.length * currentQuizzes.length;
  const responseRate = totalExpected > 0 ? Math.round((currentResponses.length / totalExpected) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/instructor"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            목록
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{session.title}</h1>
            <Badge variant={session.status === "active" ? "active" : session.status === "completed" ? "completed" : "draft"}>
              {session.status === "active" ? "진행중" : session.status === "completed" ? "종료" : "대기중"}
            </Badge>
            {isConnected && session.status === "active" && (
              <span className="flex items-center gap-1 text-xs text-success">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                LIVE
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {session.status === "draft" && (
            <Button onClick={() => handleStatusChange("active")} variant="success" size="lg">
              <Play className="h-4 w-4 mr-1" />
              수업 시작
            </Button>
          )}
          {session.status === "active" && (
            <Button onClick={() => handleStatusChange("completed")} variant="destructive">
              <Square className="h-4 w-4 mr-1" />
              수업 종료
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={`/instructor/sessions/${sessionId}/reports`}>
              <FileText className="h-4 w-4 mr-1" />
              리포트
            </Link>
          </Button>
        </div>
      </div>

      {/* Join Code + Participants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Join Code */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">참여 코드</CardTitle>
          </CardHeader>
          <CardContent>
            {session.join_code ? (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-mono font-bold tracking-widest text-primary">
                  {session.join_code}
                </span>
                <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                  {codeCopied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">수업을 시작하면 코드가 발급됩니다</p>
            )}
          </CardContent>
        </Card>

        {/* Participants */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              참여자
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{participants.length}<span className="text-base font-normal text-muted-foreground">명</span></p>
            <div className="flex flex-wrap gap-1 mt-2">
              {participants.slice(0, 8).map((p) => (
                <Badge key={p.id} variant="secondary" className="text-xs">
                  {session.anonymous_mode ? "익명" : p.display_name}
                </Badge>
              ))}
              {participants.length > 8 && (
                <Badge variant="secondary" className="text-xs">+{participants.length - 8}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Response Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              응답 현황 (라운드 {currentRound})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{responseRate}%</p>
            <Progress value={responseRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {currentResponses.length} / {totalExpected} 응답
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Panels - Tabs for mobile, Grid for desktop */}
      <Tabs defaultValue="quiz" className="lg:hidden">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quiz"><Zap className="h-4 w-4" /></TabsTrigger>
          <TabsTrigger value="heatmap"><BarChart3 className="h-4 w-4" /></TabsTrigger>
          <TabsTrigger value="coaching"><Brain className="h-4 w-4" /></TabsTrigger>
          <TabsTrigger value="delta"><RefreshCw className="h-4 w-4" /></TabsTrigger>
        </TabsList>
        <TabsContent value="quiz">
          <QuizPanel
            quizzes={currentQuizzes}
            isGenerating={isGeneratingQuiz}
            onGenerate={handleGenerateQuiz}
            sessionActive={session.status === "active"}
            currentRound={currentRound}
          />
        </TabsContent>
        <TabsContent value="heatmap">
          <HeatmapPanel
            responses={currentResponses}
            quizzes={currentQuizzes}
            participants={participants}
            analysisData={analysisData}
            isAnalyzing={isAnalyzing}
            onAnalyze={handleAnalyze}
          />
        </TabsContent>
        <TabsContent value="coaching">
          <CoachingPanel coaching={coaching} isAnalyzing={isAnalyzing} />
        </TabsContent>
        <TabsContent value="delta">
          <DeltaPanel
            sessionId={sessionId}
            currentRound={currentRound}
            onReQuiz={handleReQuiz}
            isGenerating={isGeneratingQuiz}
          />
        </TabsContent>
      </Tabs>

      {/* Desktop grid */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-4">
        <QuizPanel
          quizzes={currentQuizzes}
          isGenerating={isGeneratingQuiz}
          onGenerate={handleGenerateQuiz}
          sessionActive={session.status === "active"}
          currentRound={currentRound}
        />
        <HeatmapPanel
          responses={currentResponses}
          quizzes={currentQuizzes}
          participants={participants}
          analysisData={analysisData}
          isAnalyzing={isAnalyzing}
          onAnalyze={handleAnalyze}
        />
        <CoachingPanel coaching={coaching} isAnalyzing={isAnalyzing} />
        <DeltaPanel
          sessionId={sessionId}
          currentRound={currentRound}
          onReQuiz={handleReQuiz}
          isGenerating={isGeneratingQuiz}
        />
      </div>
    </div>
  );
}

/* --- Sub-panels --- */

function QuizPanel({
  quizzes,
  isGenerating,
  onGenerate,
  sessionActive,
  currentRound,
}: {
  quizzes: QuizRow[];
  isGenerating: boolean;
  onGenerate: () => void;
  sessionActive: boolean;
  currentRound: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            AI 퀴즈 (라운드 {currentRound})
          </CardTitle>
          {sessionActive && (
            <Button onClick={onGenerate} disabled={isGenerating} size="sm">
              {isGenerating ? (
                <><Spinner size="sm" className="mr-1" /> 생성중...</>
              ) : (
                <><Zap className="h-4 w-4 mr-1" /> 퀴즈 생성</>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {quizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            AI 퀴즈를 생성하여 수강생에게 발송하세요
          </p>
        ) : (
          quizzes.map((quiz, idx) => (
            <div key={quiz.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {idx + 1}
                </span>
                <p className="text-sm font-medium leading-snug">{quiz.question_text}</p>
              </div>
              {quiz.code_snippet && (
                <pre className="rounded-md bg-muted p-2 text-xs font-mono overflow-x-auto">
                  {quiz.code_snippet}
                </pre>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                {(quiz.options as string[]).map((opt, optIdx) => (
                  <div
                    key={optIdx}
                    className={`rounded-md px-2 py-1.5 text-xs border ${
                      opt === quiz.correct_answer
                        ? "border-success/50 bg-success/5 text-success font-medium"
                        : "border-border"
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}. {opt}
                  </div>
                ))}
              </div>
              <Badge variant="secondary" className="text-xs">{quiz.topic_tag}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function HeatmapPanel({
  responses,
  quizzes,
  participants,
  analysisData,
  isAnalyzing,
  onAnalyze,
}: {
  responses: Database["public"]["Tables"]["responses"]["Row"][];
  quizzes: QuizRow[];
  participants: ParticipantInfo[];
  analysisData: { understanding_scores: Record<string, number>; weak_topics: string[] } | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            이해도 히트맵
          </CardTitle>
          <Button onClick={onAnalyze} disabled={isAnalyzing} size="sm" variant="outline">
            {isAnalyzing ? (
              <><Spinner size="sm" className="mr-1" /> 분석중...</>
            ) : (
              <><Brain className="h-4 w-4 mr-1" /> 분석하기</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <UnderstandingHeatmap
          responses={responses}
          quizzes={quizzes}
          participants={participants}
        />
        {analysisData && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">토픽별 이해도</h4>
            <div className="space-y-1.5">
              {Object.entries(analysisData.understanding_scores).map(([topic, score]) => (
                <div key={topic} className="flex items-center gap-2">
                  <span className="text-xs w-24 truncate">{topic}</span>
                  <Progress
                    value={score}
                    className={`flex-1 ${score < 60 ? "[&>div]:bg-destructive" : score < 80 ? "[&>div]:bg-warning" : "[&>div]:bg-success"}`}
                  />
                  <span className="text-xs font-mono w-10 text-right">{score}%</span>
                </div>
              ))}
            </div>
            {analysisData.weak_topics.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-xs text-destructive font-medium">약점:</span>
                {analysisData.weak_topics.map((t) => (
                  <Badge key={t} variant="destructive" className="text-xs">{t}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CoachingPanel({
  coaching,
  isAnalyzing,
}: {
  coaching: CoachingSuggestion[];
  isAnalyzing: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          AI 코칭
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isAnalyzing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Spinner size="sm" />
            AI가 분석 중입니다...
          </div>
        )}
        {coaching.length === 0 && !isAnalyzing ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            이해도 분석을 실행하면 AI 코칭 메시지가 표시됩니다
          </p>
        ) : (
          <Accordion type="single" collapsible defaultValue="item-0">
            {coaching.map((item, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`}>
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-500 shrink-0" />
                    <span className="truncate">
                      {item.coaching_suggestion?.slice(0, 60) ?? "코칭 제안"}...
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="rounded-lg bg-purple-50 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {item.coaching_suggestion}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

function DeltaPanel({
  sessionId,
  currentRound,
  onReQuiz,
  isGenerating,
}: {
  sessionId: string;
  currentRound: number;
  onReQuiz: () => void;
  isGenerating: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-green-500" />
            피드백 루프
          </CardTitle>
          {currentRound >= 1 && (
            <Button onClick={onReQuiz} disabled={isGenerating} size="sm" variant="outline">
              {isGenerating ? (
                <><Spinner size="sm" className="mr-1" /> 생성중...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-1" /> 재퀴즈</>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {currentRound <= 1 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            1라운드 후 재퀴즈를 보내면 이해도 변화(델타)를 확인할 수 있습니다
          </p>
        ) : (
          <DeltaChart sessionId={sessionId} currentRound={currentRound} />
        )}
      </CardContent>
    </Card>
  );
}
