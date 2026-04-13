"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  Calendar,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface StudentDetail {
  student_id: string;
  display_name: string;
  risk_level: string;
  risk_signals: {
    low_accuracy: boolean;
    speed_increase: boolean;
    absence: boolean;
  };
  recent_accuracy: number;
  consecutive_absences: number;
  session_history: Array<{
    session_id: string;
    title: string;
    accuracy: number;
    created_at: string;
  }>;
  weak_topics: Array<{ topic: string; accuracy: number }>;
}

interface ConsultationNote {
  id: string;
  type: string;
  content: string;
  next_consultation_date: string | null;
  created_at: string;
}

interface MentorBriefing {
  riskAssessment?: string;
  talkingPoints?: string[];
  talking_points?: string[];
  weaknessAnalysis?: string;
  weakness_analysis?: string;
  consultationStrategy?: string;
  recommended_strategy?: string;
  encouragementTip?: string;
  recommendedCourses?: Array<{ courseTitle: string; reason: string }>;
  recommended_courses?: string[];
}

const TYPE_LABELS: Record<string, string> = {
  "학습부진": "학습부진",
  "진로": "진로",
  "출결": "출결",
  "기타": "기타",
};

export default function MentorStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = use(params);
  const { toast } = useToast();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [consultations, setConsultations] = useState<ConsultationNote[]>([]);
  const [briefing, setBriefing] = useState<MentorBriefing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteType, setNoteType] = useState("학습부진");
  const [noteContent, setNoteContent] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [skillAssessment, setSkillAssessment] = useState<{
    skills: Array<{ topic: string; score: number; level: string; feedback: string }>;
    overall_level: string | null;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const [studentRes, consultRes, assessRes] = await Promise.all([
        fetch(`/api/mentor/students/${studentId}`),
        fetch(`/api/mentor/consultations?studentId=${studentId}`),
        fetch(`/api/ai/assessment?studentId=${studentId}`),
      ]);
      if (studentRes.ok) {
        const result = await studentRes.json();
        setStudent(result.data);
      }
      if (consultRes.ok) {
        const result = await consultRes.json();
        setConsultations(result.data ?? []);
      }
      if (assessRes.ok) {
        const result = await assessRes.json();
        const assessments = result.data?.assessments ?? [];
        if (assessments.length > 0) {
          const latest = assessments[0];
          setSkillAssessment({
            skills: Array.isArray(latest.skill_scores) ? latest.skill_scores : [],
            overall_level: latest.overall_level,
          });
        }
      }
      setIsLoading(false);
    }
    load();
  }, [studentId]);

  async function handleGenerateBriefing() {
    setIsBriefingLoading(true);
    try {
      const response = await fetch("/api/ai/mentor-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.data?.briefing) {
          setBriefing(result.data.briefing);
        } else if (result.data) {
          setBriefing(result.data);
        }
      } else {
        const errResult = await response.json().catch(() => null);
        toast(errResult?.error ?? "AI 상담 브리핑 생성에 실패했습니다.", "error");
      }
    } finally {
      setIsBriefingLoading(false);
    }
  }

  async function handleSaveNote() {
    if (!noteContent.trim()) return;
    setIsSavingNote(true);
    try {
      const response = await fetch("/api/mentor/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          type: noteType,
          content: noteContent,
          nextConsultationDate: nextDate || undefined,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        setConsultations((prev) => [result.data, ...prev]);
        setShowNoteDialog(false);
        setNoteContent("");
        setNextDate("");
      } else {
        const errResult = await response.json().catch(() => null);
        toast(errResult?.error ?? "상담 기록 저장에 실패했습니다.", "error");
      }
    } finally {
      setIsSavingNote(false);
    }
  }

  if (isLoading || !student) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  // Chart data
  const historyData = (student.session_history ?? []).map((s, idx) => ({
    name: `세션${idx + 1}`,
    정답률: s.accuracy,
  }));

  const radarData = (student.weak_topics ?? []).map((t) => ({
    topic: t.topic,
    score: t.accuracy,
    fullMark: 100,
  }));

  const riskColor = student.risk_level === "HIGH"
    ? "text-red-600"
    : student.risk_level === "MEDIUM"
      ? "text-yellow-600"
      : "text-green-600";

  return (
    <div className="space-y-6">
      <Link
        href="/mentor"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        목록으로
      </Link>

      {/* Header: Risk Card */}
      <Card className={cn(
        "border-2",
        student.risk_level === "HIGH" ? "border-red-200" : student.risk_level === "MEDIUM" ? "border-yellow-200" : "border-green-200"
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold",
                student.risk_level === "HIGH"
                  ? "bg-red-100 text-red-700"
                  : student.risk_level === "MEDIUM"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
              )}>
                {student.display_name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{student.display_name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={
                    student.risk_level === "HIGH" ? "risk_high"
                    : student.risk_level === "MEDIUM" ? "risk_medium"
                    : "risk_low"
                  } className="text-sm px-3 py-1">
                    {student.risk_level === "HIGH" ? "이탈 위험" : student.risk_level === "MEDIUM" ? "주의" : "양호"}
                  </Badge>
                </div>
              </div>
            </div>
            <Button onClick={handleGenerateBriefing} disabled={isBriefingLoading}>
              {isBriefingLoading ? (
                <><Spinner size="sm" className="mr-1" /> 브리핑 생성중...</>
              ) : (
                <><Brain className="h-4 w-4 mr-1" /> AI 상담 브리핑</>
              )}
            </Button>
          </div>

          {/* 3-Signal Detail */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className={cn("rounded-lg border p-3 text-center",
              student.risk_signals.low_accuracy ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
            )}>
              <TrendingDown className={cn("h-5 w-5 mx-auto mb-1",
                student.risk_signals.low_accuracy ? "text-red-600" : "text-green-600"
              )} />
              <p className="text-lg font-bold">{student.recent_accuracy}%</p>
              <p className="text-xs text-muted-foreground">최근 정답률</p>
            </div>
            <div className={cn("rounded-lg border p-3 text-center",
              student.risk_signals.speed_increase ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
            )}>
              <Clock className={cn("h-5 w-5 mx-auto mb-1",
                student.risk_signals.speed_increase ? "text-red-600" : "text-green-600"
              )} />
              <p className="text-lg font-bold">{student.risk_signals.speed_increase ? "증가" : "정상"}</p>
              <p className="text-xs text-muted-foreground">응답 속도</p>
            </div>
            <div className={cn("rounded-lg border p-3 text-center",
              student.risk_signals.absence ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
            )}>
              <Calendar className={cn("h-5 w-5 mx-auto mb-1",
                student.risk_signals.absence ? "text-red-600" : "text-green-600"
              )} />
              <p className="text-lg font-bold">{student.consecutive_absences}회</p>
              <p className="text-xs text-muted-foreground">연속 미참여</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Briefing */}
      {briefing && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Brain className="h-5 w-5" />
              AI 상담 브리핑
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 위험 판단 */}
            {briefing.riskAssessment && (
              <div className="rounded-lg bg-red-50 p-3">
                <h4 className="text-sm font-semibold text-red-700 mb-1">이탈 위험 판단</h4>
                <p className="text-sm text-red-800">{briefing.riskAssessment}</p>
              </div>
            )}

            {/* 대화 포인트 */}
            <div>
              <h4 className="text-sm font-semibold text-purple-700 mb-2">대화 포인트</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {(briefing.talkingPoints ?? briefing.talking_points ?? []).map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ol>
            </div>

            {/* 약점 분석 */}
            <div>
              <h4 className="text-sm font-semibold text-purple-700 mb-1">약점 분석</h4>
              <p className="text-sm">{briefing.weaknessAnalysis ?? briefing.weakness_analysis}</p>
            </div>

            {/* 상담 전략 */}
            <div>
              <h4 className="text-sm font-semibold text-purple-700 mb-1">권장 상담 전략</h4>
              <p className="text-sm">{briefing.consultationStrategy ?? briefing.recommended_strategy}</p>
            </div>

            {/* 격려 팁 */}
            {briefing.encouragementTip && (
              <div className="rounded-lg bg-green-50 p-3">
                <h4 className="text-sm font-semibold text-green-700 mb-1">격려 방향</h4>
                <p className="text-sm text-green-800">{briefing.encouragementTip}</p>
              </div>
            )}

            {/* 추천 강의 (구조화) */}
            {briefing.recommendedCourses && briefing.recommendedCourses.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-purple-700 mb-2">수준 기반 추천 강의</h4>
                <div className="space-y-2">
                  {briefing.recommendedCourses.map((course, idx) => (
                    <div key={idx} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{course.courseTitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{course.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Accuracy Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              세션별 정답률 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="정답률" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">데이터가 없습니다</p>
            )}
          </CardContent>
        </Card>

        {/* Topic Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5" />
              토픽별 이해도
            </CardTitle>
          </CardHeader>
          <CardContent>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">데이터가 없습니다</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weak Topics */}
      {student.weak_topics && student.weak_topics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">취약 토픽</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {student.weak_topics.map((t) => (
                <div key={t.topic} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5">
                  <span className="text-sm font-medium">{t.topic}</span>
                  <span className={cn(
                    "text-xs font-mono font-bold",
                    t.accuracy < 40 ? "text-red-600" : t.accuracy < 60 ? "text-yellow-600" : "text-green-600"
                  )}>
                    {t.accuracy}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI 역량 진단 결과 */}
      {skillAssessment && skillAssessment.skills.length > 0 && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-5 w-5 text-indigo-500" />
              AI 역량 진단 결과
              {skillAssessment.overall_level && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {skillAssessment.overall_level === "beginner" ? "입문" :
                   skillAssessment.overall_level === "elementary" ? "초급" :
                   skillAssessment.overall_level === "intermediate" ? "중급" :
                   skillAssessment.overall_level === "advanced" ? "고급" : "전문가"} 수준
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {skillAssessment.skills.map((skill) => (
              <div key={skill.topic} className="flex items-center gap-2">
                <span className="text-xs w-20 truncate font-medium">{skill.topic}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      skill.score >= 80 ? "bg-green-500" :
                      skill.score >= 60 ? "bg-yellow-500" :
                      skill.score >= 40 ? "bg-orange-500" : "bg-red-500"
                    )}
                    style={{ width: `${skill.score}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold w-10 text-right">{skill.score}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Consultation Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5" />
              상담 기록
            </CardTitle>
            <Button size="sm" onClick={() => setShowNoteDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              기록 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {consultations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">아직 상담 기록이 없습니다</p>
          ) : (
            <div className="space-y-4">
              {consultations.map((note) => (
                <div key={note.id} className="border-l-2 border-primary/30 pl-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">{TYPE_LABELS[note.type] ?? note.type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  {note.next_consultation_date && (
                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      다음 상담: {new Date(note.next_consultation_date).toLocaleDateString("ko-KR")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상담 기록 추가</DialogTitle>
            <DialogDescription>상담 내용과 다음 상담 예정일을 기록하세요</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>상담 유형</Label>
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="학습부진">학습부진</SelectItem>
                  <SelectItem value="진로">진로</SelectItem>
                  <SelectItem value="출결">출결</SelectItem>
                  <SelectItem value="기타">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>상담 내용</Label>
              <Textarea
                placeholder="상담 내용을 자유롭게 기록하세요..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label>다음 상담 예정일</Label>
              <Input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>취소</Button>
            <Button onClick={handleSaveNote} disabled={isSavingNote || !noteContent.trim()}>
              {isSavingNote ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
