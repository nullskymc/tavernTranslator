# PNG Processing Reference

This project stores SillyTavern character-card data inside PNG text chunks.

## Embedded Payload Format
- Common modern format: PNG `tEXt` or `zTXt` chunk with keyword `chara`.
- The text payload is base64-encoded JSON.
- Legacy format may start with `chara\0` followed by base64 JSON.

## Extraction Rules
1. Verify the file is a PNG by checking the PNG signature.
2. Scan chunks in order.
3. Inspect `tEXt` and `zTXt` chunks.
4. If the keyword is `chara`, base64-decode the text and parse the JSON.
5. If the text begins with `chara\0`, strip the prefix and decode the remaining base64 payload.
6. If no embedded payload is found, treat the PNG as a plain image and ask for JSON input or a different source.

## Rewrite Rules
1. Remove existing text chunks that would conflict with the new payload.
2. Preserve all non-text chunks.
3. Encode the card JSON as UTF-8 JSON text.
4. Base64-encode that JSON.
5. Insert a new `tEXt` chunk with keyword `chara`.
6. Place the new chunk before `IEND`.

## Data Shape Notes
- Some payloads wrap the actual card under a top-level `data` key.
- If the card contains only `data`, use the nested object as the actual embedded payload.
- Keep the card structure stable when translating so round-tripping remains predictable.
