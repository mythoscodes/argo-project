# 보안 규칙

## 환경변수 분류

### 서버 전용 (NEXT_PUBLIC_ 접두사 절대 금지)
```
GOOGLE_GENERATIVE_AI_API_KEY   # Gemini API
ANTHROPIC_API_KEY              # Claude API (옵션 B/C)
SUPABASE_SERVICE_ROLE_KEY      # Supabase 관리자
```

### 클라이언트 허용 (NEXT_PUBLIC_ 접두사 사용)
```
NEXT_PUBLIC_SUPABASE_URL       # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase 익명 키 (RLS로 보호)
NEXT_PUBLIC_APP_URL            # 앱 URL
```

### 위반 감지 체크리스트
- [ ] `NEXT_PUBLIC_GOOGLE` 또는 `NEXT_PUBLIC_ANTHROPIC` 패턴이 코드에 있으면 즉시 제거
- [ ] 클라이언트 컴포넌트(`'use client'`)에서 `process.env.GOOGLE_*` 접근 시 빌드 에러
- [ ] `.env.local`이 `git status`에 나타나면 커밋 전 반드시 확인

## Supabase RLS 정책 템플릿

### 기본 정책 — 학원 단위 격리
```sql
-- 모든 테이블에 적용하는 기본 RLS 패턴
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- 같은 학원 소속만 조회
CREATE POLICY "{table_name}_select_own_academy"
  ON {table_name} FOR SELECT
  USING (
    academy_id IN (
      SELECT academy_id FROM profiles
      WHERE id = auth.uid()
    )
  );

-- 같은 학원 소속 + 적절한 역할만 삽입
CREATE POLICY "{table_name}_insert_own_academy"
  ON {table_name} FOR INSERT
  WITH CHECK (
    academy_id IN (
      SELECT academy_id FROM profiles
      WHERE id = auth.uid()
    )
  );
```

### 역할별 접근 제어
```sql
-- 강사만 세션 생성 가능
CREATE POLICY "sessions_insert_teacher_only"
  ON sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- 수강생은 본인 리포트만 조회
CREATE POLICY "student_reports_select_own"
  ON student_reports FOR SELECT
  USING (student_id = auth.uid());
```

## API Route 보안 패턴

### 인증 확인 필수
```typescript
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 역할 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // ... 로직
}
```

### 입력 검증 필수
```typescript
import { z } from 'zod'

const createSessionSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().min(1).max(100),
  course_category: z.enum([
    'programming', 'security', 'network',
    'data_science', 'ai_development', 'ai_software'
  ]),
  topics: z.array(z.string()).min(1).max(10),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createSessionSchema.safeParse(body)
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  
  // parsed.data는 타입 안전
}
```

## 금지 패턴

### 절대 하지 말 것
```typescript
// X — 클라이언트에서 AI API 직접 호출
'use client'
const response = await fetch('https://generativelanguage.googleapis.com/...')

// X — 하드코딩된 키
const apiKey = 'AIza...'

// X — SQL 인젝션 취약
const { data } = await supabase.rpc('query', { sql: `SELECT * WHERE name = '${userInput}'` })

// X — RLS 없는 서비스 롤 키 클라이언트 노출
const supabase = createClient(url, serviceRoleKey)  // 서버에서만!

// X — 민감 데이터 console.log
console.log('user data:', userData)
```
