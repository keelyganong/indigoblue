# Indigo Blue website

Three pages: `index.html` (home + archive), `archive.html`, `about.html`.
No build step. Everything is plain HTML, CSS, and JavaScript.

## Mailing list (Kit)
Connected to Kit form 9993459. Sign-ups appear in Kit under Subscribers.
To switch forms later, change the number in `data-kit-form` and `action` in about.html.

## (Reference) How the Kit form was connected
1. In Kit, create a form (Grow > Landing Pages & Forms > Create new > Form > Inline).
2. Publish it, click Embed > HTML, and find the number in the form's action URL,
   e.g. `https://app.kit.com/forms/1234567/subscriptions` → `1234567`.
3. In `about.html`, replace `YOUR_KIT_FORM_ID` with that number.

## Edit the archive
Piece titles, techniques, and places live in `assets/js/items.js`.
Images live in `assets/img/pieces/`.
