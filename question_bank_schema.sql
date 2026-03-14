-- Create Question Bank table
CREATE TABLE IF NOT EXISTS public.question_bank (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    options JSONB,
    correctOptionIndex INTEGER,
    solution TEXT,
    hint TEXT,
    imageUrl TEXT,
    level TEXT,
    subject TEXT,
    grade TEXT,
    topic TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    teacher_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can see all questions in bank" 
ON public.question_bank FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Teachers can insert questions" 
ON public.question_bank FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Users can update/delete their own questions or if they are admin" 
ON public.question_bank FOR ALL 
TO authenticated 
USING (
    auth.uid()::text = teacher_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
);
