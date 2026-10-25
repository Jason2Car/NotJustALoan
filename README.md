# Not Just a Loan

**Find your people. Fund your goals.**

A hackathon prototype: a social platform that helps people with limited credit history form trustworthy financial groups and explore lender connections. It helps groups form and decide. It does not lend, score, or guarantee anything.

> The app's top banner is the single disclosure: everything here is simulated (people, groups, lenders, records, verification, money). No real money moves, no credit checks, and nothing is a real loan or offer.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # business-rule tests
npm run build    # typecheck + production build
```

Persona switching replaces auth: pick a person (or register) on the welcome screen. State persists in `localStorage`; "Reset" restores seed data.

## The four sections (top navigation)

1. **Community** — member introductions, recent conversation and open polls/guided questions from your groups. Social only; no borrowing or financial disclosure.
2. **Discover Groups** — with a **Start here** subsection (beginner pathway: low-stakes steps and a button filtering to beginner-friendly groups such as *First Steps Practice Circle*, which involves no money); browse/filter by purpose or financing arrangement, create a group (arrangement A/B/C explained at creation), request to join.
3. **My Groups** — your groups, proposals awaiting your own decision, and commitments everyone accepted (agreed ≠ effective ≠ lender-issued loan).
4. **My Finances** — private budget (income, essentials, other spending, existing loan payments), with a **budget advisor directly beneath it** that comments automatically whenever your figures change ("Looking OK" or specific changes to consider) and answers questions; below that, the planning tools: remaining money, what-if scenarios (proposed payment, income drop, unexpected expense), and a loan calculator (APR, fees, total repayment). All arithmetic is deterministic app code (`budgetSummary`/`scenarioSummary`/`loanEstimate` in `src/rules.ts`); borrowed money is never counted as income, and only your own obligation is counted.

Each group states its financing arrangement — **A** individual loans coordinated by the group (default), **B** shared savings/lending fund (proposal only; the app holds no money), or **C** joint loan/shared liability (prominent warning; changing it resets acknowledgments).

## Walkthrough (about 3 minutes)

1. Welcome → pick **Lena Brandt**, open **Coffee Cart Crew** (state: Organizing).
2. *Members*: verification badges, income private. *Profile* of a member shows contextual records, no score.
3. **My Finances**: see Lena's seeded budget with the budget advisor's commentary directly beneath it, test a proposed monthly amount, try an income drop, and ask the advisor "What happens if my income drops by 20%?"
4. *Rules & commitments*: read the liability warning (Coffee Cart Crew explores joint liability), accept the commitment, then add a financial one with an exposure cap (checkbox required).
5. *Overview → Preview controls → Have other members respond*, then **Move to Ready to apply**.
6. *Lenders*: view lenders and criteria fit, **Prepare referral**, review exactly what is shared, consent, then **Submit referral**.
7. Lender approves (Funded) or declines. After funding, leaving is blocked and explained.
8. **Community**: introductions and recent group conversation. Beginner pathway: in **Discover Groups**, the **Start here** subsection → *First Steps Practice Circle*, which involves no money.

## Architecture

- `src/rules.ts`: pure business rules (lifecycle gates, consent, privacy, lender fit, budget/loan math)
- `src/actions.ts`: state mutations that enforce those rules
- `src/store.tsx`: persistence boundary (swap localStorage for an API)
- `src/services/lenders.ts`: mock lender directory behind `listLenders()`
- `src/services/assistant.ts`: budget assistant (local templates over `rules.ts` math — no AI/API call)
- `src/pages/`: UI (Community, Discover, MyGroups, Finances, GroupPage, …). Vite + React + TypeScript, no other runtime dependencies.

## Safeguards built into the logic

- Joining, voting, or proposing never creates liability. Only a person's own action sets their acknowledgment.
- Any membership, rule, commitment, or financing-arrangement change resets acknowledgments.
- Budgets are private to their owner; borrowed money is never counted as income, and only the user's own obligation is counted.
- No trust score. Records are contextual, visible to members of a shared group (they cannot be hidden from group members), and can be responded to and disputed.
- Lender fit is descriptive, never a prediction of approval.

## Not implemented

A live Muse AI integration (the budget assistant is a local stand-in that explains app-computed figures — no API is called, and no API key exists in the repo), real auth, backend, real verification, notifications, real lender integrations, enforcement of any obligation, dispute resolution workflow (disputes are recorded as open), moderation, accessibility audit beyond basics, and browser-level automated UI tests.
