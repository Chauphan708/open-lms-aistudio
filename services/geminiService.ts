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
      hint: { type: Type.STRING, description: "A pedagogical hint explaining the method/formula to use WITHOUT giving the answer." }
    },
    required: ["content", "options", "correctOptionIndex", "solution", "hint"],
  }
};

/**
 * Parses raw text content (from Word/PDF copy-paste) into structured Question objects.
 */
export const parseQuestionsFromText = async (rawText: string): Promise<Question[]> => {
  const ai = getAiClient();
  const modelId = "gemini-3-flash-preview"; 

  const prompt = `
    You are an AI exam parser for an LMS system. 
    Analyze the following raw text which contains exam questions.
    Extract all questions into a structured JSON array.
    
    Rules:
    1. Identify the question stem.
    2. Identify options (A, B, C, D).
    3. Extract solution/explanation if present. If not, generate a brief one.
    4. Determine the correct answer index (0-3) IF explicitly marked. If unknown, set to -1.
    5. MATH FORMATTING: If you encounter math, use LaTeX format enclosed in single dollar signs ($) for inline math. Example: $x^2 + 5$.
    6. **HINT & SOLUTION**: Always try to extract or generate a 'hint' (method) and 'solution' (full steps).
    
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
      type: 'MCQ',
      content: item.content,
      imageUrl: item.imageUrl,
      options: item.options,
      correctOptionIndex: item.correctOptionIndex === -1 ? undefined : item.correctOptionIndex,
      solution: item.solution,
      hint: item.hint
    }));

  } catch (error) {
    console.error("Gemini Parse Error:", error);
    throw new Error("Failed to parse questions using AI.");
  }
};

/**
 * Generates new questions based on sophisticated criteria.
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
  const modelId = "gemini-3-flash-preview"; 

  // Mapping readable type to system type string for prompt clarity
  const typeDescription = {
    'MCQ': 'Multiple Choice (4 options: A, B, C, D)',
    'MATCHING': 'Matching columns (Nối cột). Provide pairs in options.',
    'ORDERING': 'Ordering/Sorting (Sắp xếp). Provide shuffled items in options.',
    'DRAG_DROP': 'Fill in the blank / Drag & Drop.',
    'SHORT_ANSWER': 'Short Answer (Tự luận ngắn). Options can be empty.'
  }[questionType] || 'Multiple Choice';

  const prompt = `
    Generate ${count} exam questions for Vietnamese students.
    
    CRITERIA:
    - Topic: "${topic}"
    - Target Audience: Grade ${classLevel} (Lớp ${classLevel})
    - Difficulty Level (Circular 27/Thông tư 27): ${difficulty}
      (Level 1: Nhận biết/Reminder; Level 2: Hiểu/Connection; Level 3: Vận dụng/Application)
    - Question Type: ${typeDescription}
    - Additional Instructions: ${customPrompt || "None"}
    - Language: Vietnamese.

    FORMATTING RULES:
    1. 'content': The question text.
    2. 'options': 
       - For MCQ: 4 choices.
       - For Matching: List strings like "Item A - Match B".
       - For Ordering: List items to be ordered.
       - For Short Answer: Leave empty [].
    3. 'correctOptionIndex': 
       - For MCQ: 0-3. 
       - For others: -1.
    4. **'hint' (REQUIRED)**: Provide a clear pedagogical hint. Explain the method, formula, or logic required to solve the problem WITHOUT revealing the final answer. E.g., "Áp dụng công thức tính diện tích S = a x b."
    5. **'solution' (REQUIRED)**: Provide a detailed step-by-step calculation or explanation leading to the correct result.
    6. **Math Formulas**: Always use LaTeX enclosed in SINGLE dollar signs ($...$) for inline math. Do NOT use block code. Example: "Tính diện tích hình tròn có $r=5cm$."
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
      id: `gen_ai_${Date.now()}_${index}`,
      type: questionType as any, // Cast to strictly typed QuestionType
      content: item.content,
      imageUrl: item.imageUrl,
      options: item.options || [],
      correctOptionIndex: item.correctOptionIndex === -1 ? undefined : item.correctOptionIndex,
      solution: item.solution,
      hint: item.hint
    }));
  } catch (error) {
    console.error("Gemini Gen Error:", error);
    throw new Error("Failed to generate questions.");
  }
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
  const modelId = "gemini-3-flash-preview";

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
  const modelId = "gemini-3-flash-preview";

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