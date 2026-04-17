import React from 'react';
import { ArrowLeft, Printer, ScanLine } from 'lucide-react';

interface ParentLinkPrintProps {
  data: {
    studentName: string;
    className: string;
    code: string;
  } | Array<{
    studentName: string;
    className: string;
    code: string;
  }>;
  onBack: () => void;
}

export const ParentLinkPrint: React.FC<ParentLinkPrintProps> = ({ data, onBack }) => {
  const items = Array.isArray(data) ? data : [data];
  
  const handlePrintInfo = () => {
    window.print();
  };

  return (
  return (
    <div id="parent-print-container" className="flex-1 flex flex-col items-center bg-gray-50 overflow-y-auto w-full h-full p-4 md:p-8 relative print:p-0 print:bg-white print:overflow-visible print:block print:static">
      
      {/* Nút điều khiển không hiển thị khi in */}
      <div className="fixed top-4 left-4 right-4 flex justify-between items-center z-[100] print:hidden hide-on-print w-[calc(100%-2rem)] max-w-2xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 font-bold transition"
        >
          <ArrowLeft className="w-5 h-5" /> Quay lại
        </button>
        <button 
          onClick={handlePrintInfo}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 font-bold transition"
        >
          <Printer className="w-5 h-5" /> In phiếu
        </button>
      </div>

      <div id="printable-tickets" className="w-full max-w-2xl print:max-w-none print:w-full space-y-8 mt-16 print:mt-0 print:space-y-0">
        {items.map((item, index) => (
          <div key={index} className="bg-white border border-gray-300 shadow-lg print:shadow-none print:border-none p-8 md:p-12 font-sans relative print:p-10 print:m-0 break-after-page page-break-after-always print:min-h-screen print:flex print:flex-col print:justify-center">
            
            <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
              <h1 className="text-2xl md:text-3xl font-black uppercase text-gray-900 tracking-wide">
                THÔNG TIN KẾT NỐI PHỤ HUYNH
              </h1>
              <p className="text-gray-600 mt-2 font-medium">Hệ thống Quản lý Học tập & Liên lạc OpenLMS</p>
            </div>

            <div className="space-y-6 flex-1">
              <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl flex flex-col md:flex-row justify-between items-center print:bg-gray-50 print:border-gray-200">
                <div className="mb-4 md:mb-0">
                   <p className="text-gray-500 font-bold text-sm mb-1 uppercase tracking-wider">Học sinh</p>
                   <h2 className="text-2xl font-bold text-gray-900">{item.studentName}</h2>
                   <p className="text-gray-600 font-medium">Lớp: {item.className}</p>
                </div>
                
                <div className="bg-white p-4 border border-indigo-100 rounded-xl shadow-sm text-center min-w-[200px] print:border-indigo-100">
                   <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                     <ScanLine className="w-4 h-4" /> MÃ LIÊN KẾT
                   </p>
                   <div className="text-4xl font-black font-mono tracking-widest text-indigo-900 py-2">
                     {item.code}
                   </div>
                </div>
              </div>

              <div className="pt-6">
                 <h3 className="font-black text-lg text-gray-900 mb-4 flex items-center gap-2">
                   <span className="bg-emerald-100 text-emerald-800 w-8 h-8 rounded-full flex items-center justify-center text-sm print:bg-emerald-100">1</span> 
                   Hướng dẫn đăng nhập
                 </h3>
                 <ul className="space-y-3 font-medium text-gray-700 pl-10 list-disc">
                   <li>Truy cập đường link <b>https://open-lms-a.vercel.app/parent/login</b> (Hoặc chọn nút Cổng Phụ Huynh trên phần đăng nhập).</li>
                   <li>Nhập mã liên kết 6 ký tự viết hoa ở trên vào ô đăng nhập.</li>
                   <li>Để trống phần mật khẩu cho lần đăng nhập đầu tiên, sau đó có thể yêu cầu giáo viên cập nhật nếu cần bảo mật thêm.</li>
                 </ul>
              </div>

              <div className="pt-4">
                 <h3 className="font-black text-lg text-gray-900 mb-4 flex items-center gap-2">
                   <span className="bg-emerald-100 text-emerald-800 w-8 h-8 rounded-full flex items-center justify-center text-sm print:bg-emerald-100">2</span> 
                   Tính năng hỗ trợ
                 </h3>
                 <ul className="space-y-3 font-medium text-gray-700 pl-10 list-disc">
                   <li>Theo dõi điểm số thường xuyên, nhận xét chi tiết (Thông tư 27).</li>
                   <li>Biểu đồ lịch sử bài tập/bài kiểm tra và chi tiết tỉ lệ đúng sai.</li>
                   <li>Theo dõi điểm thái độ hành vi, cảnh báo và thành tích Arena.</li>
                 </ul>
              </div>
              
              <div className="mt-12 pt-6 border-t border-gray-200 flex justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-sm">Ngày cấp phiếu</p>
                  <p className="text-gray-600">{new Date().toLocaleDateString('vi-VN')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-sm">Chữ ký GVCN</p>
                  <br/><br/><br/>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @page {
          margin: 0;
          size: auto;
        }
        @media print {
          /* Ẩn tất cả mọi thứ trong body */
          body * {
            visibility: hidden;
            background: none !important;
          }
          /* Chỉ hiện phần cần in và các con của nó */
          #printable-tickets, #printable-tickets * {
            visibility: visible;
          }
          /* Đưa phần in lên vị trí tuyệt đối ở đầu trang */
          #printable-tickets {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
          }
          .break-after-page {
            page-break-after: always !important;
            break-after: page !important;
            display: block !important;
            width: 100% !important;
            height: 100vh !important;
          }
          /* Reset các thuộc tính ảnh hưởng đến layout in */
          html, body {
            height: auto !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
    </div>
  );
};
