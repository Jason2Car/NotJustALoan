# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> This file is based on the original project specification. That spec's product
> principles, safeguards, and scope boundaries are preserved below — treat them
> as requirements, not suggestions. Do not delete them when updating this file.

## Product

**Not Just a Loan** — *Find your people. Fund your goals.*

A hackathon prototype: a social platform that helps people with limited credit
history form trustworthy financial groups, coordinate shared goals, understand
affordability, and explore lender connections. It helps groups form and decide.

**The platform is not a lender.** It does not lend, score, underwrite, move
money, or guarantee approval, rates, or outcomes. The top banner is the UI's
single simulated-content disclosure: everything in the app (people, groups,
lenders, records, verification, money) is simulated. Core hypothesis: better
coordination, transparent commitments, budgeting support, and lender connections
help people access more suitable financing without unnecessarily transferring
financial risk between members. Prefer one coherent end-to-end journey over many
shallow features.

Walkthrough (~3 min, see `README.md`): pick persona **Lena Brandt** →
**Coffee Cart Crew** (Organizing) → accept commitments → Preview controls
*Have other members respond* → *Move to Ready to apply* → prepare/consent/
submit lender referral → lender approves or declines. Beginner path:
in Discover Groups, the **Start here** subsection → *First Steps Practice
Circle* (no money).

## Commands

```bash
npm install
npm run dev        # Vite dev server, http://localhost:5173
npm test           # vitest run — business-rule tests (src/rules.test.ts)
npm run build      # tsc --noEmit && vite build (typecheck + production build)
npm run preview    # preview the production build
```

Single test: `npx vitest run src/rules.test.ts -t "income is private"`

There is no lint script. `npm run build` is the typecheck gate (strict TS).
Verify changes with `npm test && npm run build`.

## Architecture

Vite + React 18 + TypeScript (strict). Only runtime deps are `react` /
`react-dom` — do not add runtime dependencies without a strong reason. No
backend, no real auth, no API keys in the repo.

```
src/main.tsx            createRoot -> <StoreProvider><App/></StoreProvider>
src/App.tsx             Shell: SimulationBanner (the only simulated-content
                        disclosure in the UI), header/nav, persona switcher,
                        Reset. Renders Welcome if no current user.
                        Nav = the 4 sections: Community, Discover Groups,
                        My Groups, My Finances (+ Profile). "Start here" is
                        a subsection of Discover Groups, not a nav item.
src/router.ts           Tiny hash router (useRoute/go). Routes are hash
                        segments: / (Discover), /community, /finances,
                        /mine, /new, /group/:id, /profile[/:id].
                        Legacy #/beginner falls through to Discover.
src/store.tsx           Persistence boundary. React context; state in
                        localStorage key `njal-state-v5` (v2 added Group.
                        arrangement and User.finances), seeded on first load.
                        update(fn) structuredClone()s state, mutates the draft,
                        persists result. Swap load/save here for a future API.
src/types.ts            All domain types: User, Group, Commitment, Message,
                        Poll, GuidedQuestion, Lender, AppState, GroupState.
src/rules.ts            PURE business rules: lifecycle gates (advanceChecks/
                        canAdvance/nextState), commitmentFullyAccepted,
                        resetAcks, leaveKind, lenderFit, incomeVisibleTo,
                        canViewHistory, commitmentsEffective, arrangement
                        labels/explainers, and My Finances math (budgetSummary,
                        scenarioSummary, loanEstimate). No side effects.
src/actions.ts          All state mutations; enforces rules.ts. UI never
                        mutates state directly — pages call
                        update((d) => A.someAction(d, ...)).
src/seed.ts             Fictional seed data: seedState(), 6 users (u-maya,
                        u-dev, u-lena, u-sam, u-priya, u-omar), 4 groups
                        (g-oven, g-cart, g-study, g-practice).
src/services/lenders.ts Mock lender directory behind listLenders()/getLender()
                        — the seam for a future real lender API.
src/services/assistant.ts Demo budget assistant: deterministic local
                        templates over rules.ts math (explainBudget). No AI
                        or API call — the seam for the Muse copilot.
src/components/ui.tsx   VerifBadge, Notice, StateTracker, Avatar, money.
src/pages/              Welcome (demo login/register), Community, Discover
                        (Beginner.tsx = its StartHere subsection), MyGroups,
                        NewGroup, Finances, Profile, GroupCard, GroupPage.
src/pages/GroupPage.tsx Largest file: tabs Chat (default landing tab) |
                        Overview | Members (plain list, no seat placeholders) |
                        Get acquainted | Rules & commitments | Lenders.
                        Per-group income sharing is toggled at the top of
                        that group's Chat tab, not on Profile. Overview opens
                        with "What sort of loan this group is planning".
src/styles.css          Single global stylesheet; plain class names.
src/rules.test.ts,      Tests drive actions.ts/rules.ts directly against
src/finances.test.ts    seedState() (set s.currentUserId to act as a user) —
                        add business-rule/budget tests here, in this style.
```

