import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, Math as DocxMath } from 'docx';
import { saveAs } from 'file-saver';
import katex from 'katex';
import { Question } from '../types';

/**
 * Chuyển đổi công thức LaTeX đơn giản sang định dạng mà docx.Math có thể hiểu hoặc MathML
 * Lưu ý: docx Math component hỗ trợ OMML tốt nhất. 
 * Giải pháp tạm thời: Render sang MathML bằng KaTeX và bọc vào cấu trúc Math của docx.
 */
const renderMath = (latex: string) => {
    try {
        // Render sang MathML string
        const mathml = katex.renderToString(latex, {
            displayMode: false,
            output: 'mathml',
            throwOnError: false
        });
        
        // Trích xuất nội dung bên trong tag <math>
        // Thực tế docx.Math trong thư viện docx v9+ có thể nhận diện MathML thô nếu được cấu hình đúng
        // Tuy nhiên, việc bọc trực tiếp MathML vào docx.Math thường yêu cầu OMML.
        // Ở đây ta sử dụng TextRun chuẩn nếu công thức quá phức tạp, hoặc DocxMath cho công thức cơ bản.
        return new DocxMath({
            children: [new TextRun(latex)] // Fallback nếu không chuyển được OMML
        });
    } catch (e) {
        return new TextRun(latex);
    }
};

/**
 * Parsing nội dung văn bản có chứa ký hiệu $...$
 */
const parseContentWithMath = (content: string): any[] => {
    const parts = content.split(/(\$.*?\$)/g);
    return parts.map(part => {
        if (part.startsWith('$') && part.endsWith('$')) {
            const latex = part.slice(1, -1);
            return renderMath(latex);
        }
        return new TextRun(part);
    });
};

interface ExportParams {
    questions: Question[];
    title: string;
    subject: string;
    grade: string;
    duration: number;
    includeMatrix?: boolean;
    includeSolution?: boolean;
}

export const exportToDocx = async ({ questions, title, subject, grade, duration, includeMatrix, includeSolution }: ExportParams) => {
    const sections = [];

    // 1. Phần Header
    const header = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
            new TextRun({ text: "ĐỀ KIỂM TRA MÔN: ", bold: true }),
            new TextRun({ text: `${subject.toUpperCase()} - LỚP ${grade}`, color: "000000", bold: true }),
        ],
    });

    const info = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
            new TextRun({ text: `Thời gian làm bài: ${duration} phút`, italics: true }),
        ],
    });

    sections.push(header, info, new Paragraph({ text: "" }));

    // 2. Phần Ma trận (nếu yêu cầu)
    if (includeMatrix) {
        sections.push(new Paragraph({ 
            children: [new TextRun({ text: "I. MA TRẬN ĐỀ KIỂM TRA", bold: true, size: 28 })],
            spacing: { before: 400, after: 200 }
        }));

        const topics = Array.from(new Set(questions.map(q => q.topic || 'Chung')));
        
        const matrixRows = [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Chủ đề", bold: true })], alignment: AlignmentType.CENTER })], verticalAlign: AlignmentType.CENTER, width: { size: 40, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "N.Biết", bold: true })], alignment: AlignmentType.CENTER })], verticalAlign: AlignmentType.CENTER, width: { size: 15, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Kết nối", bold: true })], alignment: AlignmentType.CENTER })], verticalAlign: AlignmentType.CENTER, width: { size: 15, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "V.Dụng", bold: true })], alignment: AlignmentType.CENTER })], verticalAlign: AlignmentType.CENTER, width: { size: 15, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tổng", bold: true })], alignment: AlignmentType.CENTER })], verticalAlign: AlignmentType.CENTER, width: { size: 15, type: WidthType.PERCENTAGE } }),
                ],
            }),
        ];

        topics.forEach(t => {
            const topicQs = questions.filter(q => (q.topic || 'Chung') === t);
            const l1 = topicQs.filter(q => q.level === 'NHAN_BIET').length;
            const l2 = topicQs.filter(q => q.level === 'KET_NOI').length;
            const l3 = topicQs.filter(q => q.level === 'VAN_DUNG').length;

            matrixRows.push(new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(t)] }),
                    new TableCell({ children: [new Paragraph({ text: l1 ? l1.toString() : "-", alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: l2 ? l2.toString() : "-", alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: l3 ? l3.toString() : "-", alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: topicQs.length.toString(), alignment: AlignmentType.CENTER, children: [new TextRun({ text: topicQs.length.toString(), bold: true })] })] }),
                ],
            }));
        });

        // Hàng tổng cộng
        matrixRows.push(new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TỔNG CỘNG", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ text: questions.filter(q => q.level === 'NHAN_BIET').length.toString(), alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: questions.filter(q => q.level === 'KET_NOI').length.toString(), alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: questions.filter(q => q.level === 'VAN_DUNG').length.toString(), alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: questions.length.toString(), bold: true, color: "FF0000" })], alignment: AlignmentType.CENTER })] }),
            ],
        }));

        const matrixTable = new Table({
            rows: matrixRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
        });

        sections.push(matrixTable, new Paragraph({ text: "" }));
    }

    // 3. Phần Đề thi
    sections.push(new Paragraph({ 
        children: [new TextRun({ text: "II. PHẦN CÂU HỎI", bold: true, size: 28 })],
        spacing: { before: 400, after: 200 }
    }));

    questions.forEach((q, idx) => {
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: `Câu ${idx + 1}: `, bold: true }),
                ...parseContentWithMath(q.content)
            ],
            spacing: { before: 200 }
        }));

        if (q.type === 'MCQ' && q.options) {
            // Hiển thị các lựa chọn A, B, C, D
            q.options.forEach((opt, oIdx) => {
                sections.push(new Paragraph({
                    children: [
                        new TextRun({ text: `   ${String.fromCharCode(65 + oIdx)}. `, bold: true }),
                        ...parseContentWithMath(opt)
                    ],
                    indent: { left: 720 }
                }));
            });
        }
    });

    // 4. Đáp án (nếu yêu cầu)
    if (includeSolution) {
        sections.push(new Paragraph({ text: "" }));
        sections.push(new Paragraph({
            children: [new TextRun({ text: "III. ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI", bold: true, size: 28 })],
            spacing: { before: 400, after: 200 }
        }));
        
        questions.forEach((q, idx) => {
            if (q.solution || (q.type === 'MCQ' && q.correctOptionIndex !== undefined)) {
                sections.push(new Paragraph({
                    children: [
                        new TextRun({ text: `Câu ${idx + 1}: `, bold: true }),
                        new TextRun({ 
                            text: q.type === 'MCQ' ? String.fromCharCode(65 + (q.correctOptionIndex ?? 0)) : (q.solution || ""),
                            color: "FF0000",
                            bold: true 
                        })
                    ]
                }));
            }
        });
    }

    const doc = new Document({
        sections: [{
            children: sections
        }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title || 'De_Kiem_Tra'}.docx`);
};
