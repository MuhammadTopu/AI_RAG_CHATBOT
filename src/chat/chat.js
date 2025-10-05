import OpenAI from "openai";
import dotenv from 'dotenv';
import { vectorStore } from "../rag_system/ragSystem.js";

dotenv.config();

// Configuration constants
const CONFIG = {
    MAX_RETRIEVAL_CHUNKS: 3,
    MAX_TOKENS: 500,
    TEMPERATURE: 0.1,
    MODEL: "gpt-3.5-turbo",
    MIN_RESPONSE_LENGTH: 10,
    REQUEST_TIMEOUT: 30000
};
// Response templates
const RESPONSES = {
    EMPTY_QUESTION: "Please enter a question.",
    GOODBYE: "Goodbye!",
    OUT_OF_SCOPE: "I am only designed to help and assist for this company. I can't help you with that.",
    ERROR: "Sorry, I encountered an error while processing your request."
};
// Input validation patterns
const VALIDATION = {
    BYE_PATTERNS: ['bye', 'goodbye', 'exit', 'quit', 'see you'],
    GREETING_PATTERNS: ['hello', 'hi', 'hey', 'greetings']
};
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: CONFIG.REQUEST_TIMEOUT
});
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
/**
 * Validates and processes user input
 */
function preprocessInput(question) {
    if (!question || question.trim() === '') {
        throw new Error('EMPTY_QUESTION');
    }

    const trimmedQuestion = question.trim();
    const questionLower = trimmedQuestion.toLowerCase();

    if (VALIDATION.BYE_PATTERNS.some(pattern => questionLower.includes(pattern))) {
        throw new Error('GOODBYE');
    }

    return trimmedQuestion;
}
/**
 * Generates system prompt with context
 */
function generateSystemPrompt(context, question) {
    return `
            You are an AI assistant that exclusively provides help related to Estabiz policies, guidelines, and procedures.

            STRICT RULES:
            1. ONLY answer questions related to Estabiz company information, policies, procedures, and guidelines.
            2. ONLY use the provided context to answer. Do not use any outside knowledge or personal experience.
            3. If the context does not contain sufficient information to answer the question, reply: "${RESPONSES.OUT_OF_SCOPE}"
            4. NEVER fabricate, infer, or generate information that is not explicitly present in the provided context.
            5. If asked about anything unrelated to Estabiz (including but not limited to math, other companies, general knowledge, personal advice), reply: "${RESPONSES.OUT_OF_SCOPE}"
            6. Maintain a professional, helpful tone while strictly adhering to these boundaries.

            CONTEXT:
            ${context}

            USER QUESTION: ${question}

            ANSWER:`.trim();
}
/**
 * Checks if response is valid and meaningful
 */
function isValidResponse(response) {
    return response &&
        response.trim().length >= CONFIG.MIN_RESPONSE_LENGTH &&
        !response.includes(RESPONSES.OUT_OF_SCOPE);
}
/**
 * Gets cached response if available and valid
 */
function getCachedResponse(question) {
    const cached = responseCache.get(question);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.response;
    }
    return null;
}
/**
 * Sets response in cache
 */
function setCachedResponse(question, response) {
    responseCache.set(question, {
        response,
        timestamp: Date.now()
    });
}
/**
 * Main chat function with improved error handling and validation
 */
export async function chat(question) {
    let processedQuestion;

    try {
        processedQuestion = preprocessInput(question);

        const cachedResponse = getCachedResponse(processedQuestion);
        if (cachedResponse) {
            return cachedResponse;
        }

        const retrievalChunks = await vectorStore.similaritySearch(
            processedQuestion,
            CONFIG.MAX_RETRIEVAL_CHUNKS
        );

        if (!retrievalChunks || retrievalChunks.length === 0) {
            return RESPONSES.OUT_OF_SCOPE;
        }

        const context = retrievalChunks
            .map(chunk => chunk.pageContent)
            .filter(content => content && content.trim().length > 0)
            .join('\n\n');

        const systemPrompt = generateSystemPrompt(context, processedQuestion);

        const completion = await openai.chat.completions.create({
            model: CONFIG.MODEL,
            messages: [{ role: "system", content: systemPrompt }],
            temperature: CONFIG.TEMPERATURE,
            max_tokens: CONFIG.MAX_TOKENS
        });

        const response = completion.choices[0]?.message?.content?.trim() || '';

        const finalResponse = isValidResponse(response)
            ? response
            : RESPONSES.OUT_OF_SCOPE;

        if (isValidResponse(response)) {
            setCachedResponse(processedQuestion, finalResponse);
        }

        return finalResponse;

    } catch (error) {
        console.error("Error in chat function:", error.message);

        switch (error.message) {
            case 'EMPTY_QUESTION':
                return RESPONSES.EMPTY_QUESTION;
            case 'GOODBYE':
                return RESPONSES.GOODBYE;
            default:
                console.error('Chat error details:', {
                    question: processedQuestion,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                return RESPONSES.ERROR;
        }
    }
}
export function clearCache() {
    responseCache.clear();
}
export function getCacheStats() {
    return {
        size: responseCache.size,
        keys: Array.from(responseCache.keys())
    };
}