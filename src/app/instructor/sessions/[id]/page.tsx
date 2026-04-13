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
  Clock,
  Tag,
  AlertTriangle,
  Lightbulb,
  GraduationCap,
  Briefcase,
  Timer,
  BookOpen,
  Target,
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
import { useToast } from "@/components/ui/toast";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];

interface ParticipantInfo {
  id: string;
  display_name: string;
  joined_at: string;
  overall_level?: string | null;
  experience_level?: string | null;
}

interface CoachingData {
  insight: string;
  weakConcept: string;
  misconceptionDetail: string;
  suggestionBeginner: string;
  suggestionAdvanced: string;
  interviewTip?: string;
}

interface MisconceptionCluster {
  wrongAnswer: string;
  count: number;
  misconceptionTags: string[];
}

export default function SessionDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const { toast } = useToast();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [coaching, setCoaching] = useState<CoachingData[]>([]);
  const [misconceptionClusters, setMisconceptionClusters] = useState<Record<string, MisconceptionCluster[]>>({});
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
            .select("id, display_name, experience_level")
            .in("id", studentIds);

          // 수강생별 최신 역량 진단 수준 조회
          const levelRes = await fetch(`/api/ai/assessment?sessionId=${sessionId}`);
          const levelData: Array<{ student_id: string; overall_level: string | null }> =
            levelRes.ok ? ((await levelRes.json()).data?.students ?? []) : [];
          const levelMap = new Map(levelData.map((s) => [s.student_id, s.overall_level]));

          const participantList: ParticipantInfo[] = data.map((p) => ({
            id: p.student_id,
            display_name: profiles?.find((pr) => pr.id === p.student_id)?.display_name ?? "익명",
            joined_at: p.joined_at,
            overall_level: levelMap.get(p.student_id) ?? null,
            experience_level: profiles?.find((pr) => pr.id === p.student_id)?.experience_level ?? null,
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
    } else {
      const errResult = await response.json().catch(() => null);
      toast(errResult?.error ?? "세션 상태 변경에 실패했습니다.", "error");
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
          count: 5,
          difficulty: "mixed",
        }),
      });
      if (response.ok) {
        await loadSession();
      } else {
        const errResult = await response.json().catch(() => null);
        toast(errResult?.error ?? "AI 퀴즈 생성에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
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
        if (result.data) {
          setAnalysisData({
            understanding_scores: result.data.understandingScores ?? {},
            weak_topics: result.data.weakTopics ?? [],
            delta: result.data.delta ?? undefined,
          });
          if (result.data.misconceptionClusters) {
            setMisconceptionClusters(result.data.misconceptionClusters);
          }
        }
      } else {
        const errResult = await response.json().catch(() => null);
        const errMsg = errResult?.error ?? "분석에 실패했습니다.";
        toast(errMsg, "error");
      }

      // AI 코칭 생성
      const coachingRes = await fetch("/api/ai/coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (coachingRes.ok) {
        const coachResult = await coachingRes.json();
        const coachData = coachResult.data?.coaching;
        if (coachData) {
          setCoaching((prev) => [coachData, ...prev]);
        }
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
          count: 5,
          difficulty: "mixed",
        }),
      });
      if (response.ok) {
        await loadSession();
      } else {
        const errResult = await response.json().catch(() => null);
        toast(errResult?.error ?? "재퀴즈 생성에 실패했습니다.", "error");
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
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{session.subject}</span>
            {session.course_category && (
              <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />{session.course_category}</span>
            )}
            {session.started_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(session.started_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                {session.ended_at && ` ~ ${new Date(session.ended_at).toLocaleString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {session.status === "draft" && (
            <Button
              onClick={() => {
                if (confirm("수업을 시작하시겠습니까? 참여 코드가 발급되고 수강생이 입장할 수 있습니다.")) {
                  handleStatusChange("active");
                }
              }}
              variant="success"
              size="lg"
            >
              <Play className="h-4 w-4 mr-1" />
              수업 시작
            </Button>
          )}
          {session.status === "active" && (
            <Button
              onClick={() => {
                if (confirm("수업을 종료하시겠습니까? 종료 후에는 퀴즈 발송 및 응답 수집이 중단됩니다.")) {
                  handleStatusChange("completed");
                }
              }}
              variant="destructive"
            >
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

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Join Code */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">참여 코드</CardTitle>
          </CardHeader>
          <CardContent>
            {session.join_code ? (
              <div className="flex items-center gap-3">
                <span data-testid="join-code" className="text-3xl font-mono font-bold tracking-widest text-primary">
                  {session.join_code}
                </span>
                <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                  {codeCopied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <p data-testid="no-join-code-message" className="text-muted-foreground text-sm">수업을 시작하면 코드가 발급됩니다</p>
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
              {participants.slice(0, 8).map((p) => {
                const lvLabel = p.overall_level === "expert" ? "전문" : p.overall_level === "advanced" ? "고급" : p.overall_level === "intermediate" ? "중급" : p.overall_level === "elementary" ? "초급" : p.overall_level === "beginner" ? "입문" : null;
                return (
                  <Badge key={p.id} variant="secondary" className="text-xs gap-1">
                    {session.anonymous_mode ? "익명" : p.display_name}
                    {lvLabel && <span className="text-[9px] opacity-70 border-l pl-1 ml-0.5">{lvLabel}</span>}
                  </Badge>
                );
              })}
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

        {/* Total Quizzes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 퀴즈
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{quizzes.length}<span className="text-base font-normal text-muted-foreground">개</span></p>
            <p className="text-xs text-muted-foreground mt-1">
              {currentRound} 라운드 진행
            </p>
          </CardContent>
        </Card>

        {/* Avg Response Time */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Timer className="h-3.5 w-3.5" />
              평균 응답시간
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const timesMs = responses.filter((r) => r.response_time_ms).map((r) => r.response_time_ms!);
              const avgMs = timesMs.length > 0 ? timesMs.reduce((s, t) => s + t, 0) / timesMs.length : 0;
              const avgSec = (avgMs / 1000).toFixed(1);
              return (
                <>
                  <p className="text-3xl font-bold">{avgMs > 0 ? avgSec : "-"}<span className="text-base font-normal text-muted-foreground">초</span></p>
                  <p className="text-xs text-muted-foreground mt-1">{timesMs.length}개 응답 기준</p>
                </>
              );
            })()}
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
          <CoachingPanel coaching={coaching} isAnalyzing={isAnalyzing} misconceptionClusters={misconceptionClusters} />
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
        <CoachingPanel coaching={coaching} isAnalyzing={isAnalyzing} misconceptionClusters={misconceptionClusters} />
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-xs">{quiz.topic_tag}</Badge>
                {quiz.question_type && (
                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                    {quiz.question_type === "output" ? "출력 예측" : quiz.question_type === "bug" ? "버그 찾기" : quiz.question_type === "fill" ? "빈칸 채우기" : quiz.question_type}
                  </Badge>
                )}
                {quiz.misconception_tags && Array.isArray(quiz.misconception_tags) && (quiz.misconception_tags as string[]).length > 0 && (
                  (quiz.misconception_tags as string[]).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] text-orange-500 border-orange-200">{tag}</Badge>
                  ))
                )}
              </div>
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
        {analysisData && analysisData.understanding_scores && (
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
            {analysisData.weak_topics && analysisData.weak_topics.length > 0 && (
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
  misconceptionClusters,
}: {
  coaching: CoachingData[];
  isAnalyzing: boolean;
  misconceptionClusters: Record<string, MisconceptionCluster[]>;
}) {
  const hasMisconceptions = Object.keys(misconceptionClusters).length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          AI 코칭
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
        {isAnalyzing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size="sm" />
            AI가 수업을 분석하고 있습니다...
          </div>
        )}

        {coaching.length === 0 && !isAnalyzing ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            이해도 분석을 실행하면 AI 코칭이 표시됩니다
          </p>
        ) : (
          coaching.map((item, idx) => (
            <div key={idx} className="space-y-3">
              {/* 핵심 인사이트 */}
              <div className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 p-4 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider opacity-80">핵심 인사이트</span>
                </div>
                <p className="text-sm font-medium leading-relaxed">{item.insight}</p>
              </div>

              {/* 취약 개념 + 오개념 */}
              <div className="grid grid-cols-1 gap-2">
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                    <span className="text-xs font-semibold text-red-700">취약 개념</span>
                  </div>
                  <p className="text-sm text-red-800">{item.weakConcept}</p>
                </div>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="h-3.5 w-3.5 text-orange-600" />
                    <span className="text-xs font-semibold text-orange-700">오개념 상세</span>
                  </div>
                  <p className="text-sm text-orange-800">{item.misconceptionDetail}</p>
                </div>
              </div>

              {/* 수준별 제안 */}
              <div className="grid grid-cols-1 gap-2">
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700">비전공자 대상 제안</span>
                  </div>
                  <p className="text-sm">{item.suggestionBeginner}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Briefcase className="h-3.5 w-3.5 text-violet-600" />
                    <span className="text-xs font-semibold text-violet-700">경력자 대상 제안</span>
                  </div>
                  <p className="text-sm">{item.suggestionAdvanced}</p>
                </div>
              </div>

              {/* 면접 팁 */}
              {item.interviewTip && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Briefcase className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">면접 팁</span>
                  </div>
                  <p className="text-sm text-emerald-800">{item.interviewTip}</p>
                </div>
              )}

              {idx < coaching.length - 1 && <hr className="border-dashed" />}
            </div>
          ))
        )}

        {/* 오개념 클러스터 시각화 */}
        {hasMisconceptions && (
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              오답 패턴 분석
            </h4>
            <div className="space-y-3">
              {Object.entries(misconceptionClusters).map(([topic, clusters]) => (
                <div key={topic} className="rounded-lg border p-3">
                  <Badge variant="secondary" className="mb-2">{topic}</Badge>
                  <div className="space-y-1.5">
                    {clusters.sort((a, b) => b.count - a.count).slice(0, 3).map((c, ci) => (
                      <div key={ci} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-[60%]">
                          &ldquo;{c.wrongAnswer}&rdquo; 선택
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 rounded-full bg-red-200 w-16">
                            <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(c.count * 20, 100)}%` }} />
                          </div>
                          <span className="font-mono font-bold text-red-600">{c.count}명</span>
                        </div>
                      </div>
                    ))}
                    {clusters[0]?.misconceptionTags?.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {clusters[0].misconceptionTags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px] text-orange-600 border-orange-200">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
