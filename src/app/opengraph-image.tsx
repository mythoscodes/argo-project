import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Argos — AI 실시간 수업 분석 플랫폼";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #ec4899 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          color: "white",
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 800, letterSpacing: -2 }}>
          Argos
        </div>
        <div style={{ fontSize: 32, opacity: 0.9, marginTop: 8 }}>
          100개의 눈으로 교실을 본다
        </div>
        <div
          style={{
            fontSize: 20,
            opacity: 0.7,
            marginTop: 24,
            display: "flex",
            gap: 16,
          }}
        >
          <span>AI 퀴즈 자동생성</span>
          <span>|</span>
          <span>실시간 이해도 분석</span>
          <span>|</span>
          <span>AI 강사 코칭</span>
        </div>
        <div style={{ fontSize: 16, opacity: 0.5, marginTop: 40 }}>
          2026 KIT 바이브코딩 공모전 — Team mythos
        </div>
      </div>
    ),
    { ...size }
  );
}
