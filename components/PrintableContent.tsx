import React from 'react';
import { Question } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface PrintableContentProps {
    type: 'MATRIX' | 'EXAM_MCQ' | 'EXAM_ESSAY' | 'SOLUTION' | 'ALL';
    questions: Question[];
    title: string;
    subject: string;
    grade: string;
    duration?: number;
    schoolName?: string;
    academicYear?: string;
}

export const PrintableContent: React.FC<PrintableContentProps> = ({ type, questions, title, subject, grade, duration, schoolName, academicYear }) => {
    const displaySchoolName = schoolName || 'Trường Tiểu Học ........................';
    const displayYear = academicYear || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`;
    const displayDuration = duration || '...';

    const SchoolHeader = () => (
        <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
            <div className="text-center font-bold">
                <p className="uppercase">{displaySchoolName}</p>
                <p>Tổ: {subject}</p>
            </div>
            <div className="text-center">
                <p className="font-bold uppercase">ĐỀ KIỂM TRA MÔN: {subject} - LỚP {grade}</p>
                <p className="italic">Năm học: {displayYear}</p>
                <p className="italic">Thời gian làm bài: {displayDuration} phút</p>
            </div>
            <div className="text-center font-bold">
                <p>Họ tên: .......................................</p>
                <p>Lớp: ............. SBD: ......................</p>
            </div>
        </div>
    );

    const TitleHeader = ({ text }: { text: string }) => (
        <h1 className="text-xl font-bold text-center uppercase mb-6">{text}</h1>
    );

    const renderExam = (isEssayOnly: boolean) => {
        const list = isEssayOnly ? questions.filter(q => q.type === 'SHORT_ANSWER') : questions;
        if (list.length === 0) return <p className="italic text-center my-10">Không có câu hỏi phù hợp.</p>;

        return (
            <div className="print-section mb-10 pb-10 page-break-after">
                {!isEssayOnly && <SchoolHeader />}
                {isEssayOnly && <TitleHeader text="PHẦN THI TỰ LUẬN" />}
                {!isEssayOnly && <TitleHeader text={title || "BÀI TẬP TRẮC NGHIỆM"} />}

                <div className="space-y-6 text-justify">
                    {list.map((q, idx) => (
                        <div key={q.id || idx} className="question-item break-inside-avoid">
                            <div className="font-bold mb-1 flex gap-1">
                                <span className="whitespace-nowrap">Câu {idx + 1}:</span>
                                <span className="font-normal">
                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.content}</ReactMarkdown>
                                </span>
                            </div>

                            {q.imageUrl && (
                                <div className="my-2">
                                    <img src={q.imageUrl} alt="img" className="max-h-48 object-contain mx-auto border border-gray-300" />
                                </div>
                            )}

                            {/* Options if MCQ */}
                            {q.type === 'MCQ' && q.options && q.options.length > 0 && (
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 ml-4 mt-2">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex gap-1 break-inside-avoid">
                                            <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                                            <span><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt}</ReactMarkdown></span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Essay spacing */}
                            {(q.type === 'SHORT_ANSWER' || isEssayOnly) && (
                                <div className="h-32 border-b border-dotted border-gray-400 mt-4"></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderSolution = () => {
        const mcqQuestions = questions.filter(q => q.type === 'MCQ');
        // render all MCQs in rows of 10
        const rows: typeof mcqQuestions[] = [];
        for (let i = 0; i < mcqQuestions.length; i += 10) {
            rows.push(mcqQuestions.slice(i, i + 10));
        }

        return (
            <div className="print-section mb-10 pb-10 page-break-after">
                <TitleHeader text="ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI" />
                <div className="mb-4 text-center italic">{title}</div>

                {/* Bảng tổng hợp đáp án trắc nghiệm */}
                {mcqQuestions.length > 0 && (
                    <>
                        <h3 className="font-bold mb-2">I. ĐÁP ÁN TRẮC NGHIỆM</h3>
                        {rows.map((row, rIdx) => (
                            <table key={rIdx} className="w-full border-collapse border border-black text-center mb-2 break-inside-avoid">
                                <tbody>
                                    <tr className="bg-gray-100 font-bold">
                                        {row.map((_, i) => <td key={i} className="border border-black p-1">{rIdx * 10 + i + 1}</td>)}
                                    </tr>
                                    <tr>
                                        {row.map((q, i) => (
                                            <td key={i} className="border border-black p-1 font-bold text-red-600">
                                                {q.correctOptionIndex !== undefined ? String.fromCharCode(65 + q.correctOptionIndex) : ''}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        ))}
                    </>
                )}

                {/* Lời giải chi tiết */}
                <h3 className="font-bold mb-2 mt-6">II. HƯỚNG DẪN GIẢI CHI TIẾT</h3>
                <div className="space-y-4">
                    {questions.map((q, idx) => {
                        if (!q.solution && !q.hint) return null;
                        return (
                            <div key={q.id || idx} className="break-inside-avoid border-b border-dashed border-gray-300 pb-2">
                                <div className="font-bold">Câu {idx + 1}:</div>
                                {q.solution && (
                                    <div className="text-gray-800 ml-4"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.solution}</ReactMarkdown></div>
                                )}
                                {q.hint && !q.solution && (
                                    <div className="text-gray-800 ml-4 italic"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.hint}</ReactMarkdown></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderMatrix = () => {
        const topics = Array.from(new Set(questions.map(q => q.topic || 'Chung')));

        return (
            <div className="print-section mb-10 pb-10 page-break-after">
                <TitleHeader text="BẢNG MA TRẬN ĐỀ KIỂM TRA" />
                <div className="mb-6 text-center italic">{title} - Môn: {subject} - Khối: {grade}</div>

                <table className="w-full border-collapse border border-black mb-6">
                    <thead className="text-center font-bold bg-gray-100">
                        <tr>
                            <th className="border border-black p-2" rowSpan={2}>Chủ đề</th>
                            <th className="border border-black p-2" colSpan={3}>Mức độ nhận thức</th>
                            <th className="border border-black p-2" rowSpan={2}>Tổng số câu</th>
                        </tr>
                        <tr>
                            <th className="border border-black p-2">Nhận biết</th>
                            <th className="border border-black p-2">Thông hiểu</th>
                            <th className="border border-black p-2">Vận dụng</th>
                        </tr>
                    </thead>
                    <tbody className="text-center">
                        {topics.map(t => {
                            const topicQs = questions.filter(q => (q.topic || 'Chung') === t);
                            const l1 = topicQs.filter(q => q.level === 'LEVEL_1').length;
                            const l2 = topicQs.filter(q => q.level === 'LEVEL_2').length;
                            const l3 = topicQs.filter(q => q.level === 'LEVEL_3').length;

                            return (
                                <tr key={t}>
                                    <td className="border border-black p-2 text-left font-medium">{t}</td>
                                    <td className="border border-black p-2">{l1 || '-'}</td>
                                    <td className="border border-black p-2">{l2 || '-'}</td>
                                    <td className="border border-black p-2">{l3 || '-'}</td>
                                    <td className="border border-black p-2 font-bold">{topicQs.length}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="text-center font-bold bg-gray-50">
                        <tr>
                            <td className="border border-black p-2 text-left">TỔNG CỘNG</td>
                            <td className="border border-black p-2">{questions.filter(q => q.level === 'LEVEL_1').length}</td>
                            <td className="border border-black p-2">{questions.filter(q => q.level === 'LEVEL_2').length}</td>
                            <td className="border border-black p-2">{questions.filter(q => q.level === 'LEVEL_3').length}</td>
                            <td className="border border-black p-2 text-red-600">{questions.length}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    };

    return (
        <div className="print-container bg-white text-black p-8 font-serif" style={{ fontSize: '13pt', lineHeight: 1.5 }}>
            {/* Ẩn trên màn hình, chỉ hiển thị khi in */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @media screen { .print-container { display: none; } }
        @media print {
          @page { margin: 20mm; size: A4; }
          body * { visibility: hidden; }
          .print-layout, .print-layout * { visibility: visible; }
          .print-layout { position: absolute; left: 0; top: 0; width: 100%; }
          .page-break-after { page-break-after: always; }
          .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        }
      `}} />

            <div className="print-layout">
                {(type === 'MATRIX' || type === 'ALL') && renderMatrix()}
                {(type === 'EXAM_MCQ' || type === 'ALL') && renderExam(false)}
                {(type === 'EXAM_ESSAY' || type === 'ALL') && renderExam(true)}
                {(type === 'SOLUTION' || type === 'ALL') && renderSolution()}
            </div>
        </div>
    );
};
