import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { Loader2, Key, Printer, CheckCircle, Plus } from 'lucide-react';
import { ParentLinkPrint } from './ParentLinkPrint';

interface ParentLinkData {
  student_id: string;
  parent_id: string;
  name: string;
  phone?: string;
  link_code: string;
  is_active: boolean; // Có mật khẩu/sdt -> đã đăng nhập
}

interface ClassParentTabProps {
  classId: string;
  students: User[];
  teacherId: string;
}

export const ClassParentTab: React.FC<ClassParentTabProps> = ({ classId, students, teacherId }) => {
  const [links, setLinks] = useState<Record<string, ParentLinkData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [printData, setPrintData] = useState<any>(null); // Dữ liệu để in

  useEffect(() => {
    fetchLinks();
  }, [classId, students]);

  const fetchLinks = async () => {
    if (students.length === 0) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const studentIds = students.map(s => s.id);
      
      // Lấy link
      const { data: linkData } = await supabase
        .from('parent_student_links')
        .select('*')
        .in('student_id', studentIds);

      if (linkData && linkData.length > 0) {
        const parentIds = linkData.map(l => l.parent_id);
        
        // Lấy thông tin parent
        const { data: parents } = await supabase
          .from('parents')
          .select('*')
          .in('id', parentIds);

        const newLinks: Record<string, ParentLinkData> = {};
        
        linkData.forEach(link => {
          const parent = parents?.find(p => p.id === link.parent_id);
          if (parent) {
            newLinks[link.student_id] = {
              student_id: link.student_id,
              parent_id: parent.id,
              name: parent.name,
              phone: parent.phone,
              link_code: parent.link_code,
              is_active: !!parent.password || !!parent.phone // Đã thiết lập thông tin
            };
          }
        });
        
        setLinks(newLinks);
      } else {
        setLinks({});
      }
    } catch (e) {
      console.error('Lỗi khi lấy dữ liệu phụ huynh:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const generateLinkCode = async (student: User) => {
    setIsGenerating(true);
    try {
      // Sinh mã ngẫu nhiên 6 ký tự
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const parentId = `parent_${Date.now()}_${Math.floor(Math.random()*1000)}`;
      
      // 1. Tạo account ẩn danh trong parents
      await supabase.from('parents').insert({
        id: parentId,
        name: `Phụ huynh của ${student.name}`,
        link_code: code,
        created_at: new Date().toISOString()
      });

      // 2. Tạo link
      await supabase.from('parent_student_links').insert({
        id: `plink_${Date.now()}`,
        parent_id: parentId,
        student_id: student.id,
        linked_by: teacherId,
        created_at: new Date().toISOString()
      });

      // Cập nhật state
      setLinks(prev => ({
        ...prev,
        [student.id]: {
          student_id: student.id,
          parent_id: parentId,
          name: `Phụ huynh của ${student.name}`,
          link_code: code,
          is_active: false
        }
      }));

    } catch (e) {
      console.error('Lỗi khi tạo mã liên kết:', e);
      alert('Có lỗi xảy ra khi tạo mã. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = (student: User, linkData: ParentLinkData) => {
    setPrintData({
      studentName: student.name,
      className: student.className || '...', // Có thể truyền thêm từ ClassManage
      code: linkData.link_code
    });
  };

  if (printData) {
    return <ParentLinkPrint data={printData} onBack={() => setPrintData(null)} />;
  }

  return (
    <div className="p-4 flex-1 min-h-0 flex flex-col bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-800">Quản lý Phụ Huynh Lớp</h3>
        <button 
          onClick={fetchLinks}
          className="text-indigo-600 text-sm font-medium hover:underline"
        >
          Làm mới
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-auto shadow-sm flex-1 min-h-0">
          <table className="w-full text-left border-collapse relative">
            <thead>
              <tr className="bg-gray-50 border-b sticky top-0 z-10">
                <th className="p-3 text-sm font-bold text-gray-600 bg-gray-50">Học sinh</th>
                <th className="p-3 text-sm font-bold text-gray-600 bg-gray-50">Trạng thái PH</th>
                <th className="p-3 text-sm font-bold text-gray-600 bg-gray-50">Mã liên kết</th>
                <th className="p-3 text-sm font-bold text-gray-600 text-right bg-gray-50">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map(student => {
                const link = links[student.id];
                
                return (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-gray-900">{student.name}</div>
                      <div className="text-xs text-gray-500">{student.email}</div>
                    </td>
                    <td className="p-3">
                      {link ? (
                        link.is_active ? (
                          <span className="flex items-center gap-1 text-sm font-bold text-emerald-600">
                            <CheckCircle className="w-4 h-4" /> Đã tham gia
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-amber-600">Chờ kích hoạt</span>
                        )
                      ) : (
                        <span className="text-sm text-gray-400 font-medium">Chưa liên kết</span>
                      )}
                    </td>
                    <td className="p-3">
                      {link ? (
                        <span className="bg-gray-100 text-gray-800 font-mono px-2 py-1 rounded font-bold tracking-wider">
                          {link.link_code}
                        </span>
                      ) : (
                         <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {link ? (
                        <button 
                          onClick={() => handlePrint(student, link)}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-lg hover:bg-indigo-100 flex items-center justify-end gap-2 ml-auto"
                        >
                          <Printer className="w-4 h-4" /> In phiếu
                        </button>
                      ) : (
                        <button 
                          disabled={isGenerating}
                          onClick={() => generateLinkCode(student)}
                          className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 flex items-center justify-end gap-2 ml-auto disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" /> Tạo mã
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {students.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    Chưa có học sinh nào trong lớp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
