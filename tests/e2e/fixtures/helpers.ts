import { Page } from '@playwright/test';

/**
 * AI API 엔드포인트를 스텁 응답으로 대체한다.
 * 실제 Gemini 호출을 우회하여 테스트 속도를 높이고 결정론적 응답을 보장한다.
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
    } else {
      await route.continue();
    }
  });
}
