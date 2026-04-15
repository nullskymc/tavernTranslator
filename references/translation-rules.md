# Translation Rules Reference

## Field Mapping
- `description` -> description template
- `first_mes` -> dialogue template
- `mes_example` -> dialogue template
- `alternate_greetings` -> dialogue template
- `character_book.content` -> base template
- all other fields -> base template

## Translation Constraints
- Translate only the content that needs translation.
- Preserve empty strings.
- Keep the original nesting and keys.
- Normalize array-style field names such as `alternate_greetings[0]` before mapping.
- Preserve markdown, punctuation, placeholders, and code-like tokens unless the user explicitly asks for a rewrite.

## Glossary Rules
- Treat the glossary as mandatory.
- If a term appears in the glossary, use the exact prescribed translation.
- Do not rewrite glossary terms for style, fluency, or brevity.

## Practical Guidance
- For output consistency, translate each field in isolation.
- Prefer deterministic phrasing over creative rewriting.
- If a user provides custom prompts, keep the prompt scope aligned with the field mapping above.
