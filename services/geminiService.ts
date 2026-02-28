import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, Attempt } from '../types';

// Helper: Clean JSON string from Markdown code blocks
const cleanJsonString = (text: string): string => {
  if (!text) return "[]";
  // Remove ```json and ``` wrapping
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  return clean.trim();
};

const getAiClient = () => {
  // Safely get API Key checking both process.env and import.meta.env
  let apiKey = '';

  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    // @ts-ignore
    apiKey = process.env.API_KEY;
  }

  if (!apiKey) {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      apiKey = import.meta.env.VITE_API_KEY;
    }
  }

  if (!apiKey || apiKey.includes("API_KEY")) {
    console.error("CRITICAL: Missing API KEY. Please check .env file or Vercel Environment Variables.");
    throw new Error("API Key is missing or invalid.");
  }

  // DEBUGGING: Log masked key to see if it's the same
  console.log(`[DEBUG] getAiClient triggered. Found key: ${apiKey.substring(0, 5)}...${apiKey.slice(-5)}`);

  return new GoogleGenAI({ apiKey });
};

const QUESTION_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: "The main text of the question" },
      imageUrl: { type: Type.STRING, description: "Optional URL for an image associated with the question (if provided in text)" },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of answer choices or items to match/order."
      },
      correctOptionIndex: { type: Type.INTEGER, description: "Index of correct option (0-3) for MCQ, or -1 if not applicable" },
      solution: { type: Type.STRING, description: "Detailed step-by-step explanation including the final answer." },
      hint: { type: Type.STRING, description: "A pedagogical hint explaining the method/formula to use WITHOUT giving the answer." },
      level: { type: Type.STRING, description: "Difficulty level. Must be one of: NHAN_BIET, THONG_HIEU, VAN_DUNG" },
      topic: { type: Type.STRING, description: "The specific knowledge topic/chapter this question belongs to, e.g. 'Phân số', 'Hình học phẳng'" },
      questionType: { type: Type.STRING, description: "Type of question. Must be one of: MCQ, SHORT_ANSWER, MATCHING, ORDERING, DRAG_DROP" }
    },
    required: ["content", "options", "correctOptionIndex", "solution", "hint", "level", "topic", "questionType"],
  }
};

// Model fallback list: try newer model first, fallback to older if quota exceeded
const AI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];

/**
 * Parses raw text content (from Word/PDF copy-paste) into structured Question objects.
 */
