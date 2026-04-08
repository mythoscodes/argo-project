"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, Shield, TrendingDown, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const RISK_CONFIG = {
  HIGH: { label: "위험", variant: "risk_high" as const, icon: AlertTriangle, color: "text-red-600" },
  MEDIUM: { label: "주의", variant: "risk_medium" as const, icon: TrendingDown, color: "text-yellow-600" },
  LOW: { label: "양호", variant: "risk_low" as const, icon: Shield, color: "text-green-600" },
};

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

  const filteredStudents = filter === "all"
    ? students
    : students.filter((s) => s.risk_level === filter);

  // Sort: HIGH first, then MEDIUM, then LOW
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return order[a.risk_level] - order[b.risk_level];
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">멘토 대시보드</h1>
        <p className="text-muted-foreground mt-1">수강생 이탈 위험을 조기에 감지하고 상담으로 개입합니다</p>
      </div>

      {/* Alert Banner */}
      {highCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800">
            오늘 상담이 필요한 수강생이 <strong>{highCount}명</strong> 있습니다
          </p>
        </div>
      )}

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">전체 ({students.length})</TabsTrigger>
          <TabsTrigger value="HIGH">위험 ({highCount})</TabsTrigger>
          <TabsTrigger value="MEDIUM">주의 ({mediumCount})</TabsTrigger>
          <TabsTrigger value="LOW">양호 ({students.length - highCount - mediumCount})</TabsTrigger>
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
                const config = RISK_CONFIG[student.risk_level];
                const Icon = config.icon;

                return (
                  <Link key={student.student_id} href={`/mentor/students/${student.student_id}`}>
                    <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                      <CardContent className="p-4 flex items-center gap-4">
                        {/* Avatar */}
                        <div className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold shrink-0",
                          student.risk_level === "HIGH"
                            ? "bg-red-100 text-red-700"
                            : student.risk_level === "MEDIUM"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                        )}>
                          {student.display_name.charAt(0)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{student.display_name}</h3>
                            <Badge variant={config.variant}>{config.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {student.summary}
                          </p>
                          {/* 3-Signal indicators */}
                          <div className="flex gap-3 mt-2 text-xs">
                            <span className={student.risk_signals.low_accuracy ? "text-red-600 font-medium" : "text-muted-foreground"}>
                              정답률 {student.recent_accuracy}%
                            </span>
                            <span className={student.risk_signals.speed_increase ? "text-red-600 font-medium" : "text-muted-foreground"}>
                              {student.risk_signals.speed_increase ? "응답 느림" : "속도 정상"}
                            </span>
                            <span className={student.risk_signals.absence ? "text-red-600 font-medium" : "text-muted-foreground"}>
                              {student.consecutive_absences > 0 ? `결석 ${student.consecutive_absences}회` : "출석 양호"}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </CardContent>
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
