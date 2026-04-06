# Client Content Inbox

Use `_inbox/` for client-provided source material, raw conversions, and implementation notes that should stay versioned in git but never be published by Jekyll.

Recommended structure:

```text
_inbox/
  2026-04-client-word-import/
    00-source/
    10-converted/
      media/
    20-implementation-notes/
```

Recommended workflow:
1. Put the original `.docx` in `00-source/`.
2. If the Word file contains tracked changes, keep the original and save a second accepted-changes copy for final-content conversion.
3. Convert the accepted `.docx` to Markdown in `10-converted/`.
4. Capture target pages, new pages, and implementation notes in `20-implementation-notes/page-map.md`.

Suggested `pandoc` command:

```bash
pandoc "_inbox/2026-04-client-word-import/00-source/client-accepted.docx" \
  -f docx \
  -t gfm \
  --wrap=none \
  --extract-media="_inbox/2026-04-client-word-import/10-converted/media" \
  -o "_inbox/2026-04-client-word-import/10-converted/full-export.md"
```