export const parseQuestionsFromText = async (rawText: string): Promise<Question[]> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";

  const prompt = `
    You are an AI exam parser for an LMS system. 
    Analyze the following raw text which contains exam questions.
    Extract all questions into a structured JSON array.
    
    Rules:
    1. Identify the question stem.
    2. Identify options (A, B, C, D). If the question is essay/short answer with no options, set options to empty array [].
    3. Extract solution/explanation if present. If not, generate a brief one.
    4. Determine the correct answer index (0-3) IF explicitly marked. If unknown, set to -1.
    5. MATH FORMATTING: If you encounter math, use LaTeX format enclosed in single dollar signs ($) for inline math. Example: $x^2 + 5$.
    6. **HINT & SOLUTION**: Always try to extract or generate a 'hint' (method) and 'solution' (full steps).
    7. **LEVEL (REQUIRED)**: Classify each question's difficulty as one of: NHAN_BIET (recall/recognition), THONG_HIEU (understanding/connection), VAN_DUNG (application/problem-solving).
    8. **TOPIC (REQUIRED)**: Identify the specific knowledge topic/chapter for each question (e.g., "Phân số", "Hình học phẳng", "Từ vựng").
    9. **questionType (REQUIRED)**: Detect the question format: MCQ (has A/B/C/D options), SHORT_ANSWER (essay/open-ended), MATCHING, ORDERING, or DRAG_DROP.
    
    Raw Text:
    """
    ${rawText}
    """
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: QUESTION_SCHEMA
      }
    });

    const cleanedText = cleanJsonString(response.text || "[]");
    const parsedData = JSON.parse(cleanedText);

    return parsedData.map((item: any, index: number) => ({
      id: `gen_parse_${Date.now()}_${index}`,
      type: (item.questionType || 'MCQ') as any,
      content: item.content,
      imageUrl: item.imageUrl,
      options: item.options || [],
      correctOptionIndex: item.correctOptionIndex === -1 ? undefined : item.correctOptionIndex,
      solution: item.solution,
      hint: item.hint,
      level: item.level || undefined,
      topic: item.topic || undefined
    }));

  } catch (error) {
    console.error("Gemini Parse Error:", error);
    throw new Error("Failed to parse questions using AI.");
  }
};

/**
 * Generates new questions based on sophisticated criteria.
 * Includes retry logic and type-specific prompt engineering.
 */
export const generateQuestionsByTopic = async (
  topic: string,
  classLevel: string,
  questionType: string,
  difficulty: string,
  count: number,
  customPrompt: string
): Promise<Question[]> => {
  const ai = getAiClient();

  // Map difficulty string to level code
  const levelCode = difficulty.includes('Nhận biết') ? 'NHAN_BIET'
    : difficulty.includes('Kết nối') || difficulty.includes('Hiểu') ? 'THONG_HIEU'
      : 'VAN_DUNG';

  // Extract clean topic name (remove subject prefix)
  const cleanTopic = topic.includes(':') ? topic.split(':').slice(1).join(':').trim() : topic;

  // Build type-specific instructions with concrete JSON examples
  const getTypeSpecificInstructions = (type: string): string => {
    switch (type) {
      case 'MATCHING':
        return `
    QUESTION TYPE: MATCHING (Nối cột / Ghép đôi)
    - 'content': Describe the matching task clearly. E.g., "Nối mỗi phép tính ở cột A với kết quả đúng ở cột B."
    - 'options': An array of strings, each string is a PAIR formatted as "Left item ||| Right item". 
      The CORRECT pairs should be listed. E.g., ["3 + 2 ||| 5", "10 - 4 ||| 6", "2 x 3 ||| 6", "8 : 2 ||| 4"]
    - 'correctOptionIndex': MUST be -1 (not applicable for matching).
    - 'solution': List all correct pairings clearly. E.g., "3 + 2 → 5; 10 - 4 → 6; 2 x 3 → 6; 8 : 2 → 4"
    
    EXAMPLE JSON for ONE matching question:
    {
      "content": "Nối mỗi phép tính ở cột A với kết quả đúng ở cột B.",
      "options": ["3 + 2 ||| 5", "10 - 4 ||| 6", "2 x 3 ||| 6", "8 : 2 ||| 4"],
      "correctOptionIndex": -1,
      "solution": "3 + 2 = 5; 10 - 4 = 6; 2 × 3 = 6; 8 : 2 = 4",
      "hint": "Thực hiện từng phép tính rồi nối với kết quả tương ứng.",
      "level": "${levelCode}",
      "topic": "${cleanTopic}",
      "questionType": "MATCHING"
    }`;
      case 'ORDERING':
        return `
    QUESTION TYPE: ORDERING (Sắp xếp theo thứ tự)
    - 'content': Describe the ordering task. E.g., "Sắp xếp các phân số sau theo thứ tự tăng dần."
    - 'options': An array of items IN SHUFFLED/RANDOM ORDER that the student needs to reorder. E.g., ["1/2", "1/4", "3/4", "1/3"]
    - 'correctOptionIndex': MUST be -1 (not applicable for ordering).
    - 'solution': Show the correct order. E.g., "Thứ tự đúng: 1/4 < 1/3 < 1/2 < 3/4"
    
    EXAMPLE JSON for ONE ordering question:
    {
      "content": "Sắp xếp các phân số sau theo thứ tự từ bé đến lớn.",
      "options": ["1/2", "1/4", "3/4", "1/3"],
      "correctOptionIndex": -1,
      "solution": "Thứ tự đúng: 1/4; 1/3; 1/2; 3/4",
      "hint": "Quy đồng mẫu số rồi so sánh tử số.",
      "level": "${levelCode}",
      "topic": "${cleanTopic}",
      "questionType": "ORDERING"
    }`;
      case 'DRAG_DROP':
        return `
    QUESTION TYPE: DRAG_DROP (Điền khuyết / Kéo thả)
    - 'content': A sentence or paragraph with blanks marked as "___". E.g., "Kết quả của 5 + ___ = 12 là ___."
    - 'options': An array of words/values that fill the blanks (include some distractors too). E.g., ["7", "12", "5", "8"]
    - 'correctOptionIndex': MUST be -1 (not applicable for drag-drop).
    - 'solution': Show the filled sentence with correct answers. E.g., "5 + 7 = 12. Đáp án điền vào chỗ trống là 7."
    
    EXAMPLE JSON for ONE drag-drop question:
    {
      "content": "Điền số thích hợp vào chỗ trống: 15 + ___ = 23",
      "options": ["8", "7", "9", "6"],
      "correctOptionIndex": -1,
      "solution": "15 + 8 = 23. Số cần điền là 8.",
      "hint": "Lấy tổng trừ đi số hạng đã biết.",
      "level": "${levelCode}",
      "topic": "${cleanTopic}",
      "questionType": "DRAG_DROP"
    }`;
      case 'SHORT_ANSWER':
        return `
    QUESTION TYPE: SHORT_ANSWER (Tự luận ngắn)
    - 'content': The question text.
    - 'options': MUST be an empty array [].
    - 'correctOptionIndex': MUST be -1.
    - 'solution': The full detailed answer.
    
    EXAMPLE JSON for ONE short answer question:
    {
      "content": "Tính chu vi hình chữ nhật có chiều dài 8cm và chiều rộng 5cm.",
      "options": [],
      "correctOptionIndex": -1,
      "solution": "Chu vi = (8 + 5) × 2 = 26 (cm)",
      "hint": "Áp dụng công thức P = (a + b) × 2",
      "level": "${levelCode}",
      "topic": "${cleanTopic}",
      "questionType": "SHORT_ANSWER"
    }`;
      default: // MCQ
        return `
    QUESTION TYPE: MCQ (Trắc nghiệm 4 lựa chọn A, B, C, D)
    - 'content': The question text.
    - 'options': Exactly 4 answer choices.
    - 'correctOptionIndex': The index (0-3) of the correct answer.
    
    EXAMPLE JSON for ONE MCQ question:
    {
      "content": "Kết quả của phép tính 25 + 17 = ?",
      "options": ["32", "42", "52", "43"],
      "correctOptionIndex": 1,
      "solution": "25 + 17 = 42",
      "hint": "Cộng hàng đơn vị trước: 5 + 7 = 12, viết 2 nhớ 1.",
      "level": "${levelCode}",
      "topic": "${cleanTopic}",
      "questionType": "MCQ"
    }`;
    }
  };

  const typeInstructions = getTypeSpecificInstructions(questionType);

  const prompt = `
    Bạn là AI tạo đề kiểm tra cho học sinh Việt Nam. Hãy tạo CHÍNH XÁC ${count} câu hỏi.

    THÔNG TIN:
    - Chủ đề: "${topic}"
    - Đối tượng: Học sinh Lớp ${classLevel}
    - Mức độ (Thông tư 27): ${difficulty}
    - Ngôn ngữ: Tiếng Việt
    ${customPrompt ? `- Yêu cầu thêm từ giáo viên: ${customPrompt}` : ''}

    ${typeInstructions}

    QUY TẮC CHUNG:
    1. 'hint' (BẮT BUỘC): Gợi ý phương pháp giải, KHÔNG tiết lộ đáp án.
    2. 'solution' (BẮT BUỘC): Lời giải chi tiết từng bước.
    3. Công thức toán: Dùng LaTeX trong dấu $ đơn. VD: $x^2 + 5$.
    4. 'level' (BẮT BUỘC): Đặt đúng giá trị "${levelCode}".
    5. 'topic' (BẮT BUỘC): Đặt đúng giá trị "${cleanTopic}".
    6. 'questionType' (BẮT BUỘC): Đặt đúng giá trị "${questionType}".

    Trả về một JSON array gồm ${count} objects. Mỗi object có đầy đủ các field: content, options, correctOptionIndex, solution, hint, level, topic, questionType.
  `;

  // Helper to parse response into Question array
  const parseResponse = (text: string): Question[] => {
    const cleanedText = cleanJsonString(text || "[]");
    const parsedData = JSON.parse(cleanedText);
    return parsedData.map((item: any, index: number) => ({
      id: `gen_ai_${Date.now()}_${index}`,
      type: (item.questionType || questionType) as any,
      content: item.content || '',
      imageUrl: item.imageUrl,
      options: Array.isArray(item.options) ? item.options : [],
      correctOptionIndex: item.correctOptionIndex === -1 || item.correctOptionIndex === undefined ? undefined : item.correctOptionIndex,
      solution: item.solution || '',
      hint: item.hint || '',
      level: item.level || levelCode,
      topic: item.topic || cleanTopic
    }));
  };

  let lastError: any = null;

  // Try each model in the fallback list
  for (const modelId of AI_MODELS) {
    // Attempt 1: With structured schema
    try {
      console.log(`[AI Gen] Trying ${modelId} with schema for ${count} ${questionType} questions...`);
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: QUESTION_SCHEMA
        }
      });
      const result = parseResponse(response.text || "[]");
      console.log(`[AI Gen] Success with ${modelId} + schema! Got ${result.length} questions.`);
      return result;
    } catch (schemaError: any) {
      const errMsg = schemaError?.message || schemaError?.toString() || '';
      console.warn(`[AI Gen] ${modelId} + schema failed:`, errMsg);

      // If quota error, try next model immediately
      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        console.warn(`[AI Gen] ${modelId} quota exceeded, trying next model...`);
        lastError = schemaError;
        continue;
      }

      // Attempt 2: Same model but WITHOUT schema (more flexible)
      try {
        console.log(`[AI Gen] Retrying ${modelId} without schema...`);
        const response = await ai.models.generateContent({
          model: modelId,
          contents: prompt + "\n\nIMPORTANT: Return ONLY a valid JSON array. No markdown, no explanation, just the JSON array.",
          config: {
            responseMimeType: "application/json"
          }
        });
        const result = parseResponse(response.text || "[]");
        console.log(`[AI Gen] Success with ${modelId} without schema! Got ${result.length} questions.`);
        return result;
      } catch (noSchemaError: any) {
        const noSchemaMsg = noSchemaError?.message || noSchemaError?.toString() || '';
        console.warn(`[AI Gen] ${modelId} without schema also failed:`, noSchemaMsg);
        lastError = noSchemaError;
        // If quota error on no-schema attempt too, try next model
        if (noSchemaMsg.includes('429') || noSchemaMsg.includes('quota') || noSchemaMsg.includes('RESOURCE_EXHAUSTED')) {
          continue;
        }
      }
    }
  }

  // All models exhausted
  const finalMsg = lastError?.message || lastError?.toString() || 'All models failed';
  console.error("[AI Gen] All attempts failed:", finalMsg);
  throw new Error(finalMsg);
};

/**
 * Analyzes a single student's attempt to provide personalized feedback.
 */
export const analyzeStudentAttempt = async (
  examTitle: string,
  questions: Question[],
  userAnswers: Record<string, any>,
  score: number
): Promise<string> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";

  // Filter wrong answers to save tokens and focus AI
  const wrongAnswers = questions.filter(q => {
    const userAns = userAnswers[q.id];
    return userAns !== undefined && userAns !== q.correctOptionIndex;
  }).map(q => ({
    question: q.content,
    correctAnswer: q.options[q.correctOptionIndex!],
    type: q.type
  }));

  const prompt = `
    Analyze the exam results for a student.
    Exam: "${examTitle}"
    Score: ${score}/10
    Total Questions: ${questions.length}
    Wrong Answers Count: ${wrongAnswers.length}
    
    List of mistakes (Sample):
    ${JSON.stringify(wrongAnswers.slice(0, 5))} 
    (and possibly others)

    Please provide a helpful, encouraging, and constructive feedback in VIETNAMESE (Markdown format).
    
    IMPORTANT FORMATTING RULES:
    - Use **BOLD HEADERS** (e.g., ### **1. Nhận xét chung**).
    - Use bullet points.
    - If you write math formulas (e.g., numbers, variables, equations), ALWAYS enclose them in single dollar signs ($) for proper rendering. Example: "Kết quả phải là $3.5$".
    - Do not use block code ticks (\`\`\`) for text, write standard Markdown.

    Structure:
    1. ### **Nhận xét chung**: Brief summary of performance.
    2. ### **Điểm mạnh**: What they likely know (based on score).
    3. ### **Hạn chế & Lỗ hổng kiến thức**: Analyze the wrong answers to find patterns.
    4. ### **Lời khuyên cải thiện**: Specific actions to take next.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "Không thể tạo nhận xét lúc này.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Lỗi khi phân tích kết quả.";
  }
};

/**
 * Analyzes overall class performance for a specific exam.
 */
export const analyzeClassPerformance = async (
  examTitle: string,
  questions: Question[],
  attempts: Attempt[],
  customInstructions?: string
): Promise<string> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";

  if (attempts.length === 0) return "Chưa có dữ liệu bài làm để phân tích.";

  // Calculate statistics
  const scores = attempts.map(a => a.score || 0);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  // Find most difficult questions
  const questionStats = questions.map(q => {
    let wrongCount = 0;
    attempts.forEach(a => {
      if (a.answers[q.id] !== q.correctOptionIndex) wrongCount++;
    });
    return { question: q.content, wrongCount, wrongPercent: (wrongCount / attempts.length) * 100 };
  }).sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 3); // Top 3 hardest

  const prompt = `
    Analyze the class performance for the exam: "${examTitle}".
    Target Audience: Teacher.
    Language: Vietnamese (Markdown).

    Data:
    - Total Students: ${attempts.length}
    - Average Score: ${avgScore.toFixed(2)}
    - Max: ${maxScore}, Min: ${minScore}
    - Top 3 Hardest Questions (Most wrong):
      ${JSON.stringify(questionStats)}

    Teacher's Custom Request (Focus on this): ${customInstructions || "General comprehensive analysis"}

    Please provide a professional teaching analysis:
    1. **Tổng quan lớp học**: Comment on the general level.
    2. **Phân tích phổ điểm**: Distribution insights.
    3. **Vấn đề cần lưu ý**: Analyze the hardest questions. Use LaTeX ($...$) for any math.
    4. **Gợi ý giảng dạy**: How should the teacher adjust upcoming lessons?
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "Không thể tạo báo cáo lớp học.";
  } catch (error) {
    console.error("Gemini Class Analysis Error:", error);
    return "Lỗi khi phân tích dữ liệu lớp học.";
  }
};

