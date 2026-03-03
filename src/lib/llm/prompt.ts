import type { GenerateInput } from '@/lib/llm/schema';

const PROMPTS = {
  en: {
    system: `You are an expert educational content creator specializing in microlearning.
Your task is to generate comprehensive, meaningful info cards that teach real knowledge.

Rules:
- Each card teaches one important concept or principle in depth.
- NO quiz format. NO questions. Pure informational content.
- Title: short headline, ≤ 10 words, clear and specific.
- Body: 5-10 sentences or more. Explain the concept thoroughly with examples, context, and implications.
  Include why it matters, how it works, and practical applications when relevant.
  Make it meaningful and educational, not just brief summaries.
- Use clear, readable language. No unnecessary jargon, but don't oversimplify.
- No numbering, no bullet points, no prefixes. Write as flowing paragraphs.
- No markdown, no code fences, no explanation outside the JSON.
- Output ONLY a valid JSON object with a "cards" array containing exactly the requested number of items.
- Structure: {"cards": [{"title": "Title 1", "body": "Body 1"}, {"title": "Title 2", "body": "Body 2"}, ...]}`,
    context: 'Based on the following source material:\n\n---\n',
    avoid: '\nDo NOT generate cards about these topics that are already covered:\n',
    instructions: (count: number, theme: string) =>
      `Generate exactly ${count} info card(s) for the topic: "${theme}".`,
    requirements: [
      '- Cover a distinct, meaningful concept (not just a surface detail)',
      '- Be comprehensive enough to teach something valuable (5-10+ sentences)',
      '- Include context, examples, or explanations of why it matters',
      '- Be diverse and non-overlapping with other cards',
    ].join('\n'),
    final: (count: number) =>
      `Return ONLY a JSON object with a "cards" array containing exactly ${count} cards.\nDo not stop until you have generated all ${count} cards.`,
  },
  ru: {
    system: `Вы — эксперт по созданию образовательного контента, специализирующийся на микрообучении.
Ваша задача — создавать полноценные, содержательные информационные карточки, передающие реальные знания.

Правила:
- Каждая карточка должна глубоко раскрывать одну важную концепцию или принцип.
- БЕЗ викторин. БЕЗ вопросов. Только чистый информационный контент.
- Заголовок: короткий, ≤ 10 слов, четкий и конкретный.
- Текст: 5-10 предложений и более. Тщательно объясните концепцию с примерами, контекстом и выводами.
  Включите объяснения того, почему это важно, как это работает, и практическое применение.
  Делайте материал осмысленным и образовательным, а не просто кратким конспектом.
- Используйте понятный язык. Без лишнего жаргона, но и не слишком упрощенно.
- Без нумерации, без списков, без префиксов. Пишите связным текстом (абзацами).
- Без markdown, без блоков кода, без пояснений вне JSON.
- Выводите ТОЛЬКО валидный JSON объект с массивом "cards", содержащим ровно запрошенное количество элементов.
- Структура: {"cards": [{"title": "Заголовок 1", "body": "Текст 1"}, {"title": "Заголовок 2", "body": "Текст 2"}, ...]}`,
    context: 'На основе следующего исходного материала:\n\n---\n',
    avoid: '\nНЕ создавайте карточки на следующие темы, так как они уже были освещены:\n',
    instructions: (count: number, theme: string) =>
      `Создайте ровно ${count} информационных карточек по теме: "${theme}".`,
    requirements: [
      '- Раскрывать отдельную, значимую концепцию (не просто деталь)',
      '- Быть достаточно полной, чтобы научить чему-то ценному (5-10+ предложений)',
      '- Включать контекст, примеры или объяснения важности',
      '- Быть разнообразной и не дублировать другие карточки',
    ].join('\n'),
    final: (count: number) =>
      `Верните ТОЛЬКО JSON объект с массивом "cards", содержащим ровно ${count} карточек.\nНе останавливайтесь, пока не сгенерируете все ${count} карточек.`,
  },
};

/**
 * Builds the system + user prompt for microlearning info card generation.
 * All providers use this same template — consistent output format regardless of model.
 */
export function buildPrompt(input: GenerateInput): { system: string; user: string } {
  const lang = input.language || 'en';
  const t = PROMPTS[lang];

  const contextBlock = input.sourceText
    ? `${t.context}${input.sourceText.slice(0, 8000)}\n---\n\n`
    : '';

  const avoidBlock =
    input.topicsToAvoid && input.topicsToAvoid.length > 0
      ? `${t.avoid}- ${input.topicsToAvoid.join('\n- ')}\n`
      : '';

  const languageBlock = lang === 'ru' ? '\nВсё содержимое должно быть на русском языке.' : '';

  const user = `${contextBlock}${t.instructions(
    input.count,
    input.theme,
  )}${avoidBlock}${languageBlock}
${lang === 'ru' ? 'Каждая карточка должна:' : 'Each card must:'}
${t.requirements}

${t.final(input.count)}`;

  return { system: t.system, user };
}
