## Application Building Context

Read the following files in order before implementing
or making any architectural decision:

1. `context/project-overview.md` — product definition,
   goals, features, and scope
2. `context/architecture.md` — system structure,
   boundaries, storage model, and invariants
3. `context/ui-context.md` — theme, colors, typography,
   and component conventions
4. `context/code-standards.md` — implementation rules
   and conventions
5. `context/ai-workflow-rules.md` — development workflow,
   scoping rules, and delivery approach
6. `context/progress-tracker.md` — current phase,
   completed work, open questions, and next steps

Then read whichever of these the work touches:

- `context/data-model.md` — the Prisma schema, relations,
  and the job deduplication recipe
- `context/evaluation-spec.md` — scoring dimensions,
  weights, thresholds, cap rules, and the Claude output
  contract
- `context/job-sources.md` — the four source adapters,
  normalization, quota defense, and the scan task
- `context/application-states.md` — canonical statuses,
  transition rules, and the tracker board
- `context/prompt-specs.md` — the four Claude calls, where
  prompt text lives, and cost controls
- `context/env-reference.md` — every environment variable
  and where it comes from

## Features

`context/features/` holds one file per implementable
unit, numbered in build order. Start at
`context/features/README.md`.

Before implementing anything, read the feature file for
the unit you are building. It carries the goal, explicit
in/out scope, an implementation outline, the files it
touches, and a verification step that must actually be
run — not assumed — before the feature is called done.

Build features in order. The sequence is deliberate and
the rationale is in the features README.

Update `context/progress-tracker.md` after each
meaningful implementation change.

If implementation changes the architecture, scope, or
standards documented in the context files, update the
relevant file before continuing.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- TRIGGER.DEV SKILLS START -->
## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.agents/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-realtime-and-frontend`.
<!-- TRIGGER.DEV SKILLS END -->
