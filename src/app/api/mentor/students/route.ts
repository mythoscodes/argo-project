import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  RISK_ACCURACY_THRESHOLD,
  RISK_ACCURACY_SESSION_COUNT,
  RISK_ABSENCE_THRESHOLD,
  RISK_SIGNAL_COUNT_FOR_HIGH,
  WEAK_TOPIC_THRESHOLD,
} from "@/lib/constants";

interface RiskSignal {
  type: "accuracy" | "speed" | "absence";
  description: string;
  triggered: boolean;
}

interface StudentWithRisk {
  studentId: string;
  displayName: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  riskSignals: RiskSignal[];
  recentAccuracyRates: number[];
  weakTopics: string[];
  lastSessionAt: string | null;
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, academy_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "프로필을 찾을 수 없습니다." },
      { status: 403 }
    );
  }

  if (!["owner", "teacher"].includes(profile.role)) {
    return NextResponse.json(
      { error: "강사/원장만 접근할 수 있습니다." },
      { status: 403 }
    );
  }

  // 내 세션에 참여한 수강생 목록
  const { data: mySessions } = await supabase
    .from("sessions")
    .select("id, created_at")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  if (!mySessions || mySessions.length === 0) {
    return NextResponse.json({ data: { students: [] } });
  }

  const sessionIds = mySessions.map((s) => s.id);

  // 세션 참여자 중 고유 수강생 추출
  const { data: participants } = await supabase
    .from("session_participants")
    .select("student_id, session_id, joined_at")
    .in("session_id", sessionIds);

  if (!participants || participants.length === 0) {
    return NextResponse.json({ data: { students: [] } });
  }

  const uniqueStudentIds = [
    ...new Set(participants.map((p) => p.student_id)),
  ];

  // 수강생 프로필
  const { data: studentProfiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", uniqueStudentIds);

  const profileMap = new Map(
    (studentProfiles ?? []).map((p) => [p.id, p.display_name])
  );

  // 전체 응답 데이터 (세션별 정답 집계용)
  const { data: allResponses } = await supabase
    .from("responses")
    .select("student_id, session_id, quiz_id, is_correct, response_time_ms")
    .in("session_id", sessionIds);

  // 퀴즈 데이터 (약점 토픽용)
  const { data: allQuizzes } = await supabase
    .from("quizzes")
    .select("id, session_id, topic_tag")
    .in("session_id", sessionIds);

  const quizTopicMap = new Map(
    (allQuizzes ?? []).map((q) => [q.id, q.topic_tag])
  );

  // 세션 시간순 정렬 (오래된 것 먼저)
  const sessionOrder = new Map(
    mySessions
      .slice()
      .reverse()
      .map((s, idx) => [s.id, idx])
  );

  // 수강생별 이탈 위험 계산
  const students: StudentWithRisk[] = uniqueStudentIds.map((studentId) => {
    const studentResponses = (allResponses ?? []).filter(
      (r) => r.student_id === studentId
    );

    // 세션별 참여 여부
    const participatedSessionIds = new Set(
      participants
        .filter((p) => p.student_id === studentId)
        .map((p) => p.session_id)
    );

    // 최근 N세션 정답률 (최신순)
    const sessionAccuracy = new Map<string, { correct: number; total: number }>();
    for (const resp of studentResponses) {
      const existing = sessionAccuracy.get(resp.session_id) ?? {
        correct: 0,
        total: 0,
      };
      sessionAccuracy.set(resp.session_id, {
        correct: existing.correct + (resp.is_correct ? 1 : 0),
        total: existing.total + 1,
      });
    }

    const sortedSessions = [...sessionAccuracy.entries()]
      .sort((a, b) => (sessionOrder.get(b[0]) ?? 0) - (sessionOrder.get(a[0]) ?? 0));

    const recentAccuracyRates = sortedSessions
      .slice(0, RISK_ACCURACY_SESSION_COUNT)
      .map(([, stats]) =>
        stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
      );

    // Signal 1: 정답률 신호
    const avgRecentAccuracy =
      recentAccuracyRates.length > 0
        ? recentAccuracyRates.reduce((sum, rate) => sum + rate, 0) /
          recentAccuracyRates.length
        : 100;

    const accuracySignal: RiskSignal = {
      type: "accuracy",
      description: `최근 ${recentAccuracyRates.length}세션 평균 정답률 ${Math.round(avgRecentAccuracy)}%`,
      triggered: avgRecentAccuracy < RISK_ACCURACY_THRESHOLD,
    };

    // Signal 2: 응답 속도 신호 (최근 세션 평균 응답 시간 상승 추세)
    const sessionAvgSpeed = sortedSessions.slice(0, 3).map(([sessionId]) => {
      const sessionResps = studentResponses.filter(
        (r) => r.session_id === sessionId && r.response_time_ms !== null
      );
      if (sessionResps.length === 0) return 0;
      const sum = sessionResps.reduce(
        (acc, r) => acc + (r.response_time_ms ?? 0),
        0
      );
      return sum / sessionResps.length;
    });

    const speedIncreasing =
      sessionAvgSpeed.length >= 2 &&
      sessionAvgSpeed[0] > sessionAvgSpeed[sessionAvgSpeed.length - 1] * 1.3;

    const speedSignal: RiskSignal = {
      type: "speed",
      description: speedIncreasing
        ? "응답 속도 30% 이상 증가 (찍기 패턴 의심)"
        : "응답 속도 정상",
      triggered: speedIncreasing,
    };

    // Signal 3: 출석 신호 (최근 세션 중 연속 미참여)
    const recentSessionIds = mySessions
      .slice(0, 5)
      .map((s) => s.id);
    let consecutiveAbsence = 0;
    for (const sid of recentSessionIds) {
      if (!participatedSessionIds.has(sid)) {
        consecutiveAbsence++;
      } else {
        break;
      }
    }

    const absenceSignal: RiskSignal = {
      type: "absence",
      description:
        consecutiveAbsence > 0
          ? `최근 ${consecutiveAbsence}회 연속 미참여`
          : "출석 정상",
      triggered: consecutiveAbsence >= RISK_ABSENCE_THRESHOLD,
    };

    const signals = [accuracySignal, speedSignal, absenceSignal];
    const triggeredCount = signals.filter((s) => s.triggered).length;

    let riskLevel: "HIGH" | "MEDIUM" | "LOW";
    if (triggeredCount >= RISK_SIGNAL_COUNT_FOR_HIGH) {
      riskLevel = "HIGH";
    } else if (triggeredCount === 1) {
      riskLevel = "MEDIUM";
    } else {
      riskLevel = "LOW";
    }

    // 약점 토픽 (정답률 60% 미만)
    const topicStats = new Map<string, { correct: number; total: number }>();
    for (const resp of studentResponses) {
      const topic = quizTopicMap.get(resp.quiz_id) ?? "기타";
      const existing = topicStats.get(topic) ?? { correct: 0, total: 0 };
      topicStats.set(topic, {
        correct: existing.correct + (resp.is_correct ? 1 : 0),
        total: existing.total + 1,
      });
    }

    const weakTopics = [...topicStats.entries()]
      .filter(
        ([, stats]) =>
          stats.total > 0 &&
          (stats.correct / stats.total) * 100 < WEAK_TOPIC_THRESHOLD
      )
      .map(([topic]) => topic);

    // 마지막 세션 참여 시각
    const studentParticipations = participants
      .filter((p) => p.student_id === studentId)
      .sort(
        (a, b) =>
          new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()
      );
    const lastSessionAt =
      studentParticipations.length > 0
        ? studentParticipations[0].joined_at
        : null;

    return {
      studentId,
      displayName: profileMap.get(studentId) ?? "알 수 없음",
      riskLevel,
      riskSignals: signals,
      recentAccuracyRates,
      weakTopics,
      lastSessionAt,
    };
  });

  // 이탈 위험도 순 정렬 (HIGH > MEDIUM > LOW)
  const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  students.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);

  return NextResponse.json({ data: { students } });
}
