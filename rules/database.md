# 데이터베이스 규칙

## 스키마 설계 원칙

### 테이블 생성 필수 사항
1. 모든 테이블에 `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
2. 모든 테이블에 `created_at TIMESTAMPTZ DEFAULT NOW()`
3. 수정 가능한 테이블에 `updated_at TIMESTAMPTZ DEFAULT NOW()` + 트리거
4. 멀티테넌시 테이블에 `academy_id UUID NOT NULL REFERENCES academies(id)`
5. **RLS 활성화를 같은 마이그레이션에 포함** — 테이블만 만들고 RLS 빼먹지 않는다

### updated_at 자동 갱신 트리거
```sql
-- 최초 마이그레이션에 1회 생성
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 적용
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON {table_name}
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

## 핵심 테이블 (9개) — 스키마 명세

### 1. academies
```sql
CREATE TABLE academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  branch_code TEXT UNIQUE,          -- KIT 지점: 'KIT-GN', 'KIT-SC' 등
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'premium')),
  max_students INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES academies(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'teacher', 'student')),
  display_name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. sessions
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  academy_id UUID NOT NULL REFERENCES academies(id),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  course_category TEXT CHECK (course_category IN (
    'programming', 'security', 'network',
    'data_science', 'ai_development', 'ai_software'
  )),
  topics JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  join_code TEXT UNIQUE,            -- 6자리 참여 코드
  anonymous_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);
```

### 4. session_participants
```sql
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);
```

### 5. quizzes
```sql
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN (
    'multiple_choice', 'true_false',
    'code_output', 'find_bug', 'fill_blank'
  )),
  code_snippet TEXT,                -- 코드 블록 (nullable)
  code_language TEXT,               -- 프로그래밍 언어
  options JSONB NOT NULL,           -- [{label, text, is_misconception?, misconception?}]
  correct_answer TEXT NOT NULL,
  topic_tag TEXT NOT NULL,          -- 개념 태그
  misconception_tags JSONB,         -- 예상 오개념 태그 배열
  round_number INTEGER DEFAULT 1,  -- 재측정 라운드
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6. responses
```sql
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id),
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER,         -- 응답 시간 (밀리초)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quiz_id, student_id, round_number)
);
-- round_number는 quizzes 테이블에서 JOIN으로 가져옴
```

### 7. analysis_results
```sql
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('realtime', 'post_session')),
  understanding_scores JSONB,       -- {topic: score} 형태
  weak_topics JSONB,                -- 취약 개념 배열
  misconception_clusters JSONB,     -- 오개념 클러스터
  coaching_suggestion TEXT,         -- AI 코칭 제안 텍스트
  full_report TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8. student_reports
```sql
CREATE TABLE student_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  academy_id UUID NOT NULL REFERENCES academies(id),
  session_id UUID REFERENCES sessions(id),
  report_type TEXT NOT NULL CHECK (report_type IN ('session', 'weekly', 'cumulative')),
  understanding_summary JSONB,      -- 개념별 이해도
  weak_topics JSONB,                -- 약점 목록
  recommendations TEXT,             -- AI 추천 학습 영역
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 9. plan_features
```sql
CREATE TABLE plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan TEXT NOT NULL CHECK (plan IN ('free', 'basic', 'premium')),
  feature_key TEXT NOT NULL,        -- 'max_quizzes_per_month', 'ai_coaching' 등
  feature_value JSONB NOT NULL,     -- {enabled: true, limit: 10} 등
  UNIQUE(plan, feature_key)
);
```

## 인덱스 전략
```sql
-- 자주 조회되는 FK에 인덱스
CREATE INDEX idx_sessions_academy ON sessions(academy_id);
CREATE INDEX idx_sessions_teacher ON sessions(teacher_id);
CREATE INDEX idx_sessions_join_code ON sessions(join_code);
CREATE INDEX idx_responses_session ON responses(session_id);
CREATE INDEX idx_responses_quiz ON responses(quiz_id);
CREATE INDEX idx_quizzes_session ON quizzes(session_id);
CREATE INDEX idx_student_reports_student ON student_reports(student_id);
CREATE INDEX idx_profiles_academy ON profiles(academy_id);
```

## 마이그레이션 규칙
- 파일명: `NNNNN_description.sql` (예: `00001_initial_schema.sql`)
- 하나의 마이그레이션에 관련 테이블 + RLS + 인덱스를 모두 포함
- 롤백 SQL은 주석으로 상단에 기재
- 데이터 삭제/변경 마이그레이션은 반드시 백업 확인 후 실행

## 시드 데이터 규칙
- `supabase/seed.sql`에 데모 시나리오 데이터 포함
- Python 반복문 수업 (PLANNING.md 5장 데모 시나리오 기반)
- 강사 1명, 수강생 5명(비전공자 3 + 경력자 2), 퀴즈 5문항, 응답 25건
- 충분한 데이터로 히트맵이 의미 있게 표시되도록
