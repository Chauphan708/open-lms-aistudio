-- Drop table if exists to recreate with correct schema
DROP TABLE IF EXISTS public.question_bank;

-- Create Question Bank table with snake_case columns for Supabase consistency
CREATE TABLE public.question_bank (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    options JSONB,
    correct_option_index INTEGER,
    solution TEXT,
    hint TEXT,
    image_url TEXT,
    level TEXT,
    subject TEXT,
    grade TEXT,
    topic TEXT,
    is_arena_eligible BOOLEAN DEFAULT FALSE,
    teacher_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- Create policies (Keep them simple for now)
CREATE POLICY "Users can see all questions" ON public.question_bank FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert questions" ON public.question_bank FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update/delete their own" ON public.question_bank FOR ALL TO authenticated 
USING (
    auth.uid()::text = teacher_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
);
