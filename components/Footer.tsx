
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Facebook, 
  Phone, 
  Mail, 
  MapPin, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Globe,
  MessageSquare,
  Trophy,
  BookOpen,
  Bot
} from 'lucide-react';
import { useStore } from '../store';

const Footer: React.FC = () => {
  const { siteSettings } = useStore();

  const currentYear = new Date().getFullYear();

  // Fallback defaults if siteSettings is null
  const slogan = siteSettings?.slogan || "Nâng tầm giáo dục số Việt Nam";
  const hotline = siteSettings?.hotline || "1900 xxxx";
  const email = siteSettings?.email || "support@openlms.vn";
  const facebook = siteSettings?.facebook || "#";
  const zalo = siteSettings?.zalo || "#";
  const address = siteSettings?.address || "TP. Cần Thơ, Việt Nam";

  return (
    <footer className="bg-white border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Column 1: Brand & Intro */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 font-bold text-2xl text-indigo-600">
              <div className="bg-indigo-600 p-1.5 rounded-lg shadow-md shadow-indigo-100">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="tracking-tight">OpenLMS</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              {slogan}
            </p>
            <div className="flex gap-4">
              <a 
                href={facebook} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href={zalo} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm font-bold text-xs"
              >
                Zalo
              </a>
            </div>
          </div>

          {/* Column 2: Core Features */}
          <div>
            <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-500" /> Dịch vụ
            </h4>
            <ul className="space-y-4">
              <li>
                <Link to="/exams" className="text-gray-500 hover:text-indigo-600 text-sm flex items-center gap-2 group transition-colors">
                  <BookOpen className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  Kho Đề KT & Nhiệm vụ
                </Link>
              </li>
              <li>
                <Link to="/question-bank" className="text-gray-500 hover:text-indigo-600 text-sm flex items-center gap-2 group transition-colors">
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  Ngân hàng Câu hỏi
                </Link>
              </li>
              <li>
                <Link to="/teacher/ai-grading" className="text-gray-500 hover:text-indigo-600 text-sm flex items-center gap-2 group transition-colors">
                  <Bot className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  Chấm bài AI
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Community */}
          <div>
            <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Globe className="h-4 w-4 text-indigo-500" /> Cộng đồng
            </h4>
            <ul className="space-y-4">
              <li>
                <Link to="/arena" className="text-gray-500 hover:text-indigo-600 text-sm flex items-center gap-2 group transition-colors">
                  <Trophy className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  Đấu trường trí tuệ
                </Link>
              </li>
              <li>
                <Link to="/teacher/discussions" className="text-gray-500 hover:text-indigo-600 text-sm flex items-center gap-2 group transition-colors">
                  <MessageSquare className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  Thảo luận giáo viên
                </Link>
              </li>
              <li>
                <Link to="/resources" className="text-gray-500 hover:text-indigo-600 text-sm flex items-center gap-2 group transition-colors">
                  <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  Kho Tài liệu mở
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Phone className="h-4 w-4 text-indigo-500" /> Hỗ trợ & Liên hệ
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Hotline</p>
                  <p className="text-sm font-bold text-gray-700">{hotline}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Email</p>
                  <p className="text-sm font-bold text-gray-700">{email}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Địa chỉ</p>
                  <p className="text-sm font-bold text-gray-700">{address}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400 text-xs font-medium">
          <p>© {currentYear} OpenLMS. All rights reserved.</p>
          <div className="flex gap-8">
            <Link to="#" className="hover:text-indigo-600 transition-colors">Chính sách bảo mật</Link>
            <Link to="#" className="hover:text-indigo-600 transition-colors">Điều khoản dịch vụ</Link>
            <Link to="#" className="hover:text-indigo-600 transition-colors">Trợ giúp</Link>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span>Hệ thống hoạt động bình thường</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
