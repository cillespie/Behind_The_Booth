# Behind The Booth — Remaining Work

Handoff doc for whoever picks this up next. Full original plan (context, rationale,
architecture diagrams) lives at the plan file this was generated from; this doc is
the actionable checklist of what's **done** vs **left**.

Repo root: `f:\projects\Behind_The_Booth`
Live site: `public/` deployed as-is to Firebase Hosting (project id `behind-the-booth-entertainment`, site `behindtheboothent.com`). No bundler in the serve path — anything in `public/` must run in the browser unmodified.

---

## ✅ Already done (do not redo)

**Phase 1 — site-breaking fixes.** Committed to working tree, not yet git-committed (`git status` shows `public/firebase-init.js`, `public/index.html`, `public/styles.css` modified, nothing staged/committed):
- `public/styles.css`: all 15 occurrences of invalid `grid-template-cols:` fixed to `grid-template-columns:` (this was collapsing every multi-column layout — about/services/gear/booking/footer — to a single stacked column)
- `public/index.html`: literal `**QSC**` / `**Pioneer DJ**` / `**Chauvet DJ**` markdown-bold replaced with real `<strong>` tags
- `public/firebase-init.js`: rewritten to import Firebase from gstatic CDN URLs (pinned `11.10.0`) instead of bare `firebase/app` specifiers, which threw on every page load since nothing bundles this file. Also wrapped `getAnalytics` in `isSupported()` + try/catch so it can't throw in private/blocked contexts.
- `public/index.html`: `og:image` / `twitter:image` meta tags changed from relative (`assets/logo.webp`) to absolute URLs
- `public/index.html` + `public/styles.css`: added a `<noscript>` fallback and a `prefers-reduced-motion` block so `.scroll-reveal` content (opacity:0 until JS adds `.active`) isn't permanently invisible if JS fails or motion is disabled
- `public/styles.css`: fixed dead selector `.ambient-background, .glow-orb` → `.bg-glow` (the real class) in the mobile-perf media query

**Not yet committed to git** — first task for whoever continues should be reviewing this diff and committing it (small, isolated, safe to deploy alone via `firebase deploy --only hosting`).

**Phase 3 — Cloudflare credentials.** `.env.local` (gitignored) now has a **verified, correctly-scoped** API token:
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_ZONE_NAME` all present and confirmed working
- Verified live against the API: MX records correct (3x `route*.mx.cloudflare.net`), the routing rule for `djjondoe@behindtheboothent.com` is active and forwards to `jonhenriques7@yahoo.com`, and that destination is `verified`. **Inbound email routing is confirmed healthy.**
- One permission still missing on the token (`Email Routing Settings:Read`, distinct from `Email Routing Rules:Read`) — the top-level `/zones/{id}/email/routing` status endpoint 403s. Non-blocking; the rules+MX+address checks already proved routing works. Add this permission later only for 100% script coverage.
- ⚠️ **Cleanup needed:** `.env.local` still has a leftover `SECRET_ACCESS_KEY` key from an earlier, wrong R2 token that was created by mistake during setup. That R2 token should have been revoked in the Cloudflare dashboard (R2 → Manage API Tokens) — **verify it was actually revoked**, and delete the stray `SECRET_ACCESS_KEY` line from `.env.local`.

---

## 🔲 Remaining work

### 1. Phase 2 — Booking form → Firestore + Cloud Function (biggest remaining piece)

Firebase project is confirmed **Blaze** plan (billing enabled), so Cloud Functions are available.

Currently the form (`public/index.html` `#bookingForm`, wired up in `public/script.js` §8) POSTs to `https://formsubmit.co/djjondoe@behindtheboothent.com` — third-party, unverified whether that address was ever activated with FormSubmit (if not, every lead so far has been silently dropped).

**Target architecture:**
```
form ──POST /api/booking──> Hosting rewrite ──> submitBooking (v2 HTTPS fn)
                                                   ├─ validate + honeypot + rate limit
                                                   ├─ write Firestore  bookings/{id}
                                                   └─ nodemailer -> smtp.gmail.com
                                                         From: <gmail acct>
                                                         Reply-To: <customer email>
                                                         To: djjondoe@behindtheboothent.com
                                                              (Cloudflare forwards -> jonhenriques7@yahoo.com, already verified working)
```

