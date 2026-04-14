// ============================================
// AI Integration — Anthropic Claude
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import type { AIAction, AIRequest, AIResponse } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_PROMPT = `You are MedMind AI, an expert medical education assistant built into a mind mapping application. You help medical students, residents, and physicians organize, understand, and retain medical knowledge.

Core principles:
- Be accurate, evidence-based, and clinically relevant
- Use clear, structured explanations
- Include clinical correlations and high-yield exam points
- When generating mind map nodes, format as clean JSON
- Prioritize active recall and spaced repetition principles
- Reference established medical guidelines where relevant
- Flag when information might vary by region/guidelines

When generating structured data (nodes, quizzes), output ONLY valid JSON with no markdown formatting or backticks.`;

const ACTION_PROMPTS: Record<string, (topic: string, context?: string) => string> = {
  expand: (topic, context) => `Generate exactly 5-7 subtopics for the medical topic "${topic}"${context ? ` in the context of ${context}` : ''}. 
Format as JSON array: [{"title":"...","desc":"concise clinical description","tags":["tag1","tag2"]}]
Make subtopics specific, clinically relevant, and exam-worthy. Only output the JSON.`,

  explain: (topic) => `Explain "${topic}" for a medical student. Structure:
1. Definition (1-2 sentences)
2. Pathophysiology / Mechanism
3. Clinical Significance
4. Key Points to Remember (3-5 bullet points)
5. Common Exam Question Angles
Keep under 300 words. Be precise and clinically oriented.`,

  quiz: (topic) => `Create 5 USMLE/PLAB-style MCQ questions about "${topic}". 
Format as JSON: {"questions":[{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctIndex":0,"explanation":"..."}]}
Make questions test understanding, not just recall. Include clinical vignettes where appropriate. Only output JSON.`,

  mnemonic: (topic) => `Create 2-3 memorable mnemonics for "${topic}". For each:
- The mnemonic itself (make it catchy and memorable)
- What each letter/word stands for
- A brief clinical context for when to use it
Format clearly with headers.`,

  clinical: (topic) => `Provide clinical pearls for "${topic}":
1. Key Clinical Features (what to look for)
2. Important Differentials (top 3-5)
3. Red Flags / Alarm Signs
4. Essential Investigations
5. Management Highlights
6. Common Pitfalls
Keep practical, concise, and high-yield.`,

  connections: (topic) => `List 5-6 medical topics closely related to "${topic}" with clinical connections.
Format as JSON: [{"title":"...","connection":"how it relates clinically","importance":"high|medium|low"}]
Focus on connections that aid understanding and exam preparation. Only output JSON.`,

  simplify: (topic) => `Simplify "${topic}" using:
1. A real-world analogy (relate to everyday experience)
2. The "explain like I'm 5" version
3. 3-4 key points in simple language
4. One clinical scenario that brings it all together
Make it memorable and easy to grasp.`,

  mindmap: (topic) => `Create a comprehensive mind map structure for "${topic}" suitable for medical study.
Include 4-6 main branches, each with 2-4 sub-branches.
Format as JSON: {"title":"${topic}","children":[{"title":"...","desc":"...","color":"#hex","children":[{"title":"...","desc":"..."}]}]}
Use these colors: branches should alternate between #06d6a0, #7c3aed, #f72585, #00b4d8, #fbbf24.
Make it comprehensive but organized. Only output JSON.`,

  summarize: (topic) => `Provide a concise, exam-focused summary of "${topic}" in under 200 words. Include only the highest-yield information.`,

  differential: (topic) => `Create a differential diagnosis framework for "${topic}".
Format as JSON: [{"diagnosis":"...","key_features":"...","distinguishing":"what makes it different","likelihood":"common|uncommon|rare"}]
Rank by clinical likelihood. Only output JSON.`,

  pharmacology: (topic) => `Cover the pharmacology of "${topic}":
1. Drug Class & Mechanism of Action
2. Key Indications
3. Important Side Effects (common + serious)
4. Contraindications
5. Drug Interactions to Know
6. Monitoring Parameters
7. High-Yield Exam Points`,

  anatomy: (topic) => `Cover the anatomy of "${topic}":
1. Key Structures & Relations
2. Blood Supply
3. Nerve Supply
4. Clinical Relevance
5. Common Pathologies
6. Surface Anatomy / Landmarks
7. Surgical Considerations`,
};

export async function processAIRequest(request: AIRequest): Promise<AIResponse> {
  const { action, topic, context, customPrompt } = request;

  let prompt: string;
  if (action === 'custom' && customPrompt) {
    prompt = `Regarding the medical topic "${topic}": ${customPrompt}`;
  } else {
    const promptFn = ACTION_PROMPTS[action];
    if (!promptFn) throw new Error(`Unknown AI action: ${action}`);
    prompt = promptFn(topic, context);
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content
    .filter((block) => block.type === 'text')
    .map((block) => {
      if (block.type === 'text') return block.text;
      return '';
    })
    .join('');

  // Try parsing JSON for structured responses
  let structured: any = undefined;
  if (['expand', 'connections', 'quiz', 'mindmap', 'differential'].includes(action)) {
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      structured = JSON.parse(cleaned);
    } catch (e) {
      // If JSON parsing fails, content remains as text
    }
  }

  return {
    action,
    content,
    structured,
    tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    model: 'claude-sonnet-4-20250514',
  };
}

// Rate limiting check
export function checkAILimit(tier: string, queriesUsed: number): { allowed: boolean; limit: number; remaining: number } {
  const limits: Record<string, number> = { free: 10, pro: 100, team: 500 };
  const limit = limits[tier] || 10;
  return {
    allowed: queriesUsed < limit,
    limit,
    remaining: Math.max(0, limit - queriesUsed),
  };
}
