"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ChevronRight, Shield, TrendingDown, Clock,
  Users, Target, Activity, Brain, CheckCircle2, XCircle,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface StudentRisk {
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

export default function MentorPage() {
  const [students, setStudents] = useState<StudentRisk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/mentor/students");
      if (response.ok) {
        const result = await response.json();
        setStudents(result.data ?? []);
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

  const highCount = students.filter((s) => s.risk_level === "HIGH").length;
  const mediumCount = students.filter((s) => s.risk_level === "MEDIUM").length;
  const lowCount = students.length - highCount - mediumCount;
  const avgAccuracy = students.length > 0
    ? Math.round(students.reduce((s, st) => s + st.recent_accuracy, 0) / students.length)
    : 0;

  const filteredStudents = filter === "all"
    ? students
    : students.filter((s) => s.risk_level === filter);

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return order[a.risk_level] - order[b.risk_level];
  });

  const pieData = [
    { name: "위험", value: highCount, color: "#ef4444" },
    { name: "주의", value: mediumCount, color: "#f59e0b" },
    { name: "양호", value: lowCount, color: "#22c55e" },
  ].filter((d) => d.value > 0);

  // 3-signal 발동 빈도
  const signalCounts = {
    accuracy: students.filter((s) => s.risk_signals.low_accuracy).length,
    speed: students.filter((s) => s.risk_signals.speed_increase).length,
    absence: students.filter((s) => s.risk_signals.absence).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-500" />
            멘토 대시보드
          </h1>
          <p className="text-muted-foreground mt-1">수강생 이탈 위험을 조기에 감지하고 상담으로 개입합니다</p>
        </div>
      </div>

      {/* Alert Banner */}
      {highCount > 0 && (
        <div className="relative overflow-hidden rounded-xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-800">
                긴급: 이탈 위험 수강생 {highCount}명
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                {students.filter((s) => s.risk_level === "HIGH").map((s) => s.display_name).join(", ")} — 오늘 상담을 권장합니다
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">전체 수강생</p>
                <p className="text-2xl font-bold mt-1">{students.length}<span className="text-sm font-normal text-muted-foreground ml-1">명</span></p>
              </div>
              <Users className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">이탈 위험</p>
                <p className="text-2xl font-bold mt-1 text-red-600">{highCount}<span className="text-sm font-normal text-muted-foreground ml-1">명</span></p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">주의 관찰</p>
                <p className="text-2xl font-bold mt-1 text-yellow-600">{mediumCount}<span className="text-sm font-normal text-muted-foreground ml-1">명</span></p>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">평균 정답률</p>
                <p className={cn("text-2xl font-bold mt-1", avgAccuracy >= 60 ? "text-green-600" : "text-red-600")}>{avgAccuracy}%</p>
              </div>
              <Target className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Risk Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500" />
              위험도 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" stroke="none">
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span>{d.name}</span>
                      <span className="font-bold">{d.value}명</span>
                      <span className="text-muted-foreground text-xs">
                        ({Math.round((d.value / students.length) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">데이터가 없습니다</p>
            )}
          </CardContent>
        </Card>

        {/* 3-Signal Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-500" />
              3-Signal 현황
            </CardTitle>
            <CardDescription>전체 수강생 중 신호 발동 비율</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "정답률 하락", count: signalCounts.accuracy, icon: TrendingDown, color: "bg-red-500" },
              { label: "응답 속도 증가", count: signalCounts.speed, icon: Clock, color: "bg-orange-500" },
              { label: "연속 미참여", count: signalCounts.absence, icon: XCircle, color: "bg-yellow-500" },
            ].map((sig) => {
              const percent = students.length > 0 ? Math.round((sig.count / students.length) * 100) : 0;
              return (
                <div key={sig.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5">
                      <sig.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {sig.label}
                    </span>
                    <span className="font-bold">{sig.count}명 <span className="text-muted-foreground font-normal">({percent}%)</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", sig.color)} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">
            전체 <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{students.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="HIGH">
            위험 <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5">{highCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="MEDIUM">
            주의 <Badge variant="warning" className="ml-1.5 text-[10px] px-1.5">{mediumCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="LOW">
            양호 <Badge variant="success" className="ml-1.5 text-[10px] px-1.5">{lowCount}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {sortedStudents.length === 0 ? (
            <EmptyState
              icon={<Shield className="h-12 w-12" />}
              title="해당 수강생이 없습니다"
            />
          ) : (
            <div className="space-y-3">
              {sortedStudents.map((student) => {
                const riskGradient =
                  student.risk_level === "HIGH" ? "from-red-500 to-orange-500" :
                  student.risk_level === "MEDIUM" ? "from-yellow-400 to-amber-500" :
                  "from-green-400 to-emerald-500";

                return (
                  <Link key={student.student_id} href={`/mentor/students/${student.student_id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group">
                      <div className="flex">
                        {/* Left color strip */}
                        <div className={cn("w-1.5 bg-gradient-to-b shrink-0", riskGradient)} />

                        <CardContent className="p-4 flex items-center gap-4 flex-1">
                          {/* Avatar */}
                          <div className={cn(
                            "relative flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold shrink-0 ring-2 ring-offset-2",
                            student.risk_level === "HIGH" ? "bg-red-100 text-red-700 ring-red-300" :
                            student.risk_level === "MEDIUM" ? "bg-yellow-100 text-yellow-700 ring-yellow-300" :
                            "bg-green-100 text-green-700 ring-green-300"
                          )}>
                            {student.display_name.charAt(0)}
                            {student.risk_level === "HIGH" && (
                              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500" />
                              </span>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{student.display_name}</h3>
                              <Badge variant={
                                student.risk_level === "HIGH" ? "risk_high" :
                                student.risk_level === "MEDIUM" ? "risk_medium" : "risk_low"
                              }>
                                {student.risk_level === "HIGH" ? "위험" : student.risk_level === "MEDIUM" ? "주의" : "양호"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate mb-2">
                              {student.summary}
                            </p>
                            {/* 3-Signal dots */}
                            <div className="flex gap-4 text-xs">
                              <span className="flex items-center gap-1">
                                <span className={cn("h-2 w-2 rounded-full", student.risk_signals.low_accuracy ? "bg-red-500" : "bg-green-500")} />
                                정답률 {student.recent_accuracy}%
                              </span>
                              <span className="flex items-center gap-1">
                                <span className={cn("h-2 w-2 rounded-full", student.risk_signals.speed_increase ? "bg-red-500" : "bg-green-500")} />
                                {student.risk_signals.speed_increase ? "속도 이상" : "속도 정상"}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className={cn("h-2 w-2 rounded-full", student.risk_signals.absence ? "bg-red-500" : "bg-green-500")} />
                                {student.consecutive_absences > 0 ? `결석 ${student.consecutive_absences}회` : "출석 양호"}
                              </span>
                            </div>
                          </div>

                          {/* Accuracy gauge */}
                          <div className="hidden sm:flex flex-col items-center gap-1 shrink-0 w-16">
                            <div className="relative h-14 w-14">
                              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                                  stroke={student.recent_accuracy >= 70 ? "#22c55e" : student.recent_accuracy >= 40 ? "#f59e0b" : "#ef4444"}
                                  strokeWidth="3" strokeDasharray={`${student.recent_accuracy}, 100`} strokeLinecap="round" />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                                {student.recent_accuracy}%
                              </span>
                            </div>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