**Build:**
- `functions/package.json` — `firebase-functions@^6`, `firebase-admin@^13`, `nodemailer@^6`
- `functions/index.js` — `onRequest` v2 handler:
  - honeypot field (`_gotcha`, CSS-hidden input) — non-empty → return `200 OK`, silently drop, no Firestore write, no email
  - per-IP rate limit — Firestore counter doc, ~5 submissions/hour
  - server-side validation — required fields, type checks, length caps (name ≤100, notes ≤2000), email regex, reject wrong `Content-Type`
  - write to `bookings/{id}` via Admin SDK
  - send via `nodemailer` + Gmail SMTP: `From: <gmail account>`, `Reply-To: <customer's submitted email>`, `To: djjondoe@behindtheboothent.com`
- `firestore.rules` — deny all client access (`allow read, write: if false`); only Admin SDK touches this collection
- `firestore.indexes.json` — empty scaffold
- `firebase.json` — add:
  ```jsonc
  "hosting": { "rewrites": [{ "source": "/api/booking", "function": "submitBooking" }] /* keep existing hosting config */ },
  "functions": { "source": "functions" },
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" }
  ```
- **Secrets — Secret Manager, never `.env` or committed:**
  ```
  firebase functions:secrets:set GMAIL_USER
  firebase functions:secrets:set GMAIL_APP_PASSWORD
  firebase functions:secrets:set BOOKING_NOTIFY_TO
  ```
  Needs a Gmail account with 2FA enabled + a 16-char app password (**not** the login password) — not yet created/provided as of this handoff.

**Client changes:**
- `public/script.js` §8: repoint `fetch` target to `/api/booking`
- `public/index.html` `#bookingForm`: remove FormSubmit hidden inputs (`_captcha`, `_subject`, `_template`), add the honeypot input
- Fix existing bug at `public/script.js` around line 304: on error the submit button resets to hardcoded text `"Check Date & Get Quote"`, but the real label (`index.html` line ~605) is `"Check Date & Request Call"`. Capture `submitBtn.textContent` once on load and restore *that*, not a hardcoded string.

**Also delete while touching `script.js`:** the ~70 lines of dead testimonials-carousel handler code in §5 (no matching markup exists anymore — the testimonials section was replaced by a static "Leave a Review" CTA), and the matching CSS block in `public/styles.css` explicitly marked `/* legacy, kept for future use */`.

**Verification for this phase (don't skip #6 — it's the real acceptance test):**
1. `firebase emulators:start --only functions,firestore,hosting`, submit the form against the emulator
2. Confirm a `bookings/{id}` doc appears AND a real email arrives
3. Honeypot: fill `_gotcha` via devtools → expect `200`, no doc, no email
4. Oversize/malformed payload → rejected before write
5. 6 rapid submissions → 6th rate-limited
6. **Deploy, submit one real lead against production, confirm it reaches `djjondoe@behindtheboothent.com` and lands in `jonhenriques7@yahoo.com`'s inbox via Cloudflare routing.** Reply to it — must go to the customer's address (via `Reply-To`), not back to the Gmail sending account.

### 2. Phase 3 (remainder) — formalize the Cloudflare check as a script

The verification itself is done (see above), but it was run as ad-hoc `curl` calls, not a reusable script. Write `scripts/cloudflare-check.mjs`:
- Reads `CLOUDFLARE_API_TOKEN` / `_ACCOUNT_ID` / `_ZONE_ID` / `_ZONE_NAME` from `.env.local`
- Checks, in order: token verify → zone lookup → email routing rules (confirm `djjondoe@behindtheboothent.com` rule exists+enabled) → destination address verified status → MX records present
- Prints a pass/fail checklist, exits non-zero on any failure
- Purely diagnostic / re-runnable sanity check, not part of the deploy pipeline

### 3. Phase 4 — Content & copy

- `public/index.html` (about-section stats, ~line 202): currently reads `"Licensed"` (big number) / `"Highly Rated"` (label) — an orphaned, confusing pairing left over from an earlier script that stripped insurance-related claims. **Decision already made with the client: drop all licensing/insurance claims entirely.** Replace with neutral, verifiable copy, e.g. `100%` / `Personal Accountability` (keep, already accurate) and `DMV` / `Winchester • DC • MD • VA`. Do not invent numbers (e.g. years active, events played) — if wanted, get the real figure from the client first.
- Grep case-insensitive for `licens|insur|bonded` across `public/` to confirm nothing else survived the earlier cleanup pass.
- Close the blank gap in the FAQ section left by the removed insurance FAQ item.
- `public/sitemap.xml` — `lastmod` is stale (`2026-05-26`); update to the actual deploy date each time this ships.

### 4. Phase 5 — Assets & performance

