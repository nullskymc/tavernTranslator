# Tavern Translator Skill

This repository is now maintained as a Codex skill package for translating SillyTavern character cards.

## What Changed

- The old web app, backend server, Docker setup, and frontend were removed.
- The repository now centers on:
  - `SKILL.md` for Codex skill behavior
  - `references/` for PNG processing, translation rules, and file naming

## How To Install In Codex

Copy the skill into your local Codex skills directory:

```bash
mkdir -p "$HOME/.codex/skills/tavern-translator"
cp /Volumes/app/DevelopProject/tavernTranslator/SKILL.md "$HOME/.codex/skills/tavern-translator/"
cp -R /Volumes/app/DevelopProject/tavernTranslator/references "$HOME/.codex/skills/tavern-translator/"
```

Then start a new Codex session. The skill will be available automatically.

## How To Use

In a new session, ask Codex to:

- translate a SillyTavern character card to Chinese
- extract embedded JSON from a PNG card
- rewrite a translated card back into PNG
- apply glossary rules consistently

## Skill Files

- `SKILL.md` defines when the skill should trigger and how the workflow should proceed.
- `references/png-processing.md` documents PNG card extraction and rewrite rules.
- `references/translation-rules.md` documents field mapping and translation constraints.
- `references/file-naming.md` documents output naming and duplicate handling.
