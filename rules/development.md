# 개발 규칙

## API Route 패턴
```typescript
// src/app/api/example/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('table').select()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data })
}
```

## AI API Route 패턴
```typescript
// src/app/api/ai/quiz/route.ts
import { getModel } from '@/lib/ai/model'
import { generateText } from 'ai'
import { quizSchema } from '@/lib/ai/schemas/quiz'
import { quizPrompt } from '@/lib/ai/prompts/quiz-generation'

export async function POST(req: NextRequest) {
  const { topic, language, difficulty } = await req.json()
  const model = getModel('quiz')  // 환경변수 기반 모델 선택
  
  const { text } = await generateText({
    model,
    prompt: quizPrompt(topic, language, difficulty),
  })
  
  const parsed = quizSchema.safeParse(JSON.parse(text))
  if (!parsed.success) {
    // 1회 재시도
    const { text: retry } = await generateText({ model, prompt: quizPrompt(topic, language, difficulty) })
    const retryParsed = quizSchema.safeParse(JSON.parse(retry))
    if (!retryParsed.success) return NextResponse.json({ error: 'AI 응답 파싱 실패' }, { status: 500 })
    return NextResponse.json({ data: retryParsed.data })
  }
  return NextResponse.json({ data: parsed.data })
}
```

## Supabase Realtime 구독 패턴
```typescript
// src/hooks/use-realtime.ts
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeResponses(sessionId: string) {
  const [responses, setResponses] = useState<Response[]>([])
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'responses',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setResponses(prev => [...prev, payload.new as Response])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  return responses
}
```

## 모델 전환 패턴
```typescript
// src/lib/ai/model.ts
import { google } from '@ai-sdk/google'
import { anthropic } from '@ai-sdk/anthropic'

const models = {
  'gemini-3-flash': () => google('gemini-3-flash'),
  'claude-sonnet': () => anthropic('claude-sonnet-4-6'),
} as const

export function getModel(purpose?: 'quiz' | 'coaching' | 'analysis' | 'report') {
  // 하이브리드 모드: 기능별 모델 분리
  if (purpose) {
    const envKey = `AI_MODEL_${purpose.toUpperCase()}`
    const modelName = process.env[envKey]
    if (modelName && modelName in models) {
      return models[modelName as keyof typeof models]()
    }
  }
  // 기본 모드: 단일 모델
  const defaultModel = process.env.AI_MODEL || 'gemini-3-flash'
  return models[defaultModel as keyof typeof models]()
}
```
