"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  GraduationCap,
  Clock,
  CheckCircle2,
  ChevronRight,
  Shield,
  TrendingDown,
  Eye,
  Target,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/* ── API 응답 타입 ── */
interface SessionStat {
  sessionId: string;
  title: string;
  subject: string;
  teacherName: string;
  status: string;
  studentCount: number;
  avgUnderstanding: number;
  createdAt: string;
}

interface AtRiskStudent {
  studentId: string;
  studentName: string;
  sessionTitle: string;
  avgScore: number;
  responseRate: number;
}

interface DashboardData {
  sessionStats: SessionStat[];
  atRiskStudents: AtRiskStudent[];
  summary: {
    totalSessions: number;
    activeSessions: number;
    totalStudents: number;
    academyAvgUnderstanding: number;
  };
}

interface MentorStudentRaw {
  student_id: string;
  display_name: string;
  risk_level: "HIGH" | "MEDIUM" | "LOW";
  risk_signals: {
    low_accuracy: boolean;
    speed_increase: boolean;
    absence: boolean;
  };
  recent_accuracy: number;
  consecutive_absences: number;
  summary: string;
}

interface MentorStudent {
  studentId: string;
  displayName: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  riskSignals: Array<{ type: string; label: string; triggered: boolean }>;
  recentAccuracy: number;
  consecutiveAbsences: number;
  summary: string;
}

function mapMentorStudent(raw: MentorStudentRaw): MentorStudent {
  return {
    studentId: raw.student_id,
    displayName: raw.display_name,
    riskLevel: raw.risk_level,
    riskSignals: [
      { type: "accuracy", label: "정답률", triggered: raw.risk_signals.low_accuracy },
      { type: "speed", label: "응답 속도", triggered: raw.risk_signals.speed_increase },
      { type: "absence", label: "출석", triggered: raw.risk_signals.absence },
    ],
    recentAccuracy: raw.recent_accuracy,
    consecutiveAbsences: raw.consecutive_absences,
    summary: raw.summary,
  };
}

const STATUS_LABEL: Record<string, string> = {
  active: "진행중",
  completed: "종료",
  draft: "대기",
};

const PIE_COLORS = ["#3b82f6", "#22c55e", "#94a3b8"];

