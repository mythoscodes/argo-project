"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Users,
  AlertTriangle,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

interface DashboardData {
  total_sessions: number;
  active_sessions: number;
  total_students: number;
  at_risk_students: number;
  session_stats: Array<{
    id: string;
    title: string;
    average_accuracy: number;
    participant_count: number;
    created_at: string;
  }>;
  at_risk_list: Array<{
    student_id: string;
    display_name: string;
    risk_level: string;
    accuracy: number;
  }>;
}

export default function OwnerDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/dashboard");
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
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

  if (!data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        데이터를 불러올 수 없습니다
      </div>
    );
  }

  const chartData = (data.session_stats ?? []).map((s) => ({
    name: s.title.length > 8 ? s.title.slice(0, 8) + "..." : s.title,
    정답률: s.average_accuracy,
    참여: s.participant_count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">경영 대시보드</h1>
        <p className="text-muted-foreground mt-1">학원 전체 수업 품질 및 수강생 현황</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.total_sessions}</p>
                <p className="text-xs text-muted-foreground">전체 세션</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.active_sessions}</p>
                <p className="text-xs text-muted-foreground">진행중</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.total_students}</p>
                <p className="text-xs text-muted-foreground">수강생</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.at_risk_students}</p>
                <p className="text-xs text-muted-foreground">이탈 위험</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Accuracy Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              세션별 평균 정답률
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="정답률" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">데이터가 없습니다</p>
            )}
          </CardContent>
        </Card>

        {/* At Risk Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              이탈 위험 수강생
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data.at_risk_list ?? []).length > 0 ? (
              <div className="space-y-3">
                {data.at_risk_list.map((student) => (
                  <div key={student.student_id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
                        {student.display_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{student.display_name}</p>
                        <p className="text-xs text-muted-foreground">정답률 {student.accuracy}%</p>
                      </div>
                    </div>
                    <Badge variant={student.risk_level === "HIGH" ? "risk_high" : "risk_medium"}>
                      {student.risk_level === "HIGH" ? "위험" : "주의"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                이탈 위험 수강생이 없습니다
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
