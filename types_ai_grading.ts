import { Question, Attempt } from './types'; // Or whatever path you need for existing types
// Nếu cần liên kết với Student/Class/Teacher hiện có, hãy đảm bảo ID khớp kiểu (thường là string/uuid).

/**
 * Represent a submission consisting of image/pdf uploaded by Student/Teacher
 * and stored specifically in the EXTERNAL storage to save the Main DB's space.
 */
export interface AISubmission {
    id: string;                         // UUID
    student_id: string;                 // Lien ket voi bang students
    class_id: string;                   // Lien ket voi bang classes
    teacher_id: string;                 // Giao vien quan ly cham bai
    exam_id?: string;                   // Optional: Link to a specific exam or assignment

    title: string;                      // Vd: "BTVN Đạo Hàm Tuần 2" (Bắt buộc)
    category: string;                   // Vd: "Bài Tập Nhà", "Kiểm tra 15p" (Bắt buộc)

    external_file_url: string;          // Duong link anh tu External Supabase
    file_type: 'image' | 'pdf';         // Loai file

    status: 'pending' | 'graded';       // Trang thai cham (Moi Nop / Da Cham)
    created_at: string;                 // Thoi gian nop
}

/**
 * Represents the AI generated review corresponding to a submission.
 */
export interface AIGradingReview {
    id: string;                         // UUID
    submission_id: string;              // Lien ket bang submissions
    teacher_id: string;                 // Giao vien xac nhan vao ban danh gia nay

    // Phan danh gia bang chu
    advantages: string;                 // Uu diem
    limitations: string;                // Han che
    improvements: string;               // Huong cai thien

    // Phan Diem so (Optional)
    score_optional?: number;            // Diem so de xuat hoac duoc giao vien luu lai (0-100)

    custom_ai_prompt?: string;          // Giao vien da chi dao AI dieu gi (VD: "Tim loi chinh ta")
    raw_ai_response?: string;           // JSON goc tu tra loi cua AI (de fix loi neu can)

    is_published_to_student: boolean;   // HS da duoc phep xem chua
    updated_at: string;                 // Thoi gian danh gia
}
