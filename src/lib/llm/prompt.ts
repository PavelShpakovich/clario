import type { GenerateInput } from '@/lib/llm/schema';

const PROMPTS = {
  en: {
    system: `You are an expert educational content creator specializing in flashcard-based learning.
Your task is to generate comprehensive, well-structured info cards that teach real knowledge.

**CRITICAL FORMATTING RULES (must be followed exactly):**

- **Headings:** Every section in the card body MUST start with "## " (two hashes and a space).  
  Correct: \`## How It Works\`  
  Incorrect: \`How It Works\` (missing ##) or \`### How It Works\` (wrong level)  
  Use 2–4 such headings per card.

- **Bold text:** Use \`**bold**\` for key terms on first mention.

- **Lists:** Use bullet lists with \`- \` for items; use numbered lists with \`1. \` for steps. Never write a list as plain prose.

- **Inline code:** Use \`backticks\` for identifiers, commands, function names, types, etc.

- **Code blocks:** Use fenced code blocks with a language tag for multi-line examples.

- **Blockquotes:** Use \`> \` for key takeaways.

- Write explanatory paragraphs between headings, not just lists. Aim for 150–400 words per card body.

- No explanation outside the JSON. No numbering before card titles.
- Output ONLY a valid JSON object with a "cards" array containing exactly the requested number of items.
- Structure: {"cards": [{"title": "Title 1", "body": "## Section 1\\nBody...\\n## Section 2\\n..."}, ...]}`,
    context: 'Based on the following source material:\n\n---\n',
    avoid: '\nDo NOT generate cards about these topics that are already covered:\n',
    instructions: (count: number, theme: string) =>
      `Generate exactly ${count} info card(s) for the topic: "${theme}".`,
    requirements: [
      '- Cover a distinct, meaningful concept (not just a surface detail)',
      '- Be well-structured with Markdown headings (##), bold terms, and lists (- or 1.)',
      '- Include context, examples, or code snippets where relevant',
      '- Be diverse and non-overlapping with other cards',
    ].join('\n'),
    final: (count: number) =>
      `Return ONLY a JSON object with a "cards" array containing exactly ${count} cards.\nDo not stop until you have generated all ${count} cards.\nREMEMBER: Every subheading in the body MUST start with "## ". No plain text headings.`,
  },
  ru: {
    system: `Вы — эксперт по созданию образовательного контента, специализирующийся на микрообучении.
Ваша задача — создавать полноценные, хорошо структурированные информационные карточки, передающие реальные знания.

**КРИТИЧЕСКИЕ ПРАВИЛА ФОРМАТИРОВАНИЯ (должны соблюдаться точно):**

- **Заголовки:** Каждый раздел в теле карточки ДОЛЖЕН начинаться с "## " (два знака решетки и пробел).  
  Правильно: \`## Как это работает\`  
  Неправильно: \`Как это работает\` (отсутствует ##) или \`### Как это работает\` (неверный уровень)  
  Используйте 2–4 таких заголовка на карточку.

- **Выделение жирным:** Используйте \`**жирный шрифт**\` для ключевых терминов при первом упоминании.

- **Списки:** Используйте маркированные списки с \`- \` для перечислений, или нумерованные с \`1. \` для шагов. Никогда не пишите список сплошным текстом.

- **Инлайн-код:** Используйте \`обратные кавычки\` для идентификаторов, команд, имён функций, типов и коротких фрагментов кода.

- **Блоки кода:** Используйте блоки кода с указанием языка для многострочных примеров.

- **Цитаты:** Используйте \`> \` для ключевых выводов.

- Пишите объяснительные абзацы между заголовками, а не только списки. Целевой объём: 150–400 слов для текста карточки.

- Без пояснений вне JSON. Без нумерации перед заголовками карточек.
- Выводите ТОЛЬКО валидный JSON объект с массивом "cards", содержащим ровно запрошенное количество элементов.
- Структура: {"cards": [{"title": "Заголовок 1", "body": "## Секция 1\\nТекст...\\n## Секция 2\\n..."}, ...]}`,
    context: 'На основе следующего исходного материала:\n\n---\n',
    avoid: '\nНЕ создавайте карточки на следующие темы, так как они уже были освещены:\n',
    instructions: (count: number, theme: string) =>
      `Создайте ровно ${count} информационных карточек по теме: "${theme}".`,
    requirements: [
      '- Раскрывать отдельную, значимую концепцию (не просто деталь)',
      '- Быть хорошо структурированной с заголовками Markdown (##), выделенными терминами и списками (- или 1.)',
      '- Включать контекст, примеры или фрагменты кода там, где это уместно',
      '- Быть разнообразной и не дублировать другие карточки',
    ].join('\n'),
    final: (count: number) =>
      `Верните ТОЛЬКО JSON объект с массивом "cards", содержащим ровно ${count} карточек.\nНе останавливайтесь, пока не сгенерируете все ${count} карточек.\nПОМНИТЕ: каждый подзаголовок в теле карточки ДОЛЖЕН начинаться с "## ". Никаких заголовков без "## ".`,
  },
};

/**
 * Sanitize user-provided text before embedding it in an LLM prompt.
 * Strips XML-like tags that could escape the delimiters used to isolate user data,
 * and removes common prompt-injection prefixes.
 */
function sanitizeUserInput(text: string): string {
  return (
    text
      // Remove any attempt to close or open our XML-style delimiters
      .replace(/<\/?user-content[^>]*>/gi, '')
      .replace(/<\/?source-material[^>]*>/gi, '')
      // Strip null bytes and other control characters (except newlines/tabs)
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
  );
}

/**
 * Builds the system + user prompt for info card generation.
 * All providers use this same template — consistent output format regardless of model.
 *
 * User-supplied content is wrapped in XML-style delimiters to clearly separate
 * data from instructions, mitigating prompt injection attacks.
 */
export function buildPrompt(input: GenerateInput): { system: string; user: string } {
  const lang = input.language || 'en';
  const t = PROMPTS[lang];

  // Sanitize all user-controlled inputs before embedding in the prompt
  const safeTopic = sanitizeUserInput(input.theme);
  const safeDescription = input.description ? sanitizeUserInput(input.description) : undefined;
  const safeSourceText = input.sourceText
    ? sanitizeUserInput(input.sourceText.slice(0, 8000))
    : undefined;
  const safeTopicsToAvoid = input.topicsToAvoid?.map(sanitizeUserInput) ?? [];

  // Wrap source material in XML delimiters to isolate it from instructions
  const contextBlock = safeSourceText
    ? `${t.context}<source-material>\n${safeSourceText}\n</source-material>\n\n`
    : '';

  const descriptionBlock = safeDescription
    ? lang === 'ru'
      ? `\nОписание темы: <user-content>${safeDescription}</user-content>\n`
      : `\nTheme description: <user-content>${safeDescription}</user-content>\n`
    : '';

  const avoidBlock =
    safeTopicsToAvoid.length > 0 ? `${t.avoid}- ${safeTopicsToAvoid.join('\n- ')}\n` : '';

  const languageBlock = lang === 'ru' ? '\nВсё содержимое должно быть на русском языке.' : '';

  const user = `${contextBlock}${t.instructions(
    input.count,
    safeTopic,
  )}${descriptionBlock}${avoidBlock}${languageBlock}
${lang === 'ru' ? 'Каждая карточка должна:' : 'Each card must:'}
${t.requirements}

${t.final(input.count)}`;

  return { system: t.system, user };
}
