// AI 설정
export const AI_TEMPERATURE_QUIZ = 0.3;
export const AI_TEMPERATURE_COACHING = 0.5;
export const AI_TEMPERATURE_REPORT = 0.5;
export const AI_MAX_RETRY_COUNT = 1;

// 퀴즈 설정
export const MAX_QUIZ_COUNT = 5;
export const MIN_QUIZ_COUNT = 1;
export const DEFAULT_QUIZ_COUNT = 5;
export const SHORT_ANSWER_COUNT = 2; // 주관식 문제 수

// 세션 설정
export const SESSION_CODE_LENGTH = 6;

// 이해도 분석 설정
export const WEAK_TOPIC_THRESHOLD = 60; // 정답률 60% 이하를 약점 토픽으로 분류

// 멘토 이탈 위험 감지 설정 (3-signal composite)
export const RISK_ACCURACY_THRESHOLD = 40; // 최근 3세션 정답률 이 값 미만이면 신호 발동
export const RISK_ACCURACY_SESSION_COUNT = 3; // 정답률 판단 기준 세션 수
export const RISK_ABSENCE_THRESHOLD = 2; // 연속 미참여 이 값 이상이면 신호 발동
export const RISK_SIGNAL_COUNT_FOR_HIGH = 2; // 이 값 이상 신호 → 위험(HIGH)
export const AI_TEMPERATURE_MENTOR_BRIEFING = 0.5; // 멘토 브리핑은 리포트와 동일
export const RISK_SPEED_INCREASE_RATIO = 1.3; // 응답 속도 이 비율 이상 증가 시 신호 발동 (30%)

// 대시보드 설정
export const RESPONSE_RATE_THRESHOLD = 50; // 응답률 이 비율 미만이면 이탈 위험으로 분류
