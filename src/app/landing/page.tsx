"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Eye,
  Zap,
  BarChart3,
  Brain,
  Users,
  Shield,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Monitor,
  Smartphone,
  Clock,
  Target,
  ChevronDown,
  Sparkles,
  GraduationCap,
  LineChart,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ───────── Intersection Observer hook ───────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ───────── Animated counter ───────── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView();
  useEffect(() => {
    if (!visible) return;
    let frame: number;
    const duration = 1600;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ═══════════════════════════════════════════════ */
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      {/* ── Sticky Nav ── */}
      <nav
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-300",
          scrollY > 40
            ? "bg-white/80 backdrop-blur-xl border-b shadow-sm"
            : "bg-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/landing" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/25">
              <Eye className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">Argos</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How it works</a>
            <a href="#roles" className="hover:text-slate-900 transition-colors">Users</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors hidden sm:block"
            >
              로그인
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all hover:shadow-blue-600/40 hover:-translate-y-0.5"
            >
              무료로 시작하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
        {/* Animated gradient bg */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-[-20%] left-[10%] h-[600px] w-[600px] rounded-full bg-blue-100 opacity-60 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[5%] h-[500px] w-[500px] rounded-full bg-indigo-100 opacity-50 blur-[100px]" />
          <div className="absolute top-[30%] right-[20%] h-[300px] w-[300px] rounded-full bg-violet-100 opacity-40 blur-[80px] animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-col items-center text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
              <Sparkles className="h-4 w-4" />
              2026 KIT 바이브코딩 공모전
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                100개의 눈
              </span>
              으로
              <br />
              교실을 본다
            </h1>

            <p className="mt-6 max-w-2xl text-lg md:text-xl text-slate-500 leading-relaxed">
              강사 1명의 눈으로는 30명을 동시에 볼 수 없습니다.
              <br className="hidden md:block" />
              <strong className="text-slate-700">Argos의 AI</strong>가 수강생 이해도를 실시간 분석하고,
              강사에게 즉각적인 코칭을 제공합니다.
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 text-base font-bold text-white shadow-xl shadow-blue-600/25 hover:bg-blue-700 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all"
              >
                무료로 시작하기
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 px-8 text-base font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                어떻게 작동하나요?
              </a>
            </div>

            {/* Stats strip */}
            <div className="mt-16 grid grid-cols-3 gap-8 md:gap-16">
              {[
                { value: 100, suffix: "%", label: "무료" },
                { value: 30, suffix: "초", label: "퀴즈 자동생성" },
                { value: 50, suffix: "%↓", label: "중도 포기율 감소" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-3xl md:text-4xl font-extrabold text-blue-600">
                    <Counter target={s.value} suffix={s.suffix} />
                  </p>
                  <p className="mt-1 text-sm text-slate-400 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="h-6 w-6 text-slate-300" />
        </div>
      </section>

      {/* ══════════ PROBLEM ══════════ */}
      <ProblemSection />

      {/* ══════════ FEATURES ══════════ */}
      <FeaturesSection />

      {/* ══════════ HOW IT WORKS ══════════ */}
      <HowItWorksSection />

      {/* ══════════ FOR EACH ROLE ══════════ */}
      <RolesSection />

      {/* ══════════ TECH STACK ══════════ */}
      <TechSection />

      {/* ══════════ FINAL CTA ══════════ */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600" />
        <div className="absolute inset-0 -z-10 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "40px 40px" }} />

        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
            수업의 사각지대를
            <br />
            AI로 밝히세요
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Argos와 함께라면 강사는 더 잘 가르치고, 수강생은 더 잘 배웁니다.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-8 text-base font-bold text-blue-600 shadow-xl hover:bg-blue-50 hover:-translate-y-0.5 transition-all"
            >
              무료로 시작하기
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-14 items-center gap-2 rounded-2xl border-2 border-white/30 px-8 text-base font-bold text-white hover:bg-white/10 transition-all"
            >
              로그인
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="border-t bg-slate-50 py-12">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <span className="font-bold">Argos</span>
              <span className="text-sm text-slate-400 ml-2">by Team mythos</span>
            </div>
            <p className="text-sm text-slate-400">
              2026 KIT 바이브코딩 공모전 — AI활용 차세대 교육 솔루션
            </p>
            <div className="flex gap-6 text-sm text-slate-400">
              <Link href="/login" className="hover:text-slate-600 transition-colors">로그인</Link>
              <Link href="/register" className="hover:text-slate-600 transition-colors">회원가입</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SECTION COMPONENTS
   ═══════════════════════════════════════════════ */

function ProblemSection() {
  const s = useInView();
  const problems = [
    {
      icon: Users,
      who: "강사",
      pain: "30명이 코딩 중인데 누가 막혀있는지 모릅니다",
      detail: "수강생 수준 편차가 극심한 IT 교육 현장에서, 이해도 격차를 수업 후에야 파악합니다.",
      color: "blue",
    },
    {
      icon: GraduationCap,
      who: "수강생",
      pain: "못 따라가도 질문하기 어렵습니다",
      detail: "조용히 뒤처지다 중도 포기합니다. IT교육 중도 포기율은 30~50%에 달합니다.",
      color: "violet",
    },
    {
      icon: LineChart,
      who: "원장",
      pain: "중도탈락 = 매출 손실입니다",
      detail: "만족도 설문 외에 실질적 역량 향상을 측정할 데이터가 없습니다.",
      color: "amber",
    },
  ];

  const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
    blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-100" },
    violet: { bg: "bg-violet-50", icon: "text-violet-600", border: "border-violet-100" },
    amber: { bg: "bg-amber-50", icon: "text-amber-600", border: "border-amber-100" },
  };

  return (
    <section className="py-20 md:py-28 bg-slate-50">
      <div className="mx-auto max-w-6xl px-5">
        <div
          ref={s.ref}
          className={cn(
            "text-center mb-14 transition-all duration-700",
            s.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600 mb-3">Problem</p>
          <h2 className="text-3xl md:text-4xl font-extrabold">
            IT 교육 현장의 <span className="text-blue-600">사각지대</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((p, i) => {
            const a = useInView();
            const c = colorMap[p.color];
            return (
              <div
                key={p.who}
                ref={a.ref}
                className={cn(
                  "rounded-2xl border bg-white p-7 transition-all duration-700 hover:shadow-lg hover:-translate-y-1",
                  c.border,
                  a.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                )}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className={cn("inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4", c.bg)}>
                  <p.icon className={cn("h-6 w-6", c.icon)} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{p.who}</p>
                <h3 className="text-lg font-bold leading-snug mb-3">{p.pain}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{p.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const s = useInView();

  const features = [
    {
      icon: Zap,
      title: "AI 코드 퀴즈 자동생성",
      desc: "수업 주제를 입력하면 30초 만에 코딩 특화 퀴즈를 생성합니다. 출력 예측, 버그 찾기, 빈칸 채우기 3가지 유형.",
      gradient: "from-yellow-400 to-orange-500",
    },
    {
      icon: BarChart3,
      title: "실시간 이해도 히트맵",
      desc: "응답이 들어올 때마다 개념별 이해도를 히트맵으로 시각화합니다. 녹색은 이해, 빨간색은 미이해.",
      gradient: "from-blue-400 to-cyan-500",
    },
    {
      icon: Brain,
      title: "AI 강사 코칭",
      desc: "\"이 개념에서 60%가 약합니다. 보충 설명을 권장합니다\" 같은 실시간 코칭을 AI가 제공합니다.",
      gradient: "from-violet-400 to-purple-600",
    },
    {
      icon: TrendingUp,
      title: "피드백 루프 & 델타",
      desc: "보충 설명 후 재퀴즈를 보내 이해도 변화를 시각화합니다. 교수 개입의 효과를 즉시 확인.",
      gradient: "from-green-400 to-emerald-600",
    },
    {
      icon: Target,
      title: "수강생 학습 리포트",
      desc: "수업 후 AI가 개인별 이해도 분석, 약점 개념, 학습 경로를 자동으로 생성합니다.",
      gradient: "from-pink-400 to-rose-600",
    },
    {
      icon: Shield,
      title: "이탈 위험 조기 감지",
      desc: "정답률 하락 + 응답 속도 증가 + 연속 미참여. 3-signal composite로 이탈을 사전에 차단합니다.",
      gradient: "from-red-400 to-orange-600",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div
          ref={s.ref}
          className={cn(
            "text-center mb-16 transition-all duration-700",
            s.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600 mb-3">Features</p>
          <h2 className="text-3xl md:text-4xl font-extrabold">
            AI가 수업의 <span className="text-blue-600">모든 순간</span>을 분석합니다
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const a = useInView();
            return (
              <div
                key={f.title}
                ref={a.ref}
                className={cn(
                  "group relative rounded-2xl border border-slate-100 bg-white p-7 transition-all duration-700 hover:shadow-xl hover:-translate-y-1",
                  a.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                )}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Gradient hover glow */}
                <div className={cn("absolute -inset-[1px] rounded-2xl bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-sm", f.gradient)} />

                <div className={cn("inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white mb-4 shadow-lg", f.gradient)}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const s = useInView();

  const steps = [
    {
      num: "01",
      icon: Monitor,
      title: "강사가 세션을 생성합니다",
      desc: "수업 주제를 입력하고 참여 코드를 발급합니다.",
      color: "bg-blue-600",
    },
    {
      num: "02",
      icon: Smartphone,
      title: "수강생이 모바일로 참여합니다",
      desc: "6자리 코드를 입력하면 즉시 수업에 합류합니다.",
      color: "bg-indigo-600",
    },
    {
      num: "03",
      icon: Zap,
      title: "AI가 퀴즈를 자동 생성합니다",
      desc: "수업 주제에 맞는 코드 스니펫 퀴즈가 30초 만에 생성됩니다.",
      color: "bg-violet-600",
    },
    {
      num: "04",
      icon: BarChart3,
      title: "실시간으로 이해도가 시각화됩니다",
      desc: "응답이 들어올 때마다 히트맵이 업데이트됩니다.",
      color: "bg-purple-600",
    },
    {
      num: "05",
      icon: Brain,
      title: "AI가 강사에게 코칭합니다",
      desc: "약점 토픽과 보충 설명 전략을 실시간으로 제안합니다.",
      color: "bg-fuchsia-600",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-slate-50">
      <div className="mx-auto max-w-4xl px-5">
        <div
          ref={s.ref}
          className={cn(
            "text-center mb-16 transition-all duration-700",
            s.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600 mb-3">How it works</p>
          <h2 className="text-3xl md:text-4xl font-extrabold">
            <span className="text-blue-600">5단계</span>로 수업이 바뀝니다
          </h2>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-blue-600 via-violet-600 to-fuchsia-600 hidden sm:block" />

          <div className="space-y-8">
            {steps.map((step, i) => {
              const a = useInView();
              return (
                <div
                  key={step.num}
                  ref={a.ref}
                  className={cn(
                    "relative flex items-start gap-6 transition-all duration-700",
                    a.visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
                  )}
                  style={{ transitionDelay: `${i * 120}ms` }}
                >
                  {/* Circle */}
                  <div className={cn("relative z-10 flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-2xl text-white shadow-lg shrink-0", step.color)}>
                    <step.icon className="h-6 w-6 md:h-7 md:w-7" />
                  </div>
                  {/* Content */}
                  <div className="pt-1 md:pt-3">
                    <p className="text-xs font-bold text-slate-300 mb-1">STEP {step.num}</p>
                    <h3 className="text-lg md:text-xl font-bold mb-1">{step.title}</h3>
                    <p className="text-sm text-slate-500">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function RolesSection() {
  const s = useInView();

  const roles = [
    {
      role: "강사",
      tagline: "오늘을 본다",
      features: [
        "AI 퀴즈 자동생성으로 출제 시간 절감",
        "실시간 이해도 히트맵으로 즉각적 파악",
        "AI 코칭으로 베테랑급 수업 운영 가이드",
        "피드백 루프로 교수 개입 효과 즉시 확인",
      ],
      gradient: "from-blue-500 to-cyan-500",
      bg: "bg-blue-50",
    },
    {
      role: "수강생",
      tagline: "성장을 본다",
      features: [
        "모바일에서 즉시 퀴즈 응답",
        "뒤처지는 순간 강사가 선제적으로 도움",
        "수업 후 AI 학습 리포트 자동 생성",
        "약점 개념 + 추천 학습 경로 제공",
      ],
      gradient: "from-violet-500 to-purple-600",
      bg: "bg-violet-50",
    },
    {
      role: "원장 / 멘토",
      tagline: "내일을 막는다",
      features: [
        "학원 전체 수업 품질 대시보드",
        "3-signal 이탈 위험 자동 감지",
        "AI 상담 브리핑 자동 생성",
        "데이터 기반 HRD-Net 기관평가 증빙",
      ],
      gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-50",
    },
  ];

  return (
    <section id="roles" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div
          ref={s.ref}
          className={cn(
            "text-center mb-16 transition-all duration-700",
            s.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600 mb-3">For everyone</p>
          <h2 className="text-3xl md:text-4xl font-extrabold">
            각자의 눈으로 <span className="text-blue-600">교실을 봅니다</span>
          </h2>
          <p className="mt-3 text-slate-500">
            강사는 오늘을, 수강생은 성장을, 원장은 내일을 봅니다.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((r, i) => {
            const a = useInView();
            return (
              <div
                key={r.role}
                ref={a.ref}
                className={cn(
                  "rounded-2xl border bg-white overflow-hidden transition-all duration-700 hover:shadow-xl hover:-translate-y-1",
                  a.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                )}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {/* Header */}
                <div className={cn("p-6 bg-gradient-to-r text-white", r.gradient)}>
                  <p className="text-sm font-medium opacity-80">{r.tagline}</p>
                  <h3 className="text-2xl font-extrabold mt-1">{r.role}</h3>
                </div>
                {/* Features */}
                <div className="p-6 space-y-3">
                  {r.features.map((f) => (
                    <div key={f} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-600">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TechSection() {
  const s = useInView();

  const stacks = [
    { name: "Next.js", desc: "App Router" },
    { name: "Supabase", desc: "Auth + DB + Realtime" },
    { name: "Gemini 3 Flash", desc: "AI 퀴즈 & 코칭" },
    { name: "Vercel", desc: "Edge 배포" },
    { name: "Tailwind CSS", desc: "디자인 시스템" },
    { name: "TypeScript", desc: "Strict mode" },
  ];

  return (
    <section className="py-16 bg-slate-900 text-white">
      <div
        ref={s.ref}
        className={cn(
          "mx-auto max-w-6xl px-5 transition-all duration-700",
          s.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-2">Tech Stack</p>
            <h3 className="text-2xl font-extrabold">최신 기술로 빠르고 안전하게</h3>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {stacks.map((t) => (
              <div key={t.name} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-center">
                <p className="text-sm font-bold">{t.name}</p>
                <p className="text-xs text-slate-400">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
