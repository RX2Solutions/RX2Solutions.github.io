# Contact form Lambda — 2026-08-31 update (not yet deployed)

`src/index.mjs` was updated alongside the site rebuild. Changes:

1. **Phone is now optional.** The site form still marks it required until this
   Lambda version is deployed — after deploying, remove `required` from the
   phone field in `contactus.html` (or drop the field entirely).
2. **Two new fields are stored in Notion** (previously discarded):
   - `help`    -> "What do you need help with?" (the select on the form)
   - `message` -> "Tell us more" (the textarea)

## To deploy (Rob / AWS)

1. In the Notion contacts database, add two properties if they don't exist,
   e.g. **Interested In** (Text) and **Message** (Text).
2. On the Lambda, add environment variables naming those properties exactly:
   - `NOTION_HELP_PROPERTY`    = Interested In
   - `NOTION_MESSAGE_PROPERTY` = Message
   (Both are opt-in: if unset, the Lambda behaves as before and skips them.)
3. Deploy `src/index.mjs` (console upload or the Terraform flow in
   `../infrastructure`).
4. Test one real submission from rx2solutions.com/contactus.html and confirm
   the Notion row carries the help topic and message.
5. Then edit `contactus.html`: remove `required` from the phone input.
