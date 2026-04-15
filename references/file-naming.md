# File Naming Reference

## Sanitizing Names
- Replace whitespace with underscores.
- Remove invalid filename characters: `\ / * ? : " < > |`
- Trim leading and trailing `.` `_` and spaces.
- Fall back to `未命名` when the name becomes empty.

## Duplicate Handling
- Compute a SHA-256 hash of the incoming content.
- If the target filename already exists:
  - if the content hash matches, reuse the existing file
  - if the content hash differs, append a short hash suffix before `.png`

## When To Use
- Use this logic when writing translated PNGs or saving extracted uploads.
- Do not create duplicate files when the image content is identical.