Keep the layering: deterministic logic in `rules.ts`, enforcement in
`actions.ts`, persistence only in `store.tsx`, UI in `pages/`. Budget/business
arithmetic must be testable pure code in this layer, never invented by an AI
explanation layer.

### Group lifecycle

`forming → organizing → ready → submitted → funded`, plus `closed`.
`nextState()` only maps the first three transitions; `funded`/`closed` are
reached via `simulateLenderDecision()` / `closeGroup()` / empty group.
Advancing requires the owner and all `advanceChecks()` passing (e.g. organizing
→ ready needs ≥1 rule, ≥1 commitment, and *every* member having individually
accepted *every* commitment). Commitments become effective only when `funded`.

## Non-negotiable safeguards (from the spec)

These are encoded in `rules.ts`/`actions.ts` and covered by tests. Do not
weaken them:

- **No automatic liability.** Joining, requesting to join, voting in a poll, or
  proposing a commitment never creates a financial obligation. A majority vote
  cannot bind a member. Only a person's own action sets their own entry in
  `Commitment.acks` (`ackCommitment` writes only `d.currentUserId`; there is
  deliberately no path to write someone else's ack).
- **Consent resets on change.** Any membership, rule, commitment, or
  financing-arrangement change
  calls `resetAcks()`: acknowledgments and referral consents are cleared and a
  `ready` group drops back to `organizing`. Consent was about a specific group
  and plan.
- **Privacy by default.** Income is private unless its owner shares it per
  group (`sharedIncomeWith`, `incomeVisibleTo`). Private financial details are
  shared only with explicit consent, for the intended purpose. The referral
  flow must show exactly what will be shared before consent.
- **No trust/credit score.** Ever. Present factual, contextual records
  (completed / late / delayed-explained / renegotiated / unresolved / disputed)
  that the subject can respond to and dispute. Past transactions are visible
  to any signed-in member (`canViewHistory`) — including newcomers who share
  no group with the subject — and cannot be hidden. This visibility covers
  history only: income and budgets (financial reports) stay private as above. Lack of
  history ≠ untrustworthy; simulated verification ≠ financial reliability;
  completing small commitments ≠ ability to repay a large loan; a missed
  payment is not misconduct. No permanent public shaming or good/bad labels.
- **Lender fit is descriptive, never a prediction.** `lenderFit()` checks
  published criteria only; it must never imply approval odds, guaranteed rates,
  or that group coordination improves terms.
- **Leaving:** free before funding (social exit only); blocked in-app after
  funding, with an explanation — leaving cannot erase obligations.
- **Banner-only labelling.** The always-visible top banner in `App.tsx`
  (`SimulationBanner`, shown logged in and out) is the only place the UI says
  everything is simulated — do not re-add per-item simulated/fictional/sample/
  demo labels to pages, cards, badges, seed copy, or buttons. Internal code
  names stay honest (`demoOthersRespond`, `simulateLenderDecision`), but never
  claim mocked features are live or fabricate a real lender offer.

### Product principles

1. Financial autonomy — users decide whether to borrow/accept a commitment.
2. Clarity before consent — explain obligations and risks *before* agreement,
   in plain, specific, actionable language (not hidden disclaimers or
   fearmongering). Cover, at the relevant decision point: APR vs total cost
   incl. fees and repayment timing; affordability under income drop/unexpected
   expense; individual vs joint liability; borrowed money is cash now plus a
   future obligation, not income; group pressure (declining must be private
   and costless socially); non-debt alternatives for recurring shortfalls;
   uncertainty — never call a loan safe/affordable/guaranteed on incomplete
   information. Only the user's own obligation counts in their personal budget,
   not a whole shared loan unless they owe it all. Label estimates and
   user-entered data as such.
3. Privacy by default; no false promises; no universal trust score; accessible
   language without shame; support, not pressure (no social mechanics or AI
   language pushing borrowing).

### Financing arrangements (explain differences in plain language)

- **A. Individual loans coordinated by a group** — each member owes only their
  own loan. Default, beginner-friendly. No promise of better rates/approval.
- **B. Shared savings/lending fund** — voluntary pooled contributions. Explain:
  needs capital and clear rules (contributions, withdrawals, ownership, exits,
  shortfalls); the same money cannot be lent to everyone at once. MVP: proposed
  arrangement only (the app holds no money).
- **C. Joint group loan / shared liability** — members may have to cover
  others' missed payments, possibly leaving them unable to pay their own
  essentials; exact terms depend on the lender contract. Requires a prominent,
  specific warning before proceeding. Never unlock it via a trust score or
  frame it as an achievement/reward.

### Muse AI agent (demo stand-in implemented; no live AI)

No live AI/API integration exists (no API key in the repo) — do not invent an
API or provider. The My Finances page ships `services/assistant.ts`, a local
stand-in that answers the spec'd questions with deterministic
templates filled from `rules.ts` math. A future live Muse integration must
replace that seam and keep these requirements: Muse is a
**financial-education/budgeting copilot** in My Finances (e.g. "Can I afford
this contribution?", "What if my income drops 20%?", "Compare these repayment
schedules?").

- Application code performs all arithmetic (sums, balances, payment estimates,
  scenario results) deterministically; Muse explains/interprets those
  results, states assumptions, and asks for missing information that would
  materially change the answer. It is never the source of truth for numbers.
- Supply budget data to Muse only with user consent and subject to privacy
  settings.
- Muse must never: accept loans, join groups, consent to obligations, send
  financial information to third parties, or move money; present itself as a
  lender, financial adviser, credit bureau, or approval authority; invent
  lender offers, rates, eligibility rules, assistance programs, or user data;
  or generate a trustworthiness/creditworthiness score.

## Four main sections (implemented; all in the top nav)

1. **Community** (`Community.tsx`) — member introductions, recent chat and
   open polls/guided questions from the user's groups (per-group chat lives
   in GroupPage: Chat / Get acquainted tabs). No pressure to borrow or
   disclose finances to participate socially.
2. **Discover Groups** (`Discover`, `NewGroup`, `GroupCard`) — browse/filter
   by purpose or arrangement, create (arrangement A/B/C explained, joint
   needs an understanding checkbox), request to join. Listings state purpose,
   arrangement, and whether shared liability is considered — without implying
   joining guarantees approval or better rates.
3. **My Groups** (`MyGroups`, `GroupPage`) — memberships, proposals awaiting
   the user's own decision, commitments everyone accepted, discussion, goals.
   Discussion / proposal / member agreement / lender-issued loan are kept
   distinct ("agreed by all" ≠ effective until funded).
4. **My Finances** (`Finances.tsx`) — private budget: user-entered monthly
   income and lines (essential / other / existing-loan). Directly beneath the
   budget sits the **Budget advisor** (`budgetAdvice` in
   `services/assistant.ts`): automatic commentary recomputed on every budget
   change — "Looking OK on the figures you've entered" or specific changes to
   consider (shortfall, thin cushion under a 20% income drop, largest
   other-spending lever) — plus the ask-the-advisor Q&A. Below that are the
   planning tools: where-it-goes totals, what-if scenarios (own proposed
   payment, income drop, unexpected expense), and the loan calculator (APR,
   fees, total repayment), side by side on wide screens. All arithmetic is `budgetSummary`/`scenarioSummary`/
   `loanEstimate` in `rules.ts` with tests in `finances.test.ts`; borrowed
   money is never income and only the user's own obligation is counted.

## Scope boundaries (MVP)

**Do not implement:** real lending/underwriting, real money transfers or
payment collection, custody of savings/reserves or collateral, real credit
checks or bank integrations (unless explicitly provided and authorized),
legally binding agreements/guarantees, enforcement of obligations, automatic
acceptance of commitments by AI, dispute resolution workflow (disputes are
recorded as open only). Real auth, backend, real verification, notifications,
and real lender integrations are likewise out; persona switching
replaces auth, `localStorage` replaces the backend, lenders are the mock in
`services/lenders.ts`.

Reuse existing architecture, components, and styling. Determine how Muse is
intended to be called from the provided environment before adding any AI
integration; don't substitute a different AI provider unilaterally.

## Definition of done

A user can: discover or create a group with a clearly stated purpose;
understand whether it explores individual loans, a shared fund, or joint
liability; review proposed commitments without being silently bound by group
activity; see how a proposed payment affects their personal budget; ask Muse
to explain the budget and financing risks; understand approval, lower rates,
and repayment success are not guaranteed; and complete a path to a
lender connection with no real money movement or false claims.

When finishing work, report: what was implemented, how Muse was integrated
(if at all), what is mocked vs functional, tests/build run and results, how to
run the project, and important limitations or unfinished work.
