import type { Commitment, FinancingArrangement, Group, GroupState, Lender, PersonalFinances, User } from './types';

export const ARRANGEMENT_LABELS: Record<FinancingArrangement, string> = {
  individual: 'Individual loans, coordinated by the group',
  'shared-fund': 'Shared savings / lending fund',
  joint: 'Joint group loan (shared liability)',
};

export const ARRANGEMENT_EXPLAINERS: Record<FinancingArrangement, string> = {
  individual:
    'Each member applies for their own loan and remains responsible only for their own debt. The group coordinates, compares lenders, and helps each other prepare. Group coordination does not promise a lower rate or approval. This is the default, beginner-friendly option.',
  'shared-fund':
    'Members voluntarily contribute to a pool that may support members under agreed rules. A fund needs available capital and clear rules for contributions, withdrawals, ownership, exits, and shortfalls — the same money cannot be lent to everyone at once. Here it is a proposal only; this app holds no money.',
  joint:
    'A lender may make members responsible for missed payments by other members, depending on the actual contract. You could have to cover someone else\'s shortfall and be left unable to pay your own essential expenses. The exact obligations depend on the lender\'s contract, not on this app. This is never a reward or a level unlocked by group experience.',
};

export const arrangementConsidersSharedLiability = (a: FinancingArrangement) => a === 'joint';

export const STATE_LABELS: Record<GroupState, string> = {
  forming: 'Forming',
  organizing: 'Organizing',
  ready: 'Ready to apply',
  submitted: 'Application submitted',
  funded: 'Funded',
  closed: 'Closed',
};

export const STATE_ORDER: GroupState[] = ['forming', 'organizing', 'ready', 'submitted', 'funded', 'closed'];

export const MIN_MEMBERS_TO_ORGANIZE = 3;

/** Commitments become effective only once an external lender has funded the group. */
export const commitmentsEffective = (g: Group) => g.state === 'funded';

export const isMember = (g: Group, userId: string | null) => !!userId && g.memberIds.includes(userId);

/** Financial commitments need an explicit "accepted" from every current member. */
export function commitmentFullyAccepted(g: Group, c: Commitment) {
  return g.memberIds.every((id) => c.acks[id] === 'accepted');
}

export interface Blocker {
  ok: boolean;
  text: string;
}

/** What must be true before the group may move to the next stage. */
export function advanceChecks(g: Group): Blocker[] {
  switch (g.state) {
    case 'forming':
      return [
        { ok: g.memberIds.length >= MIN_MEMBERS_TO_ORGANIZE, text: `At least ${MIN_MEMBERS_TO_ORGANIZE} members (${g.memberIds.length} now)` },
        { ok: g.questions.some((q) => Object.keys(q.answers).length > 0), text: 'Members have started the guided questions' },
      ];
    case 'organizing':
      return [
        { ok: g.rules.length > 0, text: 'At least one group rule is documented' },
        { ok: g.commitments.length > 0, text: 'At least one commitment is proposed (can be low-stakes)' },
        { ok: g.commitments.every((c) => commitmentFullyAccepted(g, c)), text: 'Every member has individually accepted every proposed commitment' },
      ];
    case 'ready':
      return [
        { ok: !!g.referral, text: 'A lender has been chosen' },
        { ok: !!g.referral && g.memberIds.every((m) => g.referral!.consents.includes(m)), text: 'Every member has consented to share the summary' },
      ];
    default:
      return [];
  }
}

export const canAdvance = (g: Group) => advanceChecks(g).every((b) => b.ok);

export function nextState(s: GroupState): GroupState | null {
  const map: Partial<Record<GroupState, GroupState>> = { forming: 'organizing', organizing: 'ready', ready: 'submitted' };
  return map[s] ?? null;
}

/**
 * A membership or commitment change invalidates earlier consent: acknowledgments
 * were given about a specific group and plan.
 */
export function resetAcks(g: Group) {
  g.commitments.forEach((c) => (c.acks = {}));
  if (g.referral) g.referral.consents = [];
  if (g.state === 'ready') g.state = 'organizing';
}

export type LeaveKind = 'free' | 'blocked';
/** Leaving the social group before funding creates no obligations. After, it cannot erase them. */
export function leaveKind(g: Group): LeaveKind {
  return commitmentsEffective(g) ? 'blocked' : 'free';
}