**~4.8MB of dead weight currently ships on every deploy** (confirmed present in the Firebase hosting cache manifest):
| File | Size | Action |
|---|---|---|
| `public/assets/jondoe.jpg` + `jondoe.webp` | 1.3MB combined | referenced **nowhere** in the HTML — delete both |
| `public/assets/icon.png` | 1.9MB | only a WebP-conversion source, never linked directly — move out of `public/` |
| `public/assets/logo.png` | 1.5MB | same — move out |
| `public/assets/Logo2.png` | 1.7MB | same — move out |

Move PNG/JPG *sources* to a repo-root `src-images/` folder (mirrors how `Eventdowntown.jfif` is already handled) so only the final `.webp` files ship in `public/`.

**The image optimizer makes some files *bigger*, not smaller.** `optimize-images.mjs` re-encodes at a flat quality-80 with no size comparison: `Eventdowntown.webp` (156KB) is 68% *larger* than its own `Eventdowntown.png` source (93KB), and the HTML actually serves the bigger `.webp` file. Same problem with `jondoe.webp` vs `jondoe.jpg` (before those files get deleted per above). Fix the script to:
- compare source vs. re-encoded output size, keep whichever is smaller, log the delta
- take explicit input/output dirs instead of converting in place
- wire it up to `npm run optimize` — currently that script runs `optimize.js`, a one-off hardcoded file copy unrelated to the real converter, and `optimize-images.mjs` (the actual bulk converter) isn't wired to any npm script at all

**Loading hints** — no `loading` or `fetchpriority` attribute exists anywhere in `index.html` today:
- `loading="lazy"` on the about-section image, gear-section image, footer logo — all below the fold
- `fetchpriority="high"` + eager (default) on the hero logo — it's the LCP element
- Leave the nav logo eager (always visible)

### 5. Phase 6 — Accessibility

- `aria-expanded` + `aria-controls` on: the hamburger toggle (`#mobileNavToggle`), the 4 gear-accordion trigger buttons, the 3 FAQ trigger buttons. `script.js` already tracks `.active` state at each of these — just toggle the aria attribute alongside the existing `classList` calls (§2, §4, §7)
- Add explicit `type="button"` to all accordion/FAQ trigger `<button>` elements
- The Instagram embed's `<blockquote>` (`index.html` ~line 474) is empty by default — if `embed.js` is blocked (ad blockers, strict privacy modes are common), visitors see a blank box. Add a plain `<a href="https://instagram.com/...">` fallback inside the blockquote; Instagram's script replaces it once/if it loads.
- Add `aria-hidden="true"` to the purely decorative `.laser-scanner` and `.bg-glow` divs

### 6. Phase 7 — Repo hygiene

- **Delete stale root-level duplicates** `script.js` and `styles.css` (repo root, not `public/`). These are older, materially different copies — root version still has the removed testimonials carousel, still POSTs to Formspree instead of the new backend, missing `dvh`/webkit fixes present in `public/styles.css`. Nothing serves these files; they exist only to trap the next person into editing the wrong one.
- Delete `optimize.js` and `remove-insurance.mjs` — one-off migration scripts that already did their job, hardcoded to content that no longer exists.
- `package.json`: move `sharp` to `devDependencies` (build-time only, not shipped). Remove `firebase` from `dependencies` — nothing bundles it, the browser loads it straight from the gstatic CDN now (see Phase 1). Either delete the unused `build`/`preview` Vite scripts, or actually point `firebase.json` at Vite's `dist/` output — right now Hosting deploys `public/` directly and `dist/` is never produced by anything in the deploy path.
- Optional: consider un-ignoring `.firebaserc` (currently in `.gitignore`) — it only holds the project id, which is already public inside `firebase-init.js` anyway, and a fresh clone currently needs a manual `firebase use --add` before it can deploy.
- Clean the stray `SECRET_ACCESS_KEY` line out of `.env.local` (see Phase 3 note above) once the associated R2 token is confirmed revoked.

### 7. Deferred — not in scope for this pass, don't start unprompted

Branded customer-facing confirmation email (sent *as* `djjondoe@behindtheboothent.com` rather than notifying Jonathan). Requires Gmail "Send mail as" alias verification plus adding an SPF record in Cloudflare DNS — needs a DNS-**write** token scope, which is deliberately broader than what's set up now (current token is read-only). Flag this to the client before starting; it's a separate piece of trust/scope.

---

## Suggested order

1. Review + commit the already-made Phase 1 diff, deploy hosting-only, confirm live site actually renders multi-column now
2. Phase 2 (needs a Gmail app password from the client first — nothing else blocks it)
3. Phase 4, 5, 6, 7 — all independent of each other and of Phase 2, safe to parallelize or do in any order
4. Phase 3 script — quick, do whenever convenient
