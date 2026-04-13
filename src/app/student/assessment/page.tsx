"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Brain, CheckCircle2, Target, TrendingUp,
  BookOpen, Lightbulb, ArrowRight, BarChart3, Sparkles, Clock,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, LineChart, Line,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  { value: "Spring/Java", icon: "Sp" },
  { value: "React/JavaScript", icon: "Re" },
  { value: "Python", icon: "Py" },
  { value: "정보보안", icon: "Sc" },
  { value: "네트워크", icon: "Nw" },
  { value: "데이터분석", icon: "Da" },
  { value: "AI/ML", icon: "AI" },
  { value: "클라우드", icon: "Cl" },
];

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string; order: number }> = {
  beginner: { label: "입문", color: "text-red-600", bg: "bg-red-100", order: 1 },
  elementary: { label: "초급", color: "text-orange-600", bg: "bg-orange-100", order: 2 },
  intermediate: { label: "중급", color: "text-yellow-600", bg: "bg-yellow-100", order: 3 },
  advanced: { label: "고급", color: "text-blue-600", bg: "bg-blue-100", order: 4 },
  expert: { label: "전문가", color: "text-purple-600", bg: "bg-purple-100", order: 5 },
};

interface Question {
  question: string;
  topic: string;
  difficulty: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface SkillScore { topic: string; score: number; level: string; feedback: string }
interface AssessmentResult {
  skills: SkillScore[];
  overallLevel: string;
  summary: string;
  recommendations: string[];
  recommendedCourses: string[];
  subject?: string;
}

interface SubjectSummary {
  overall_level: string | null;
  skill_scores: SkillScore[] | null;
  assessed_at: string;
}

type Phase = "dashboard" | "quiz" | "result";

export default function AssessmentPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("dashboard");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Array<{ topic: string; question: string; correct: boolean; difficulty: string }>>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [subjectSummary, setSubjectSummary] = useState<Record<string, SubjectSummary>>({});
  const [assessmentHistory, setAssessmentHistory] = useState<Array<{ subject: string | null; overall_level: string | null; created_at: string }>>([]);