export default function OwnerDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [mentorStudents, setMentorStudents] = useState<MentorStudent[]>([]);
  const [skillDistribution, setSkillDistribution] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [dashRes, mentorRes, skillRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/mentor/students"),
        fetch("/api/ai/assessment?view=distribution"),
      ]);

      if (dashRes.ok) {
        const result = await dashRes.json();
        setDashboard(result.data);
      }
      if (mentorRes.ok) {
        const result = await mentorRes.json();
        const rawStudents: MentorStudentRaw[] = result.data ?? [];
        setMentorStudents(rawStudents.map(mapMentorStudent));
      }
      if (skillRes.ok) {
        const result = await skillRes.json();
        setSkillDistribution(result.data?.distribution ?? {});
      }
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

  if (!dashboard) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        대시보드 데이터를 불러올 수 없습니다
      </div>
    );
  }

  const { summary, sessionStats, atRiskStudents } = dashboard;

  // 차트 데이터
  const sessionChartData = sessionStats
    .filter((s) => s.avgUnderstanding > 0)
    .slice(0, 10)
    .map((s) => ({
      name: s.title.length > 10 ? s.title.slice(0, 10) + "..." : s.title,
      정답률: s.avgUnderstanding,
      참여자: s.studentCount,
    }));

  const statusCounts = {
    active: sessionStats.filter((s) => s.status === "active").length,
    completed: sessionStats.filter((s) => s.status === "completed").length,
    draft: sessionStats.filter((s) => s.status === "draft").length,
  };
  const pieData = [
    { name: "진행중", value: statusCounts.active },
    { name: "종료", value: statusCounts.completed },
    { name: "대기", value: statusCounts.draft },
  ].filter((d) => d.value > 0);

  // 멘토 데이터 요약
  const highRisk = mentorStudents.filter((s) => s.riskLevel === "HIGH");
  const mediumRisk = mentorStudents.filter((s) => s.riskLevel === "MEDIUM");

  // 강사별 세션 수
  const teacherSessionCount = new Map<string, number>();
  for (const s of sessionStats) {
    teacherSessionCount.set(s.teacherName, (teacherSessionCount.get(s.teacherName) ?? 0) + 1);
  }
  const teacherData = [...teacherSessionCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, 세션수: count }));

  // 이탈 위험 수강생의 세션별 약점 빈도 (dashboard API 기반)
  const topicFrequency = new Map<string, number>();
  for (const student of atRiskStudents) {
    // sessionTitle을 과목 정보로 활용
    const sessionStat = sessionStats.find((s) => s.title === student.sessionTitle);
    if (sessionStat && sessionStat.avgUnderstanding < 60) {
      topicFrequency.set(sessionStat.subject, (topicFrequency.get(sessionStat.subject) ?? 0) + 1);
    }
  }
  const weakTopicData = [...topicFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([topic, count]) => ({ topic, 수강생수: count }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" />
            경영 대시보드
          </h1>
          <p className="text-muted-foreground text-sm mt-1">학원 전체 수업 품질, 수강생 현황, 이탈 위험을 한눈에 파악합니다</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={BookOpen}
          label="전체 세션"
          value={summary.totalSessions}
          color="blue"
        />
        <KpiCard
          icon={Activity}
          label="진행중"
          value={summary.activeSessions}
          color="green"
          highlight={summary.activeSessions > 0}
        />
        <KpiCard
          icon={Users}
          label="수강생"
          value={summary.totalStudents}
          suffix="명"
          color="indigo"
        />
        <KpiCard
          icon={Target}
          label="평균 정답률"
          value={summary.academyAvgUnderstanding}
          suffix="%"
          color={summary.academyAvgUnderstanding >= 70 ? "green" : summary.academyAvgUnderstanding >= 50 ? "yellow" : "red"}
        />
        <KpiCard
          icon={AlertTriangle}
          label="이탈 위험"
          value={highRisk.length}
          suffix="명"
          color={highRisk.length > 0 ? "red" : "green"}
          highlight={highRisk.length > 0}
        />
      </div>

      {/* ── Alert Banner ── */}
      {highRisk.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              이탈 위험(HIGH) 수강생 {highRisk.length}명이 감지되었습니다
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {highRisk.map((s) => s.displayName).join(", ")}
            </p>
          </div>
          <Link href="/mentor" className="text-sm font-medium text-red-700 hover:text-red-900 shrink-0 flex items-center gap-1">
            상세 보기 <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* ── Main Tabs ── */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-1.5" />
            개요
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <BookOpen className="h-4 w-4 mr-1.5" />
            세션
          </TabsTrigger>
          <TabsTrigger value="students">
            <Users className="h-4 w-4 mr-1.5" />
            수강생
          </TabsTrigger>
          <TabsTrigger value="levels">
            <GraduationCap className="h-4 w-4 mr-1.5" />
            수준 분포
          </TabsTrigger>
          <TabsTrigger value="risk">
            <Shield className="h-4 w-4 mr-1.5" />
            이탈 관리
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: 개요 ── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* 세션별 정답률 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  세션별 평균 정답률
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={sessionChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="정답률" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="아직 응답 데이터가 없습니다" />
                )}
              </CardContent>
            </Card>

            {/* 세션 상태 분포 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  세션 상태 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <div className="flex items-center justify-center gap-8">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                          {pieData.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                      {pieData.map((d, idx) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          <span className="text-sm">{d.name}</span>
                          <span className="text-sm font-bold ml-auto">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyChart message="세션이 없습니다" />
                )}
              </CardContent>
            </Card>

            {/* 약점 토픽 TOP */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  수강생이 어려워하는 토픽 TOP
                </CardTitle>
                <CardDescription>약점(정답률 60% 미만)으로 분류된 토픽</CardDescription>
              </CardHeader>
              <CardContent>
                {weakTopicData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weakTopicData} layout="vertical" margin={{ left: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="topic" width={65} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="수강생수" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="약점 토픽 데이터가 없습니다" />
                )}
              </CardContent>
            </Card>

            {/* 강사별 세션 수 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-violet-500" />
                  강사별 세션 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teacherData.length > 0 ? (
                  <div className="space-y-3">
                    {teacherData.map((t) => (
                      <div key={t.name} className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-sm font-bold shrink-0">
                          {t.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.name}</p>
                          <Progress value={(t.세션수 / Math.max(...teacherData.map((x) => x.세션수))) * 100} className="h-1.5 mt-1" />
                        </div>
                        <span className="text-sm font-bold text-muted-foreground">{t.세션수}개</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyChart message="강사 데이터가 없습니다" />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB: 세션 ── */}
        <TabsContent value="sessions" className="mt-4">
          <div className="space-y-3">
            {sessionStats.length === 0 ? (
              <EmptyChart message="세션이 없습니다" />
            ) : (
              sessionStats.map((session) => (
                <Card key={session.sessionId} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{session.title}</h3>
                          <Badge variant={session.status === "active" ? "active" : session.status === "completed" ? "completed" : "draft"}>
                            {STATUS_LABEL[session.status] ?? session.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{session.subject}</span>
                          <span className="text-border">|</span>
                          <span>{session.teacherName}</span>
                          <span className="text-border">|</span>
                          <span>{new Date(session.createdAt).toLocaleDateString("ko-KR")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 shrink-0">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">참여자</p>
                          <p className="text-lg font-bold">{session.studentCount}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">정답률</p>
                          <p className={cn("text-lg font-bold",
                            session.avgUnderstanding >= 70 ? "text-green-600" :
                            session.avgUnderstanding >= 50 ? "text-yellow-600" :
                            session.avgUnderstanding > 0 ? "text-red-600" : "text-muted-foreground"
                          )}>
                            {session.avgUnderstanding > 0 ? `${session.avgUnderstanding}%` : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ── TAB: 수강생 ── */}
        <TabsContent value="students" className="mt-4 space-y-4">
          {/* 수강생 요약 */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                <p className="text-2xl font-bold">{mentorStudents.length}</p>
                <p className="text-xs text-muted-foreground">전체 수강생</p>
              </CardContent>
            </Card>
            <Card className={highRisk.length > 0 ? "border-red-200" : ""}>
              <CardContent className="p-4 text-center">
                <AlertTriangle className={cn("h-5 w-5 mx-auto mb-1", highRisk.length > 0 ? "text-red-500" : "text-muted-foreground")} />
                <p className={cn("text-2xl font-bold", highRisk.length > 0 && "text-red-600")}>{highRisk.length}</p>
                <p className="text-xs text-muted-foreground">위험</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingDown className={cn("h-5 w-5 mx-auto mb-1", mediumRisk.length > 0 ? "text-yellow-500" : "text-muted-foreground")} />
                <p className="text-2xl font-bold">{mediumRisk.length}</p>
                <p className="text-xs text-muted-foreground">주의</p>
              </CardContent>
            </Card>
          </div>

          {/* 수강생 목록 */}
          {mentorStudents.length === 0 ? (
            <EmptyChart message="수강생 데이터가 없습니다" />
          ) : (
            <div className="space-y-2">
              {mentorStudents.map((student) => (
                <Link key={student.studentId} href={`/mentor/students/${student.studentId}`}>
                  <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full font-bold shrink-0",
                        student.riskLevel === "HIGH" ? "bg-red-100 text-red-700" :
                        student.riskLevel === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      )}>
                        {student.displayName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{student.displayName}</span>
                          <Badge variant={
                            student.riskLevel === "HIGH" ? "risk_high" :
                            student.riskLevel === "MEDIUM" ? "risk_medium" : "risk_low"
                          }>
                            {student.riskLevel === "HIGH" ? "위험" : student.riskLevel === "MEDIUM" ? "주의" : "양호"}
                          </Badge>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          {student.riskSignals.filter((s) => s.triggered).map((s) => (
                            <span key={s.type} className="text-red-500">{s.label} 이상</span>
                          ))}
                          {student.riskSignals.filter((s) => s.triggered).length === 0 && (
                            <span>위험 신호 없음</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-lg font-bold",
                          (student.recentAccuracy) >= 70 ? "text-green-600" :
                          (student.recentAccuracy) >= 40 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {student.recentAccuracy}%
                        </p>
                        <p className="text-xs text-muted-foreground">최근 정답률</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── TAB: 이탈 관리 ── */}
        {/* ── TAB: 수준 분포 ── */}
        <TabsContent value="levels" className="mt-4 space-y-6">
          {Object.keys(skillDistribution).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">아직 역량 진단 데이터가 없습니다</p>
                <p className="text-sm mt-1">수강생이 AI 역량 진단을 완료하면 수준 분포가 표시됩니다</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 과목별 수준 분포 차트 */}
              {Object.entries(skillDistribution).map(([subj, levels]) => {
                const levelOrder = ["beginner", "elementary", "intermediate", "advanced", "expert"];
                const levelLabels: Record<string, string> = { beginner: "입문", elementary: "초급", intermediate: "중급", advanced: "고급", expert: "전문가" };
                const levelColors: Record<string, string> = { beginner: "#ef4444", elementary: "#f97316", intermediate: "#eab308", advanced: "#3b82f6", expert: "#8b5cf6" };

                const chartData = levelOrder
                  .filter((lv) => levels[lv] && levels[lv] > 0)
                  .map((lv) => ({ name: levelLabels[lv], value: levels[lv], color: levelColors[lv] }));

                const total = chartData.reduce((s, d) => s + d.value, 0);

                return (
                  <Card key={subj}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 text-indigo-500" />
                          {subj}
                        </span>
                        <Badge variant="secondary">{total}명</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Stacked bar */}
                      <div className="flex h-8 rounded-lg overflow-hidden mb-3">
                        {chartData.map((d) => (
                          <div
                            key={d.name}
                            className="flex items-center justify-center text-xs font-bold text-white transition-all"
                            style={{ width: `${(d.value / total) * 100}%`, backgroundColor: d.color, minWidth: d.value > 0 ? "24px" : "0" }}
                            title={`${d.name}: ${d.value}명`}
                          >
                            {d.value}
                          </div>
                        ))}
                      </div>
                      {/* Legend */}
                      <div className="flex flex-wrap gap-3">
                        {chartData.map((d) => (
                          <div key={d.name} className="flex items-center gap-1.5 text-xs">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                            <span>{d.name}</span>
                            <span className="font-bold">{d.value}명</span>
                            <span className="text-muted-foreground">({Math.round((d.value / total) * 100)}%)</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>

        <TabsContent value="risk" className="mt-4 space-y-6">
          {/* 이탈 위험 from dashboard API */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                이탈 위험 수강생 ({atRiskStudents.length}명)
              </CardTitle>
              <CardDescription>정답률 60% 미만 또는 응답률 50% 미만</CardDescription>
            </CardHeader>
            <CardContent>
              {atRiskStudents.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
                  <p className="font-medium">이탈 위험 수강생이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {atRiskStudents.map((student, idx) => (
                    <div key={`${student.studentId}-${idx}`} className="flex items-center gap-4 rounded-lg border p-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700 text-sm font-bold shrink-0">
                        {student.studentName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{student.studentName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {student.sessionTitle}
                        </p>
                      </div>
                      <div className="flex gap-4 shrink-0 text-center">
                        <div>
                          <p className={cn("text-sm font-bold", student.avgScore < 40 ? "text-red-600" : "text-yellow-600")}>
                            {student.avgScore}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">정답률</p>
                        </div>
                        <div>
                          <p className={cn("text-sm font-bold", student.responseRate < 50 ? "text-red-600" : "text-yellow-600")}>
                            {student.responseRate}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">응답률</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3-signal 이탈 레이더 from mentor API */}
          {(highRisk.length > 0 || mediumRisk.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-500" />
                  3-Signal 이탈 레이더
                </CardTitle>
                <CardDescription>
                  정답률 하락 + 응답 속도 증가 + 연속 미참여 — 2개 이상 해당 시 HIGH
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...highRisk, ...mediumRisk].map((student) => (
                    <Link key={student.studentId} href={`/mentor/students/${student.studentId}`}>
                      <div className="rounded-lg border p-4 hover:shadow-sm hover:border-primary/30 transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{student.displayName}</span>
                            <Badge variant={student.riskLevel === "HIGH" ? "risk_high" : "risk_medium"}>
                              {student.riskLevel === "HIGH" ? "위험" : "주의"}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            결석 {student.consecutiveAbsences}회
                          </span>
                        </div>
                        {/* Signals */}
                        <div className="grid grid-cols-3 gap-2">
                          {student.riskSignals.map((signal) => (
                            <div key={signal.type} className={cn(
                              "rounded-md p-2 text-xs text-center",
                              signal.triggered ? "bg-red-50 text-red-700 font-medium" : "bg-muted text-muted-foreground"
                            )}>
                              {signal.type === "accuracy" ? "정답률" : signal.type === "speed" ? "응답 속도" : "출석"}
                              <br />
                              <span className="text-[10px]">{signal.triggered ? "발동" : "정상"}</span>
                            </div>
                          ))}
                        </div>
                        {/* Weak topics */}
                        {student.summary && (
                          <p className="text-xs text-muted-foreground mt-2">{student.summary}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Sub-components ── */

function KpiCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  color: string;
  highlight?: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
    green: { bg: "bg-green-100", text: "text-green-600" },
    indigo: { bg: "bg-indigo-100", text: "text-indigo-600" },
    yellow: { bg: "bg-yellow-100", text: "text-yellow-600" },
    red: { bg: "bg-red-100", text: "text-red-600" },
  };
  const c = colorMap[color] ?? colorMap.blue;

  return (
    <Card className={highlight ? "border-2 border-current" : ""} style={highlight ? { borderColor: color === "red" ? "#fca5a5" : color === "green" ? "#86efac" : undefined } : undefined}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", c.bg)}>
          <Icon className={cn("h-5 w-5", c.text)} />
        </div>
        <div>
          <p className="text-2xl font-bold">
            {value}{suffix && <span className="text-sm font-normal text-muted-foreground ml-0.5">{suffix}</span>}
          </p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
