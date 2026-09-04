# Feature 08 — Resume upload

**Depends on:** 04
**Status:** done
**Completed At:** 2026-09-02T16:31:20+05:30

## Goal

A CV PDF goes in, plain text comes out and is stored. Three extraction
paths with graceful degradation, so a user with an awkward PDF is never
stuck.

**No blob storage.** The PDF is parsed on upload and discarded; only the
extracted text persists. Nothing downstream reads the binary.

## In scope

- `POST /api/resumes` — multipart upload, parse, store.
- `POST /api/resumes/paste` — the text fallback.
- `GET /api/resumes`, `DELETE /api/resumes/[id]`,
  `POST /api/resumes/[id]/activate`.
- The three-path extraction chain.
- The upload UI with drag-and-drop.

## Out of scope

- Structuring the text into skills and experience — feature 09.
- The onboarding flow that wraps this — feature 10.

## Implementation

### The extraction chain

Three paths, tried in order:

1. **`pdf-parse`** — free, no tokens, handles most CVs.
2. **Claude's native document block** — send the PDF as a base64
   `document` block when `pdf-parse` yields too little text. Costs
   tokens; handles scanned and image-based PDFs that `pdf-parse` cannot.
3. **User paste** — the escape hatch when both fail.

Record which path produced the text in `Resume.parseSource`.

### The `pdf-parse` serverless trap

`pdf-parse@1.1.1`'s entry file reads a test fixture at import time when
`!module.parent`. Bundlers either trip on it or ship a phantom file
dependency. **Apply both fixes:**

```ts
import pdf from "pdf-parse/lib/pdf-parse.js";   // the lib entry, not the package root
```

```ts
// next.config.ts — added in feature 01
serverExternalPackages: ["pdf-parse"],
```

The route must be `runtime = "nodejs"`. It will not run on Edge.

**This works locally and fails on Vercel if you get it wrong**, which is
why the verification below insists on a real deploy. `unpdf` is the
serverless-native drop-in if `pdf-parse` keeps fighting the bundler.

### The emptiness check

Scanned and image-only PDFs parse to empty or whitespace **with no
error**. Check `charCount` against a floor of ~400 characters. Below it,
fall through to path 2, then to path 3.

The error copy is already written in `../ui-context.md` and must be used
verbatim:

> Couldn't read that PDF. Try a text-based PDF, or paste your CV
> instead.

Return it as `422 PDF_UNREADABLE` with the paste route offered as the
next action. The error says what happened and what to do — no apology,
no vagueness.

### Validation

Gate before parsing: MIME type `application/pdf`, size ceiling (5 MB is
generous for a CV), and a page count ceiling.

### Active resume

`User.activeResumeId` enforces one active CV without a partial unique
index. Uploading sets the new resume active. Deleting the active resume
is blocked when it is the only one.

### Normalization

Collapse runs of whitespace, normalize line endings, strip page-number
artifacts. `rawText` is what feeds every match evaluation, so noise here
costs tokens on every job scored.

## Files

- `app/api/resumes/route.ts`
- `app/api/resumes/paste/route.ts`
- `app/api/resumes/[resumeId]/route.ts`
- `app/api/resumes/[resumeId]/activate/route.ts`
- `lib/resume/parse.ts`
- `lib/validation/resumes.ts`
- `components/editor/ResumeUpload.tsx`

## Verification

1. A real text-based PDF CV uploads and yields sensible `rawText` —
   read it, do not just check it is non-empty.
2. **The same upload works on a Vercel deploy**, not only locally. This
   is the single most common thing that passes in development and fails
   in production.
3. An image-only or scanned PDF falls through to path 2 and still
   produces text.
4. A PDF that defeats both paths shows the exact `ui-context.md` copy and
   offers paste.
5. Pasting text creates a `Resume` with `parseSource: PASTED`.
6. Uploading a second CV makes it active and leaves the first intact.
7. A 10 MB file and a `.docx` are both rejected before parsing.
8. `npm run build` passes.

## Notes

- Step 2 is not optional. Deploy and test it before calling this feature
  done — discovering the bundler problem during feature 15 wastes a day.
- Do not store the PDF. If a reason to keep it appears later, that is a
  Vercel Blob decision made then, and `../architecture.md` records it as
  the upgrade path.