/**
 * Generates personalized behavior advice for a student based on recent negative behavior logs.
 */
export const generateBehaviorAdvice = async (
  studentName: string,
  className: string,
  logSummary: string,
  customPrompt?: string
): Promise<string> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";

  const prompt = `
    Đóng vai một Chuyên gia Tâm lý Học đường và Cố vấn Hành vi.
    Hãy tư vấn cho Giáo viên cách xử lý và giáo dục học sinh sau đây:
    
    - Tên học sinh: ${studentName} (${className})
    - Lịch sử vi phạm gần đây:
${logSummary}

    ${customPrompt ? `\n- Ghi chú thêm từ giáo viên (Hoàn cảnh/Bối cảnh lúc này): "${customPrompt}"\n` : ''}

    YÊU CẦU:
    - Viết bằng Tiếng Việt thân thiện, rõ ràng, dễ áp dụng (định dạng Markdown).
    - Phân tích nguyên nhân có thể xảy ra từ góc độ tâm lý.
    - Đưa ra 2-3 biện pháp cụ thể, thực tế để giáo viên có thể hỗ trợ/giáo dục học sinh này thay vì chỉ trách mắng.
    - Cấu trúc gồm: "Nguyên nhân tiềm ẩn", "Góc nhìn tâm lý" và "Giải pháp đề xuất".
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "Không thể tạo tư vấn từ AI vào lúc này.";
  } catch (error) {
    console.error("Gemini Behavior Advice Error:", error);
    return "Lỗi khi kết nối với AI Tư vấn.";
  }
};

/**
 * Analyzes handwritten or typed student material from multiple images (base64) using Gemini Pro Vision.
 */
export const analyzeStudentMaterial = async (
  images: { data: string, mimeType: string }[],
  customPrompt: string = ""
): Promise<any> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";

  const prompt = `
    Đóng vai một Giáo viên chấm bài xuất sắc. Dưới đây là hình ảnh chụp các trang bài làm của học sinh.
    
    YÊU CẦU:
    1. Đọc và nhận dạng chữ viết trong TẤT CẢ các ảnh một cách chính xác nhất có thể (các ảnh có thể là nhiều trang của cùng 1 bài bài làm).
    2. Điểm số (thang điểm 100): Tự động cấp một đề xuất điểm số dựa trên độ hoàn thiện và độ chính xác của toàn bộ bài làm.
    3. Trình bày dưới dạng JSON thuần túy (KHÔNG CÓ markdown \`\`\`json\`\`\`).
    
    ${customPrompt ? `\nCHỈ ĐẠO CÁ NHÂN TỪ GIÁO VIÊN: "${customPrompt}"\n(Hãy đặc biệt tuân thủ chỉ đạo này khi chấm bài)\n` : ''}
    
    CẤU TRÚC JSON YÊU CẦU:
    {
      "advantages": "Những điểm tốt, làm đúng phân tích từ bài làm (VIẾT DƯỚI DẠNG ĐOẠN VĂN THEO DẠNG MARKDOWN)",
      "limitations": "Những điểm sai, thiếu sót, lỗi trình bày (VIẾT DƯỚI DẠNG ĐOẠN VĂN THEO DẠNG MARKDOWN)",
      "improvements": "Lời khuyên cải thiện cụ thể để học sinh tốt hơn (VIẾT DƯỚI DẠNG ĐOẠN VĂN THEO DẠNG MARKDOWN)",
      "suggested_score": <một con số nguyên từ 0 đến 100>
    }
    
    Lưu ý: Nếu hình ảnh không phải là một bài làm có thể chấm được, hãy trả về JSON nhưng trong các mục text hãy báo là "Không thể nhận dạng chữ hoặc nội dung không phù hợp", và điểm 0.
  `;

  try {
    const imageParts = images.map(img => ({
      inlineData: {
        data: img.data,
        mimeType: img.mimeType
      }
    }));

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{
        role: "user",
        parts: [
          ...imageParts,
          { text: prompt }
        ]
      }]
    });

    const cleanedText = cleanJsonString(response.text || "{}");
    try {
      return JSON.parse(cleanedText);
    } catch (e) {
      console.error("Failed to parse AI Grading output:", cleanedText);
      throw new Error("AI returned malformed JSON");
    }
  } catch (error) {
    console.error("Gemini Vision Grading Error:", error);
    throw new Error("Lỗi khi phân tích hình ảnh qua AI.");
  }
};

