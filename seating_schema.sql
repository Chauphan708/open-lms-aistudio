-- Bảng lưu trữ sơ đồ lớp học
CREATE TABLE public.class_seating_charts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    rows INTEGER NOT NULL DEFAULT 5,
    columns INTEGER NOT NULL DEFAULT 5,
    seats JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { row, col, studentId }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id)
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_class_seating_charts_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_class_seating_charts_updated_at
BEFORE UPDATE ON public.class_seating_charts
FOR EACH ROW
EXECUTE FUNCTION update_class_seating_charts_modtime();

-- RLS (Row Level Security) (Nếu có)
ALTER TABLE public.class_seating_charts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read access" ON public.class_seating_charts FOR SELECT USING (true);
CREATE POLICY "Allow all insert access" ON public.class_seating_charts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update access" ON public.class_seating_charts FOR UPDATE USING (true);
CREATE POLICY "Allow all delete access" ON public.class_seating_charts FOR DELETE USING (true);