/** Descriptive fit against a lender's published criteria. Never a prediction of approval. */
export function lenderFit(g: Group, l: Lender): { ok: boolean; text: string }[] {
  return [
    { ok: l.categories.includes(g.category), text: `Funds ${g.category.toLowerCase()} goals` },
    { ok: g.goalAmount >= l.minAmount && g.goalAmount <= l.maxAmount, text: `Amount $${l.minAmount.toLocaleString()}–$${l.maxAmount.toLocaleString()} (yours: $${g.goalAmount.toLocaleString()})` },
    { ok: g.memberIds.length >= l.minMembers && g.memberIds.length <= l.maxMembers, text: `Group of ${l.minMembers}–${l.maxMembers} (yours: ${g.memberIds.length})` },
  ];
}

export function incomeVisibleTo(subject: User, viewerId: string | null, group: Group | null) {
  if (viewerId === subject.id) return true;
  return !!group && subject.sharedIncomeWith.includes(group.id) && isMember(group, viewerId);
}

/** Records are visible to the subject and to members of a group they share. There is no per-record hiding. */
export function sharedGroup(groups: Group[], a: string, b: string) {
  return groups.some((g) => g.memberIds.includes(a) && g.memberIds.includes(b));
}

// ---- My Finances: deterministic budget math (never AI-generated) ----

export interface BudgetSummary {
  monthlyIncome: number;
  essential: number;
  other: number;
  existingLoans: number;
  /** essential + other + existingLoans */
  totalOut: number;
  /** Income left before any proposed contribution. Negative means a shortfall. */
  remainingBefore: number;
  /** The user's own proposed monthly obligation only — never a whole group loan. */
  proposedMonthly: number;
  remainingAfter: number;
  /** True when no income has been entered; figures are estimates/incomplete. */
  incomplete: boolean;
}

const sumKind = (f: PersonalFinances, kind: string) =>
  f.lines.filter((l) => l.kind === kind).reduce((s, l) => s + (Number.isFinite(l.amount) ? l.amount : 0), 0);

export function budgetSummary(f: PersonalFinances, proposedMonthly = 0): BudgetSummary {
  const monthlyIncome = f.monthlyIncome ?? 0;
  const essential = sumKind(f, 'essential');
  const other = sumKind(f, 'other');
  const existingLoans = sumKind(f, 'existing-loan');
  const totalOut = essential + other + existingLoans;
  const remainingBefore = monthlyIncome - totalOut;
  return {
    monthlyIncome, essential, other, existingLoans, totalOut,
    remainingBefore,
    proposedMonthly,
    remainingAfter: remainingBefore - proposedMonthly,
    incomplete: f.monthlyIncome === undefined,
  };
}

export interface Scenario {
  incomeDropPct?: number; // e.g. 20 means income falls 20%
  unexpectedExpense?: number; // one-off amount, shown as a cost this month
  proposedMonthly?: number; // user's own proposed contribution/payment
}

/** What-if: same budget, with an income drop and/or a one-off expense this month. */
export function scenarioSummary(f: PersonalFinances, s: Scenario): BudgetSummary & { scenarioIncome: number } {
  const drop = Math.min(Math.max(s.incomeDropPct ?? 0, 0), 100) / 100;
  const scenarioIncome = (f.monthlyIncome ?? 0) * (1 - drop);
  const base = budgetSummary({ ...f, monthlyIncome: scenarioIncome }, s.proposedMonthly ?? 0);
  const unexpected = s.unexpectedExpense ?? 0;
  return { ...base, scenarioIncome, totalOut: base.totalOut + unexpected, remainingBefore: base.remainingBefore - unexpected, remainingAfter: base.remainingAfter - unexpected };
}

export interface LoanEstimate {
  principal: number;
  aprPct: number;
  months: number;
  fees: number;
  monthlyPayment: number;
  totalRepayment: number; // payments + fees
  totalCost: number; // interest + fees, i.e. cost above principal
}

/**
 * Standard amortizing-loan estimate for the amount the user personally owes.
 * Borrowed principal is cash received, not income; totalRepayment is the obligation.
 */
export function loanEstimate(principal: number, aprPct: number, months: number, fees = 0): LoanEstimate {
  const p = Math.max(principal, 0), n = Math.max(Math.floor(months), 1), r = Math.max(aprPct, 0) / 100 / 12, f = Math.max(fees, 0);
  const monthlyPayment = r === 0 ? p / n : (p * r) / (1 - Math.pow(1 + r, -n));
  const totalRepayment = monthlyPayment * n + f;
  return { principal: p, aprPct, months: n, fees: f, monthlyPayment, totalRepayment, totalCost: totalRepayment - p };
}