/**
 * Analyzes student work from TEXT input (typed/pasted by teacher).
 * Supports reference exam (đề bài gốc) and custom rubric.
 */
export const analyzeStudentText = async (
  studentText: string,
  referenceExam: string = "",
  customPrompt: string = "",
  rubric: string = ""
): Promise<any> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";

  const prompt = `
    Đóng vai một Giáo viên chấm bài xuất sắc.
    
    ${referenceExam ? `ĐỀ BÀI GỐC (Đáp án chuẩn):\n"""\n${referenceExam}\n"""\n` : ''}
    
    BÀI LÀM CỦA HỌC SINH:
    """
    ${studentText}
    """
    
    ${rubric ? `TIÊU CHÍ ĐÁNH GIÁ (RUBRIC):\n${rubric}\n` : ''}
    ${customPrompt ? `CHỈ ĐẠO CÁ NHÂN TỪ GIÁO VIÊN: "${customPrompt}"\n(Hãy đặc biệt tuân thủ chỉ đạo này khi chấm bài)\n` : ''}
    
    YÊU CẦU:
    1. So sánh bài làm của học sinh với đề bài gốc (nếu có) để đánh giá chính xác.
    2. Nếu không có đề gốc, đánh giá dựa trên nội dung bài làm.
    3. Điểm số (thang điểm 100): Tự động cấp một đề xuất điểm số.
    4. Trình bày dưới dạng JSON thuần túy (KHÔNG CÓ markdown \`\`\`json\`\`\`).
    
    CẤU TRÚC JSON YÊU CẦU:
    {
      "advantages": "Những điểm tốt, làm đúng (VIẾT DƯỚI DẠNG MARKDOWN)",
      "limitations": "Những điểm sai, thiếu sót, lỗi (VIẾT DƯỚI DẠNG MARKDOWN)",
      "improvements": "Lời khuyên cải thiện cụ thể (VIẾT DƯỚI DẠNG MARKDOWN)",
      "suggested_score": <một con số nguyên từ 0 đến 100>
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const cleanedText = cleanJsonString(response.text || "{}");
    try {
      return JSON.parse(cleanedText);
    } catch (e) {
      console.error("Failed to parse AI Text Grading output:", cleanedText);
      throw new Error("AI returned malformed JSON");
    }
  } catch (error) {
    console.error("Gemini Text Grading Error:", error);
    throw new Error("Lỗi khi phân tích bài làm qua AI.");
  }
};