  // 기존 결과 로드
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/ai/assessment");
      if (res.ok) {
        const data = await res.json();
        setSubjectSummary(data.data?.subjectSummary ?? {});
        setAssessmentHistory(data.data?.assessments ?? []);
      }
    }
    load();
  }, []);

  async function handleStartAssessment(subject: string) {
    setSelectedSubject(subject);
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          subject,
          interests: [subject],
          experienceLevel: profile?.experience_level ?? "beginner",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.data.questions);
        setPhase("quiz");
        setCurrentIdx(0);
        setAnswers([]);
        setSelectedAnswer(null);
        setShowExplanation(false);
      } else {
        const err = await res.json().catch(() => null);
        toast(err?.error ?? "진단 문제 생성에 실패했습니다.", "error");
      }
    } finally {
      setIsGenerating(false);
    }
  }

  function handleAnswer() {
    const q = questions[currentIdx];
    if (!q || !selectedAnswer) return;
    setAnswers((prev) => [...prev, { topic: q.topic, question: q.question, correct: selectedAnswer === q.correct_answer, difficulty: q.difficulty }]);
    setShowExplanation(true);
  }

  async function handleNext() {
    setSelectedAnswer(null);
    setShowExplanation(false);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setIsAnalyzing(true);
      setPhase("result");
      try {
        const res = await fetch("/api/ai/assessment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "analyze", answers, subject: selectedSubject, trigger: "periodic" }),
        });
        if (res.ok) {
          const data = await res.json();
          setResult({ ...data.data, subject: selectedSubject ?? undefined });
        } else {
          toast("역량 분석에 실패했습니다.", "error");
        }
      } finally {
        setIsAnalyzing(false);
      }
    }
  }

  function handleBackToDashboard() {
    setPhase("dashboard");
    setResult(null);
    setQuestions([]);
    setAnswers([]);
    // 결과 새로고침
    fetch("/api/ai/assessment").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setSubjectSummary(data.data?.subjectSummary ?? {});
        setAssessmentHistory(data.data?.assessments ?? []);
      }
    });
  }

  if (authLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  /* ══════ DASHBOARD ══════ */
  if (phase === "dashboard") {
    const assessedSubjects = Object.entries(subjectSummary).filter(([, v]) => v.overall_level);
    const hasAny = assessedSubjects.length > 0;

    return (
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <Link href="/student" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 내 수업
        </Link>

        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">AI 역량 진단</h1>
          <p className="text-muted-foreground text-sm">과목별로 나의 실력을 측정하고 성장을 추적하세요</p>
        </div>

        {/* 과목별 현재 수준 요약 */}
        {hasAny && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                나의 과목별 수준
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assessedSubjects.map(([subj, data]) => {
                const lv = LEVEL_CONFIG[data.overall_level ?? "beginner"];
                const scores = Array.isArray(data.skill_scores) ? data.skill_scores as SkillScore[] : [];
                const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, sk) => s + sk.score, 0) / scores.length) : 0;

                return (
                  <div key={subj} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{subj}</span>
                        <Badge className={cn("text-xs", lv.bg, lv.color)}>{lv.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{avgScore}점</span>
                        <Button size="sm" variant="outline" onClick={() => handleStartAssessment(subj)} disabled={isGenerating}>
                          재진단
                        </Button>
                      </div>
                    </div>
                    <Progress value={avgScore} className={cn("h-2",
                      avgScore >= 80 ? "[&>div]:bg-green-500" :
                      avgScore >= 60 ? "[&>div]:bg-yellow-500" :
                      avgScore >= 40 ? "[&>div]:bg-orange-500" : "[&>div]:bg-red-500"
                    )} />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      마지막 진단: {new Date(data.assessed_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* 과목 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5 text-violet-500" />
              과목 선택하여 진단하기
            </CardTitle>
            <CardDescription>진단할 과목을 선택하세요. AI가 수준에 맞는 문제를 출제합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SUBJECTS.map((subj) => {
                const existing = subjectSummary[subj.value];
                const lv = existing?.overall_level ? LEVEL_CONFIG[existing.overall_level] : null;

                return (
                  <button
                    key={subj.value}
                    onClick={() => handleStartAssessment(subj.value)}
                    disabled={isGenerating}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all hover:shadow-md hover:border-primary/50 cursor-pointer",
                      isGenerating && selectedSubject === subj.value ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                      {subj.icon}
                    </div>
                    <span className="text-xs font-medium text-center">{subj.value}</span>
                    {lv && <Badge className={cn("text-[10px]", lv.bg, lv.color)}>{lv.label}</Badge>}
                    {isGenerating && selectedSubject === subj.value && <Spinner size="sm" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 진단 이력 */}
        {assessmentHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                진단 이력
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assessmentHistory.slice(0, 8).map((a, idx) => {
                  const lv = LEVEL_CONFIG[a.overall_level ?? "beginner"];
                  return (
                    <div key={idx} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{a.subject ?? "종합"}</Badge>
                        <Badge className={cn("text-xs", lv.bg, lv.color)}>{lv.label}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 가이드 */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              정기 진단 가이드
            </h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />2주에 한 번 같은 과목을 재진단하면 성장을 확인할 수 있습니다</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />난이도가 자동 조절되어 정확한 수준을 측정합니다</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />멘토와 강사가 결과를 보고 맞춤 수업을 준비합니다</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ══════ QUIZ ══════ */
  if (phase === "quiz") {
    const q = questions[currentIdx];
    const isObjective = q.options.length > 0;

    return (
      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Badge>{selectedSubject}</Badge>
              <Badge variant="outline" className={cn("text-xs",
                q.difficulty === "easy" ? "text-green-600 border-green-200" :
                q.difficulty === "medium" ? "text-yellow-600 border-yellow-200" :
                "text-red-600 border-red-200"
              )}>
                {q.difficulty === "easy" ? "기초" : q.difficulty === "medium" ? "중급" : "심화"}
              </Badge>
            </div>
            <span className="text-muted-foreground">{currentIdx + 1} / {questions.length}</span>
          </div>
          <Progress value={((currentIdx + 1) / questions.length) * 100} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base leading-relaxed">{q.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isObjective ? (
              <div className="space-y-2">
                {q.options.map((opt, idx) => (
                  <button key={idx} type="button" disabled={showExplanation} onClick={() => setSelectedAnswer(opt)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                      showExplanation
                        ? opt === q.correct_answer ? "border-green-400 bg-green-50" : opt === selectedAnswer ? "border-red-400 bg-red-50" : "border-border opacity-50"
                        : selectedAnswer === opt ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 cursor-pointer"
                    )}>
                    <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0",
                      selectedAnswer === opt || (showExplanation && opt === q.correct_answer) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>{String.fromCharCode(65 + idx)}</span>
                    <span className="text-sm">{opt}</span>
                  </button>
                ))}
              </div>
            ) : (
              <textarea className="w-full rounded-lg border p-3 text-sm min-h-[80px]" placeholder="답변 입력..."
                value={selectedAnswer ?? ""} onChange={(e) => setSelectedAnswer(e.target.value)} disabled={showExplanation} />
            )}

            {showExplanation && (
              <div className="rounded-lg bg-blue-50 p-3 text-sm">
                <p className="font-semibold text-blue-700">해설</p>
                <p className="text-blue-800 mt-1">{q.explanation}</p>
              </div>
            )}

            {!showExplanation ? (
              <Button onClick={handleAnswer} disabled={!selectedAnswer} className="w-full" size="lg">답변 제출</Button>
            ) : (
              <Button onClick={handleNext} className="w-full" size="lg">
                {currentIdx < questions.length - 1 ? <>다음 문제 <ArrowRight className="h-4 w-4 ml-1" /></> : <>결과 확인 <BarChart3 className="h-4 w-4 ml-1" /></>}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ══════ RESULT ══════ */
  if (phase === "result") {
    if (isAnalyzing || !result) {
      return (
        <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
          <div className="text-center space-y-3"><Spinner size="lg" /><p className="text-muted-foreground">AI가 역량을 분석하고 있습니다...</p></div>
        </div>
      );
    }

    const lv = LEVEL_CONFIG[result.overallLevel] ?? LEVEL_CONFIG.beginner;
    const correctCount = answers.filter((a) => a.correct).length;
    const radarData = result.skills.map((s) => ({ topic: s.topic, score: s.score, fullMark: 100 }));
    const barColors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

    return (
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6 pb-20">
        {/* Header */}
        <Card className="overflow-hidden">
          <div className="py-8 px-4 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white text-center">
            <Badge className="mb-3 bg-white/20 text-white border-white/30">{selectedSubject}</Badge>
            <Brain className="h-10 w-10 mx-auto mb-2 opacity-90" />
            <h2 className="text-3xl font-bold">{correctCount} / {answers.length}</h2>
            <p className="opacity-80 mt-1">정답률 {Math.round((correctCount / answers.length) * 100)}%</p>
            <Badge className={cn("mt-3 text-sm px-4 py-1.5", lv.bg, lv.color)}>{lv.label} 수준</Badge>
          </div>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{result.summary}</p>
          </CardContent>
        </Card>

        {/* Radar */}
        {radarData.length >= 3 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-5 w-5 text-primary" />역량 레이더</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid /><PolarAngleAxis dataKey="topic" tick={{ fontSize: 11 }} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Skill Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">토픽별 피드백</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {result.skills.map((skill, idx) => {
              const skillLv = LEVEL_CONFIG[skill.level] ?? LEVEL_CONFIG.beginner;
              return (
                <div key={skill.topic} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-sm">{skill.topic}</span>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", skillLv.bg, skillLv.color)}>{skillLv.label}</Badge>
                      <span className="text-sm font-bold">{skill.score}%</span>
                    </div>
                  </div>
                  <Progress value={skill.score} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">{skill.feedback}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-5 w-5 text-yellow-500" />학습 추천</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {result.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-sm">{rec}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {result.recommendedCourses.length > 0 && (
          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-5 w-5 text-purple-500" />추천 강의</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.recommendedCourses.map((c, i) => <Badge key={i} variant="secondary" className="text-sm px-3 py-1">{c}</Badge>)}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button onClick={handleBackToDashboard} variant="outline" className="flex-1">대시보드로</Button>
          <Button onClick={() => selectedSubject && handleStartAssessment(selectedSubject)} className="flex-1" disabled={isGenerating}>
            {isGenerating ? <><Spinner size="sm" className="mr-1" /> 준비 중...</> : "다시 진단하기"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
