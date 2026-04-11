import { Page } from '@playwright/test';

/**
 * AI API 엔드포인트를 스텁 응답으로 대체한다.
 * 실제 Gemini 호출을 우회하여 테스트 속도를 높이고 결정론적 응답을 보장한다.
 *
 * 커버리지: /api/ai/quiz, /api/ai/analysis, /api/ai/coaching,
 *           /api/ai/report, /api/ai/mentor-briefing
 */
export function stubAiRoutes(page: Page): void {
  page.route('/api/ai/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/api/ai/quiz')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'stub-q1',
              question: 'JPA(Java Persistence API)의 주요 역할은?',
              options: {
                A: 'DB와 객체 매핑',
                B: '네트워크 통신',
                C: 'UI 렌더링',
                D: '빌드 도구',
              },
              correct_answer: 'A',
              topic: 'JPA',
              round_number: 1,
            },
          ],
        }),
      });
    } else if (url.includes('/api/ai/analysis')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            understanding_scores: { JPA: 75 },
            weak_topics: [],
          },
        }),
      });
    } else if (url.includes('/api/ai/coaching')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            coaching_suggestion: 'JPA 엔티티 생명주기를 그림으로 다시 설명해보세요.',
            understanding_scores: { JPA: 75 },
            weak_topics: [],
            created_at: new Date().toISOString(),
          },
        }),
      });
    } else if (url.includes('/api/ai/report')) {
      // GET: { data: { reports: [] } } / POST: { data: { report } }
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { reports: [] } }),
        });
      } else {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              overall_score: 75,
              summary: '스텁 리포트 — Gemini 호출 없이 생성된 테스트 데이터입니다.',
              topic_results: [{ topic: 'JPA', score: 75, feedback: '양호' }],
              weak_topics: [],
              recommendations: ['JPA 심화 학습'],
              encouragement: '잘 하고 있습니다!',
            },
          }),
        });
      }
    } else if (url.includes('/api/ai/mentor-briefing')) {
      // POST: { data: { talking_points, weakness_analysis, recommended_strategy, recommended_courses } }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            talking_points: ['JPA 이해도 확인', '학습 목표 재설정'],
            weakness_analysis: '스텁 약점 분석 데이터입니다.',
            recommended_strategy: '1:1 집중 지도 권장',
            recommended_courses: ['Spring Boot 심화'],
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}
