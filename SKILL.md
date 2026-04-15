---
name: tavern-translator
description: Translate SillyTavern character cards, including PNG embedded card extraction and rewrite, field mapping, and glossary-aware translation.
---

# Tavern Translator

## When To Use
- User wants to translate a SillyTavern character card.
- User wants to extract or rewrite card data embedded in a PNG.
- User wants field-by-field translation with glossary constraints.

## Core Workflow
1. Identify the input type: PNG or JSON.
2. If the input is PNG, follow the PNG reference to extract the embedded character payload.
3. Determine which fields need translation.
4. Map fields consistently:
   - `description` -> description template
   - `first_mes`, `mes_example`, `alternate_greetings` -> dialogue template
   - everything else -> base template
   - normalize array-style field names such as `alternate_greetings[0]`
5. Skip empty text and preserve the original value when there is nothing to translate.
6. Enforce the glossary exactly. Do not replace mandated terms with alternatives.
7. Preserve the original data shape and nested structure.
8. If the output must be PNG, rewrite the embedded payload using the PNG reference.

## Hard Rules
- Do not assume a web UI, backend server, Docker image, or deployment flow exists.
- Do not invent fields or rename existing ones.
- Keep formatting tokens, placeholders, code blocks, and structured markup unchanged unless the user asks otherwise.
- If the target output is unclear, ask whether the user wants JSON, PNG, or both.

## References
- [PNG processing](references/png-processing.md)
- [Translation rules](references/translation-rules.md)
- [File naming](references/file-naming.md)
