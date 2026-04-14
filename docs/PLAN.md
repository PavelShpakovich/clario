# Clario — UI/UX & Cleanup Master Plan

_Дата: 14 апреля 2026_

## Контекст

Clario — AI-астрологический продукт на Next.js + Supabase, CIS-first, тёмная тема по умолчанию.
Проблемы: плохой UI, нечитаемая натальная карта, Unicode-символы знаков зодиака, Telegram-код, неиспользуемые LLM-провайдеры, нет mobile-first подхода.

---

## Задачи

### 1. ✅ Write plan (этот файл)

### 2. Удаление Telegram

Удалить полностью — страницы, API-маршруты, компоненты, библиотеки:

**Удалить файлы:**

- `src/app/tg/` (layout.tsx + page.tsx)
- `src/app/api/telegram/` (setup/route.ts + webhook/route.ts)
- `src/app/api/auth/telegram/route.ts`
- `src/app/api/profile/link-telegram/route.ts`
- `src/components/telegram-loader.tsx`
- `src/components/telegram-provider.tsx`
- `src/components/dashboard/tg-settings-bar.tsx`
- `src/lib/auth/telegram-link.ts`

**Почистить ссылки в:**

- `src/components/root-providers.tsx` — убрать TelegramLoader
- `src/components/layout/header.tsx` — убрать isTelegramWebApp/TgSettingsBar
- `src/app/layout.tsx` — убрать Telegram SDK Script
- `src/lib/auth/options.ts` — убрать telegram provider
- `src/lib/auth/merge-accounts.ts` — telegram_id поля
- `src/lib/env.ts` — TELEGRAM\_\* переменные
- `src/services/auth-api.ts` — exchangeTelegramInitData
- `src/services/profile-api.ts` — linkTelegram
- `src/components/auth/login-form.tsx` — Telegram кнопку
- `src/components/layout/landing-footer.tsx` — Telegram ссылки
- `src/components/common/back-link.tsx` — isTelegramWebApp

### 3. Удаление не-Qwen LLM ссылок

- `src/lib/env.ts` — убрать TELEGRAM\_\* из схемы
- `src/lib/llm/structured-generation.ts` — убрать mock-ветки внутри production code (оставить только для тестов)
- Убрать OPENAI* / ANTHROPIC* / GROQ* / GEMINI* / OLLAMA\_ из env если есть

### 4. Кастомные SVG-иконки (знаки зодиака + планеты)

Создать `src/components/ui/astrology-icons.tsx`:

- 12 знаков зодиака: минималистичные SVG-пути, геометрические символы (вместо Unicode ♌♈)
- 10 планет: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
- Каждая иконка — React-компонент с `size`, `color`, `className` пропсами
- Цветовая кодировка по стихиям (Огонь=красный, Земля=зелёный, Воздух=голубой, Вода=синий)

### 5. Редизайн дизайн-системы (globals.css)

**Концепция:** "Refined Dark Cosmos" — строгая, элегантная, не кричащая

- Основной цвет: глубокий индиго (#0D0D1F)
- Акцент: тёплое золото (amber/gold) → oklch(0.75 0.18 85)
- Карточки: чуть светлее фона
- Типографика: добавить Google Font Playfair Display для заголовков
- Скругления: умеренные (0.75rem)
- Mobile-first переменные

### 6. Редизайн натальной карты (chart-wheel.tsx)

**Принципы (best practices из research):**

- Mobile: колесо по ширине экрана, максимум 100vw - 2rem
- Заменить Unicode-символы на встроенные path-based SVG глифы
- Увеличить зону знаков, сделать её более читаемой
- Планеты: цветные точки + русская аббревиатура (колесо) + тултип при hover/tap
- Аспекты: показывать только major аспекты (5 типов), уменьшить интенсивность
- В мобиле: под колесом отдельный скролл-список планет с позициями
- Убрать перегруженность — меньше деталей, больше читаемости

### 7. Редизайн Landing page (/)

- Hero: полноэкранный с аура/туманность-эффектом (CSS gradient)
- Секции: возможности, как работает, примеры разборов
- Mobile-first layout, крупные кнопки CTA

### 8. Редизайн Auth (login/register/forgot-password)

- Разделить экран: левая колонка — декоративная (астро-паттерн), правая — форма
- На мобиле — только форма
- Современный look через auth-shell

### 9. Редизайн Onboarding

- Пошаговый wizard с прогресс-баром
- Большие, удобные поля ввода
- Mobile-first

### 10. Редизайн Dashboard

- Greeting card с именем и датой
- Stats grid (2x2 на мобиле)
- Recent charts/readings в карточках
- Quick action FAB или кнопки

### 11. Редизайн Charts list + Chart detail

- Charts list: grid 1→2→3 со skeleton на мобиле
- Chart detail: колесо сверху, таблице планет снизу с кастомными иконками

### 12. Редизайн Readings + Chat

- Readings list: timeline-стиль
- Reading detail: аккордеон с секциями
- Chat: bubble-стиль улучшен, visible send area

### 13. Редизайн Header

- Compact mobile header (hamburger menu)
- Logo + nav items
- User avatar dropdown

### 14. Ревью кода компонентов

- Перепроверить каждый компонент на: Server vs Client разделение, дублирование, типы

### 15. Верификация

- `npx tsc --noEmit`
- `npx jest --coverage`

---

## Прогресс

| #   | Задача                   | Статус |
| --- | ------------------------ | ------ |
| 1   | Plan                     | ✅     |
| 2   | Удаление Telegram        | 🔄     |
| 3   | Очистка LLM              | ⏳     |
| 4   | SVG-иконки знаков/планет | ⏳     |
| 5   | Дизайн-система           | ⏳     |
| 6   | Chart wheel redesign     | ⏳     |
| 7   | Landing page             | ⏳     |
| 8   | Auth pages               | ⏳     |
| 9   | Onboarding               | ⏳     |
| 10  | Dashboard                | ⏳     |
| 11  | Charts                   | ⏳     |
| 12  | Readings + Chat          | ⏳     |
| 13  | Header                   | ⏳     |
| 14  | Code review              | ⏳     |
| 15  | tsc + tests              | ⏳     |
