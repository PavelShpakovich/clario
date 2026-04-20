# AI Astrology Pivot

## Role Of This Document

This file is a product-direction note for the astrology pivot.

Use it for:

- product intent
- stable direction decisions
- trust and UX principles
- near-term priorities
- explicit non-goals

Do not use it as the engineering source of truth. Current implementation details live in [docs/system-context.md](../system-context.md).

## Current Direction

Clario is a web-first astrology product built around three layers:

1. deterministic chart calculation
2. structured AI interpretation
3. persistent user workspace for charts, reports, forecasts, and follow-up questions

The product should feel like a premium personal insight workspace, not a casual horoscope generator.

## Locked Decisions

- The astrology product is the reference product. Legacy learning-domain behavior is not a compatibility target.
- Russian is the reference product language. English can remain supported, but it is secondary.
- The product must separate calculated astrology facts from narrative interpretation.
- Qwen is the hosted LLM path for the current product stage.
- Public billing is not a core dependency of the current loop.
- If access gating is needed, prefer internal limits or admin-managed access over checkout-heavy flows.

## Product Principles

- Web-first, mobile-competent experience.
- High-trust presentation over mystical theatrics.
- Structured outputs first, freeform prose second.
- Birth data privacy is a core product concern.
- Uncertainty must be visible when birth precision is weak.
- Important AI actions should fail into recoverable saved states, not disappear silently.

## Trust Model

- Never present interpretation as guaranteed truth.
- Clearly distinguish chart data from interpretation.
- Avoid fear-based, manipulative, or fatalistic language.
- Keep medical, legal, and financial advice out of scope.
- Make missing or approximate birth-time limitations visible in the experience.

## Primary User Types

### Curious individual

- wants a first clear explanation of their natal chart
- values simple onboarding and readable language

### Returning self-reflection user

- wants saved charts, saved reports, forecasts, and follow-up continuity
- values a workspace they can return to over time

### Relationship-oriented user

- wants compatibility insight grounded in two charts
- values clear explanation of strengths, friction, and dynamics

### Advanced enthusiast

- wants multiple charts and more depth over time
- may eventually need export, sharing, or client-style workflows

## Current Product Shape

The core product loop is:

1. create an account
2. add birth data and create a chart
3. calculate deterministic chart data
4. generate a structured reading
5. return to saved readings, compatibility reports, and daily forecasts
6. ask follow-up questions tied to a reading

At a product level, the current active surfaces are:

- charts
- readings
- compatibility
- daily forecast
- follow-up chat
- dashboard and settings
- admin oversight

## Content And UX Guidance

- Russian copy should sound natural, modern, and trustworthy.
- The first reading should be understandable to a non-astrologer.
- Tone should be warm, calm, and psychologically literate.
- The product should feel precise and grounded, not vague or ornamental.
- Legal and privacy copy must describe the real system, not aspirational behavior.

## Near-Term Priorities

These are the highest-value product priorities from here:

1. keep documentation and user-facing copy aligned with the real system
2. continue improving trust and recovery states around generation failures
3. sharpen the landing and product UX so it feels more premium and coherent
4. reduce remaining legacy drift in naming, copy, and dead code
5. improve the depth and clarity of the astrology experience without weakening reliability

## Explicit Non-Goals For This Stage

- rebuilding the old learning product
- making public billing the center of the user loop
- Telegram-first product strategy
- marketplace or community features
- voice-first experiences
- broad multi-provider LLM architecture without a concrete product need

## Working Rule

If legacy code, old documentation, or stale copy conflicts with the astrology direction, the astrology direction wins.

## Related Documents

- [docs/system-context.md](../system-context.md) — implementation and architecture reference
- [README.md](../../README.md) — setup, runtime, and repository overview
