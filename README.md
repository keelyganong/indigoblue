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


## Shop
- **Pieces, prices, and what is for sale:** `assets/js/items.js`. Each piece has a `status` of `available`, `sold`, or `archive`. Available pieces also need a `price` and `size`.
- **Settings:** `assets/js/config.js`.
  - `commissionEmail`: where commission requests are sent. The first request triggers a one-time activation email from FormSubmit; click its link to start receiving requests.
  - `checkout`: paste a checkout link (for example, a Stripe Payment Link) next to each available piece. Until a piece has a link, the cart shows "Checkout opens soon."
- **Links to a piece:** `indigoblue.vercel.app/#piece-name`, for example `#tree-tee`.
