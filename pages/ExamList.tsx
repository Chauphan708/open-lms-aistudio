import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, FileText, ChevronRight, Send, Radio, Search, Filter, Calendar, BookOpen, GraduationCap, X, Layers, BarChart3, HelpCircle, LineChart } from 'lucide-react';
import { AssignModal } from '../components/AssignModal';
import { Exam, LiveSession, QuestionType, ExamDifficulty } from '../types';

export const ExamList: React.FC = () => {
  const { exams, assignments, user, classes, createLiveSession } = useStore();
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const navigate = useNavigate();

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterDuration, setFilterDuration] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterQuestionType, setFilterQuestionType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const subjects = useMemo(() => Array.from(new Set(exams.map(e => e.subject).filter(Boolean))), [exams]);
  const grades = useMemo(() => Array.from(new Set(exams.map(e => e.grade).filter(Boolean))).sort((a, b) => Number(a) - Number(b)), [exams]);

  const handleOpenAssign = (exam: Exam) => {
    setSelectedExam(exam);
    setAssignModalOpen(true);
  };

  const handleHostLive = (exam: Exam) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6 digit PIN
    const newSession: LiveSession = {
      id: pin,
      examId: exam.id,
      teacherId: user?.id || '',
      status: 'WAITING',
      participants: [],
      createdAt: new Date().toISOString()
    };
    createLiveSession(newSession);
    navigate(`/live/host/${pin}`);
  };

  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = filterSubject ? exam.subject === filterSubject : true;
      const matchesGrade = filterGrade ? exam.grade === filterGrade : true;
      const matchesDate = filterDate ? exam.createdAt.startsWith(filterDate) : true;
      const matchesDifficulty = filterDifficulty ? exam.difficulty === filterDifficulty : true;

      let matchesDuration = true;
      if (filterDuration) {
        if (filterDuration === '<15') matchesDuration = exam.durationMinutes < 15;
        else if (filterDuration === '15-45') matchesDuration = exam.durationMinutes >= 15 && exam.durationMinutes <= 45;
        else if (filterDuration === '>45') matchesDuration = exam.durationMinutes > 45;
      }

      let matchesType = true;
      if (filterQuestionType) {
        // Check if any question in exam matches the selected type
        matchesType = exam.questions.some(q => q.type === filterQuestionType);
      }

      return matchesSearch && matchesSubject && matchesGrade && matchesDate && matchesDuration && matchesDifficulty && matchesType;
    });
  }, [exams, searchTerm, filterSubject, filterGrade, filterDate, filterDuration, filterDifficulty, filterQuestionType]);

  const getDifficultyLabel = (diff: ExamDifficulty | undefined) => {
    switch (diff) {
      case 'LEVEL_1': return { label: 'Mức 1', color: 'bg-green-100 text-green-700' };
      case 'LEVEL_2': return { label: 'Mức 2', color: 'bg-yellow-100 text-yellow-700' };
      case 'LEVEL_3': return { label: 'Mức 3', color: 'bg-red-100 text-red-700' };
      default: return { label: 'Khác', color: 'bg-gray-100 text-gray-500' };
    }
  };

  // --- STUDENT VIEW: Show Assignments ---
  if (user?.role === 'STUDENT') {
    // 1. Get student's classes
    const myClassIds = classes
      .filter(c => c.studentIds.includes(user.id))
      .map(c => c.id);

    // 2. Filter assignments for these classes
    const myAssignments = assignments
      .filter(a => myClassIds.includes(a.classId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Bài tập & Thi cử</h1>
          <Link to="/live/join" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 flex items-center gap-2 whitespace-nowrap">
            <Radio className="h-4 w-4" /> Nhập mã PIN (Thi Live)
          </Link>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {myAssignments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Bạn chưa có bài tập nào được giao.
            </div>
          ) : (
            <div className="divide-y">
              {myAssignments.map((assign) => {
                const exam = exams.find(e => e.id === assign.examId);
                const cls = classes.find(c => c.id === assign.classId);
                if (!exam) return null;

                // Check Time
                const now = new Date();
                const start = assign.startTime ? new Date(assign.startTime) : null;
                const end = assign.endTime ? new Date(assign.endTime) : null;

                const isUpcoming = start && now < start;
                const isExpired = end && now > end;
                const isAvailable = !isUpcoming && !isExpired;

                return (
                  <div key={assign.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex gap-4">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0
                        ${isAvailable ? 'bg-indigo-500' : isUpcoming ? 'bg-yellow-500' : 'bg-gray-400'}
                      `}>
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{exam.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {assign.durationMinutes || exam.durationMinutes} phút
                          </span>
                          <span>• Lớp {cls?.name}</span>
                          {assign.endTime && (
                            <span className={isExpired ? 'text-red-500 font-medium' : ''}>
                              • Hạn chót: {new Date(assign.endTime).toLocaleString('vi-VN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAvailable ? (
                      <Link
                        to={`/exam/${exam.id}/take?assign=${assign.id}`}
                        className="flex items-center justify-center gap-1 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm whitespace-nowrap"
                      >
                        Làm bài ngay <ChevronRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <button disabled className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-400 rounded-lg whitespace-nowrap">
                        {isUpcoming ? 'Chưa mở' : 'Đã kết thúc'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- TEACHER / ADMIN VIEW: Show Question Bank + Assign Button ---
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Ngân hàng đề thi</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Tìm kiếm đề thi..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900 text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white hover:bg-gray-50'}`}
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-5 rounded-xl border shadow-sm mb-6 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* 1. Subject */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Môn học</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {/* 2. Grade */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Khối lớp</label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  {grades.map(g => <option key={g} value={g}>Lớp {g}</option>)}
                </select>
              </div>
            </div>
            {/* 3. Difficulty */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Mức độ</label>
              <div className="relative">
                <BarChart3 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  <option value="LEVEL_1">Mức 1</option>
                  <option value="LEVEL_2">Mức 2</option>
                  <option value="LEVEL_3">Mức 3</option>
                </select>
              </div>
            </div>
            {/* 4. Duration */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Thời gian</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterDuration} onChange={e => setFilterDuration(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  <option value="<15">&lt; 15 phút</option>
                  <option value="15-45">15 - 45 phút</option>
                  <option value=">45">&gt; 45 phút</option>
                </select>
              </div>
            </div>
            {/* 5. Question Type */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Loại câu hỏi</label>
              <div className="relative">
                <HelpCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterQuestionType} onChange={e => setFilterQuestionType(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  <option value="MCQ">Trắc nghiệm (4 LC)</option>
                  <option value="MATCHING">Nối cột</option>
                  <option value="ORDERING">Sắp xếp</option>
                  <option value="SHORT_ANSWER">Tự luận</option>
                </select>
              </div>
            </div>
            {/* 6. Date */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Ngày tạo</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <input
                  type="date"
                  value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 border rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t flex justify-end">
            <button
              onClick={() => {
                setFilterSubject(''); setFilterGrade(''); setFilterDate('');
                setSearchTerm(''); setFilterDuration(''); setFilterDifficulty(''); setFilterQuestionType('');
              }}
              className="text-xs text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <X className="h-3 w-3" /> Xóa bộ lọc
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {filteredExams.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Không tìm thấy đề thi nào.</p>
            <p className="text-sm">Thử thay đổi bộ lọc hoặc tạo đề mới.</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredExams.map((exam) => (
              <div key={exam.id} className="p-5 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between group gap-4">
                <div className="flex gap-4">
                  <div className="h-14 w-14 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col items-center justify-center text-indigo-700 flex-shrink-0">
                    <span className="text-xs font-bold uppercase">{exam.grade ? `Lớp ${exam.grade}` : 'K.Hợp'}</span>
                    <span className="text-[10px] text-gray-500">{exam.subject?.substring(0, 6) || 'Chung'}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 text-lg">{exam.title}</h3>
                      {exam.difficulty && (
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getDifficultyLabel(exam.difficulty).color}`}>
                          {getDifficultyLabel(exam.difficulty).label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {exam.durationMinutes} phút
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" /> {exam.questionCount} câu
                      </span>
                      <span>• {new Date(exam.createdAt).toLocaleDateString('vi-VN')}</span>
                      {exam.subject && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{exam.subject}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  {user?.role === 'TEACHER' && (
                    <>
                      {/* New Results Button */}
                      <Link
                        to={`/exam/${exam.id}/results`}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-100"
                        title="Xem kết quả và thống kê"
                      >
                        <LineChart className="h-4 w-4" /> <span className="hidden sm:inline">Kết quả</span>
                      </Link>

                      <button
                        onClick={() => handleHostLive(exam)}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-pink-700 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors border border-pink-100"
                        title="Tổ chức thi Live (Tại lớp)"
                      >
                        <Radio className="h-4 w-4" /> <span className="hidden sm:inline">Tổ chức thi</span>
                      </button>
                      <button
                        onClick={() => handleOpenAssign(exam)}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100"
                        title="Giao bài tập về nhà"
                      >
                        <Send className="h-4 w-4" /> <span className="hidden sm:inline">Giao bài</span>
                      </button>
                    </>
                  )}
                  {/* Teachers/Admins can preview/try the exam */}
                  <Link
                    to={`/exam/${exam.id}/take`}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg border border-transparent hover:border-gray-200"
                  >
                    Xem thử
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedExam && (
        <AssignModal
          exam={selectedExam}
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
        />
      )}
    </div>
  );
};