/**
 * Local Question Parser — Tách câu hỏi từ text bằng Regex, KHÔNG cần AI.
 * Hỗ trợ định dạng:
 *   Câu 1: / Bài 1: / Câu hỏi 1: / 1. / 1)
 *   A. / B. / C. / D. (đáp án)
 *   Đáp án: B / Đáp án đúng: B
 *   Hướng dẫn: / Giải thích: / Lời giải: (solution)
 */

import { Question } from '../types';

// Regex to split text into question blocks
const QUESTION_START_REGEX = /(?:^|\n)\s*(?:Câu\s*(?:hỏi\s*)?|Bài\s*|Question\s*)(\d+)\s*[:.)\]]\s*/gi;
const QUESTION_START_ALT_REGEX = /(?:^|\n)\s*(\d+)\s*[.)]\s+/g;

// Regex for options
const OPTION_REGEX = /^\s*([A-Da-d])\s*[.):\]]\s*(.+)/;

// Regex for correct answer (captures the whole remaining line so we can check if it's A/B/C/D or text)
const ANSWER_REGEX = /(?:Đáp\s*án\s*(?:đúng)?\s*[:.]\s*)(.+)/i;

// Regex for solution/explanation — must handle "Lời giải chi tiết:", "Hướng dẫn giải:", "Giải thích:", etc.
const SOLUTION_REGEX = /(?:Lời\s*giải(?:\s*chi\s*tiết)?|Giải\s*thích|Hướng\s*dẫn\s*giải|Giải\s*chi\s*tiết|Solution|Explanation)\s*[:.]?\s*([\s\S]*?)$/i;

// Regex for hint — must handle "Gợi ý:", "Gợi ý (Cách làm):", "Hint:", etc.
const HINT_REGEX = /(?:Gợi\s*ý(?:\s*\([^)]*\))?|Hint)\s*[:.]?\s*([\s\S]*?)$/i;

/**
 * Parse questions from raw text using regex (no AI needed).
 * Returns an array of Question objects.
 */
export const parseQuestionsLocal = (rawText: string): Question[] => {
    const text = rawText.trim();
    if (!text) return [];

    // Step 1: Split text into question blocks
    const blocks = splitIntoQuestionBlocks(text);

    if (blocks.length === 0) return [];

    // Step 2: Parse each block
    const questions: Question[] = [];
    blocks.forEach((block, index) => {
        const q = parseOneBlock(block, index);
        if (q) questions.push(q);
    });

    return questions;
};

/**
 * Split the full text into individual question blocks.
 */
function splitIntoQuestionBlocks(text: string): string[] {
    // Try standard format first: "Câu 1:", "Bài 1:", etc.
    let matches: { index: number; length: number }[] = [];

    // Reset regex
    QUESTION_START_REGEX.lastIndex = 0;
    let match;
    while ((match = QUESTION_START_REGEX.exec(text)) !== null) {
        matches.push({ index: match.index, length: match[0].length });
    }

    // If no standard matches, try "1." or "1)" format
    if (matches.length === 0) {
        QUESTION_START_ALT_REGEX.lastIndex = 0;
        while ((match = QUESTION_START_ALT_REGEX.exec(text)) !== null) {
            matches.push({ index: match.index, length: match[0].length });
        }
    }

    if (matches.length === 0) return [];

    // Extract blocks between matches
    const blocks: string[] = [];
    for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index + matches[i].length;
        const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
        const block = text.substring(start, end).trim();
        if (block) blocks.push(block);
    }

    return blocks;
}

/**
 * Parse a single question block into a Question object.
 */
function parseOneBlock(block: string, index: number): Question | null {
    const lines = block.split('\n').map(l => l.trimEnd());

    let content = '';
    const options: string[] = [];
    let correctOptionIndex: number | undefined = undefined;
    let solution = '';
    let hint = '';
    let shortAnswerText = '';

    // Track parsing state
    let parsingState: 'content' | 'options' | 'answer' | 'solution' | 'hint' = 'content';
    let solutionLines: string[] = [];
    let hintLines: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check if this line is an option (A. / B. / C. / D.)
        const optionMatch = trimmed.match(OPTION_REGEX);
        if (optionMatch) {
            parsingState = 'options';
            options.push(optionMatch[2].trim());
            continue;
        }

        // Check if this line contains the correct answer
        const answerMatch = trimmed.match(ANSWER_REGEX);
        if (answerMatch) {
            const ansRaw = answerMatch[1].trim();
            const letterMatch = ansRaw.match(/^([A-Da-d])(?:[.):]|\s|$)/i);
            if (letterMatch) {
                const answerLetter = letterMatch[1].toUpperCase();
                correctOptionIndex = answerLetter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
            } else {
                shortAnswerText = ansRaw;
            }
            parsingState = 'answer';
            continue;
        }

        // Check hint BEFORE solution (hint typically appears first)
        const hintMatch = trimmed.match(HINT_REGEX);
        if (hintMatch) {
            parsingState = 'hint';
            if (hintMatch[1]?.trim()) {
                hintLines.push(hintMatch[1].trim());
            }
            continue;
        }

        // Check if this line starts a solution section
        const solutionMatch = trimmed.match(SOLUTION_REGEX);
        if (solutionMatch) {
            parsingState = 'solution';
            if (solutionMatch[1]?.trim()) {
                solutionLines.push(solutionMatch[1].trim());
            }
            continue;
        }

        // Accumulate into current section
        switch (parsingState) {
            case 'content':
                content += (content ? '\n' : '') + trimmed;
                break;
            case 'solution':
                solutionLines.push(trimmed);
                break;
            case 'hint':
                hintLines.push(trimmed);
                break;
            case 'answer':
                // Lines after "Đáp án:" are likely solution
                solutionLines.push(trimmed);
                parsingState = 'solution';
                break;
            default:
                // After options, any remaining text could be answer/solution
                const lateAnswer = trimmed.match(ANSWER_REGEX);
                if (lateAnswer) {
                    const ansRaw = lateAnswer[1].trim();
                    const letterMatch = ansRaw.match(/^([A-Da-d])(?:[.):]|\s|$)/i);
                    if (letterMatch) {
                        const ansLetter = letterMatch[1].toUpperCase();
                        correctOptionIndex = ansLetter.charCodeAt(0) - 65;
                    } else {
                        shortAnswerText = ansRaw;
                    }
                } else {
                    solutionLines.push(trimmed);
                }
                break;
        }
    }

    solution = solutionLines.join('\n').trim();
    hint = hintLines.join('\n').trim();

    // Must have at least content
    if (!content) return null;

    // Determine question type
    const type = options.length >= 2 ? 'MCQ' : 'SHORT_ANSWER';
    if (type === 'SHORT_ANSWER' && shortAnswerText) {
        options.push(shortAnswerText);
    }

    return {
        id: `local_parse_${Date.now()}_${index}`,
        type: type as any,
        content,
        options,
        correctOptionIndex: correctOptionIndex !== undefined && correctOptionIndex >= 0 && correctOptionIndex < options.length
            ? correctOptionIndex
            : undefined,
        solution: solution || undefined,
        hint: hint || undefined,
        level: undefined,
        topic: undefined
    };
}
