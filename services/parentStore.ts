import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabaseClient';
import { Parent, ParentStudentLink, User } from '../types';

interface ParentState {
  currentParent: Parent | null;
  linkedStudents: User[];
  isParentLoading: boolean;

  // Actions
  parentLogin: (linkCode: string, password?: string) => Promise<{ success: boolean; message: string }>;
  parentLogout: () => void;
  fetchLinkedStudents: () => Promise<void>;
}

export const useParentStore = create<ParentState>()(
  persist(
    (set, get) => ({
      currentParent: null,
      linkedStudents: [],
      isParentLoading: false,

      parentLogin: async (linkCode, password) => {
        set({ isParentLoading: true });
        try {
          // 1. Tìm phụ huynh theo link_code
          const { data: parentData, error: parentErr } = await supabase
            .from('parents')
            .select('*')
            .eq('link_code', linkCode)
            .single();

          if (parentErr || !parentData) {
            return { success: false, message: 'Mã liên kết không hợp lệ hoặc không tồn tại.' };
          }

          // 2. Nếu có kiểm tra mật khẩu
          if (parentData.password && password && parentData.password !== password) {
            return { success: false, message: 'Mật khẩu không chính xác.' };
          }

          // 3. Cập nhật thời gian đăng nhập cuối
          const lastLogin = new Date().toISOString();
          await supabase.from('parents').update({ last_login_at: lastLogin }).eq('id', parentData.id);

          set({ currentParent: { ...parentData, last_login_at: lastLogin } as Parent });
          
          // Sau khi đăng nhập, load danh sách con
          await get().fetchLinkedStudents();

          return { success: true, message: 'Đăng nhập thành công.' };
        } catch (e: any) {
          console.error('Lỗi khi đăng nhập phụ huynh:', e);
          return { success: false, message: 'Lỗi hệ thống. Vui lòng thử lại sau.' };
        } finally {
          set({ isParentLoading: false });
        }
      },

      parentLogout: () => {
        set({ currentParent: null, linkedStudents: [] });
      },

      fetchLinkedStudents: async () => {
        const parent = get().currentParent;
        if (!parent) return;

        set({ isParentLoading: true });
        try {
          // Lấy danh sách liên kết
          const { data: links } = await supabase
            .from('parent_student_links')
            .select('student_id')
            .eq('parent_id', parent.id);

          if (links && links.length > 0) {
            const studentIds = links.map(l => l.student_id);
            
            // Lấy thông tin học sinh từ bảng profiles
            const { data: students } = await supabase
              .from('profiles')
              .select('*')
              .in('id', studentIds);

            if (students) {
              set({ linkedStudents: students as User[] });
            }
          } else {
            set({ linkedStudents: [] });
          }
        } catch (e) {
          console.error('Lỗi khi lấy danh sách học sinh liên kết:', e);
        } finally {
          set({ isParentLoading: false });
        }
      }
    }),
    {
      name: 'openlms-parent-storage',
      // Khi load dữ liệu từ storage lên, ta sẽ tự động fetch lại danh sách con để đảm bảo dữ liệu mới nhất
      onRehydrateStorage: (state) => {
        return (state, error) => {
          if (!error && state?.currentParent) {
            state.fetchLinkedStudents();
          }
        }
      }
    }
  )
);
