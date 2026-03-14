-- ==========================================
-- SCRIPT KHỞI TẠO LẠI NGÂN HÀNG CÂU HỎI (BẢN VÁ RLS)
-- ==========================================

-- 1. Bật extension UUID
create extension if not exists "uuid-ossp";

-- 2. Xóa sạch bảng cũ
DROP TABLE IF EXISTS public.question_bank CASCADE;

-- 3. Tạo lại bảng
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
    teacher_id TEXT, -- Bỏ tạm REFERENCES để debug nếu cần, hoặc giữ nếu chắc chắn profiles id khớp
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bật RLS
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- 5. Tạo các chính sách bảo mật (Tên mới hoàn toàn để tránh cache)
-- Cho phép mọi người XEM
CREATE POLICY "allow_view_v1" ON public.question_bank FOR SELECT USING (true);

-- Cho phép người dùng đã đăng nhập THÊM (Nới lỏng tối đa để Sync hoạt động)
CREATE POLICY "allow_insert_v1" ON public.question_bank FOR INSERT TO authenticated WITH CHECK (true);

-- Cho phép SỬA/XÓA (Chỉ chủ sở hữu hoặc quản trị viên)
CREATE POLICY "allow_manage_v1" ON public.question_bank FOR ALL TO authenticated 
USING (
    auth.uid()::text = teacher_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
);
