# Claude Agent Guide

## Workflow Restrictions
- Never run `npm` commands (e.g., `npm run dev`, `npm run build`) without explicit permission.
- Locate all shared types and utilities in `src/lib/utils`.
- Place every Svelte component in `src/lib/components`.
- Use Tailwind neutral color tokens for all styling decisions.
- Avoid writing bespoke CSS (no `style=` attributes or `.css` files); compose Tailwind utilities and existing design tokens only.
- Do not commit or push without explicit permission.
- When asked to commit, omit any `Co-authored-by: Claude` trailers from the message.
- When asked to open a PR, do not auto-merge into `main` and exclude any `Co-authored-by: Claude` trailers.
- When explicitly told to "Commit all", inspect staged history and craft focused commits that mirror the logical batches in `git log` rather than a single omnibus commit.
- Never create, propose, or auto-generate Markdown files (`*.md`) under any circumstance (including long operations, reports, logs, or summaries) unless the user explicitly orders a specific `.md` file.
- Do not append end-of-response summaries unless the user explicitly asks for one; keep outputs to the requested content only.
- Pause for explicit confirmation before large architectural decisions, irreversible refactors, or dependency upgrades.
- After every response, provide succinct feedback options or recommended next steps so the user can react quickly.
- If any requirement or prompt is unclear, ask the user for clarification immediately.
- When diagnosing or fixing bugs, request additional context (logs, repro steps, recent changes) before proposing solutions.

## Brand & Design Philosophy
- **Visual tone** – Professional macro analytics terminal: muted Tailwind `neutral` palette, low-chroma accents, plenty of negative space, and consistent rounded radii from existing components. Never introduce bespoke color tokens without approval.
- **Typography & spacing** – Respect SvelteKit defaults plus Tailwind utility scales; keep headings lightweight and avoid custom font-weight overrides unless tokens exist. Maintain even spacing rhythms (multiples of 4).
- **Component styling** – No handcrafted CSS or SCSS. Compose Tailwind utility classes and shared design tokens; extend theme via config only with approval.
- **Iconography** – Source every icon through Iconify (`@iconify/svelte` or inline Iconify data). Do not import SVGs manually or rely on other icon packs.
- **Interactions** – Favor optimistic UI, animated states under 200 ms using Tailwind transitions, and align motion curves with existing components.

## Collaboration Guide
1. Confirm task scope, assumptions, and any missing inputs before coding.
2. Work inside the prescribed directories and Svelte runes syntax; prefer small, composable components.
3. Surface design or architectural questions early and await user confirmation before proceeding.
4. Document key implementation details inline only when non-obvious; keep comments minimal and practical.
5. Close responses with next-step prompts (tests to run, areas to review, pending confirmations) so the user can react quickly.
