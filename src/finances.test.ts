import { describe, expect, it } from 'vitest';
import * as A from './actions';
import { budgetSummary, loanEstimate, scenarioSummary } from './rules';
import { seedState, seedUsers } from './seed';
import { budgetAdvice, explainBudget, type AssistantContext } from './services/assistant';
import type { PersonalFinances } from './types';

const fin: PersonalFinances = {
  monthlyIncome: 2000,
  lines: [
    { id: 'a', label: 'Rent', amount: 700, kind: 'essential' },
    { id: 'b', label: 'Groceries', amount: 300, kind: 'essential' },
    { id: 'c', label: 'Fun', amount: 100, kind: 'other' },
    { id: 'd', label: 'Old loan', amount: 150, kind: 'existing-loan' },
  ],
};

describe('budget math (deterministic, in rules.ts)', () => {
  it('sums by kind and computes remaining before/after only the user\'s own proposal', () => {
    const s = budgetSummary(fin, 200);
    expect([s.essential, s.other, s.existingLoans, s.totalOut]).toEqual([1000, 100, 150, 1250]);
    expect(s.remainingBefore).toBe(750);
    expect(s.remainingAfter).toBe(550); // a whole group loan is never added — only the 200 proposed
  });

  it('flags incomplete when income is missing instead of guessing', () => {
    const s = budgetSummary({ lines: [] });
    expect(s.incomplete).toBe(true);
    expect(s.monthlyIncome).toBe(0);
  });

  it('scenario applies an income drop and a one-off expense', () => {
    const s = scenarioSummary(fin, { incomeDropPct: 20, unexpectedExpense: 300, proposedMonthly: 100 });
    expect(s.scenarioIncome).toBe(1600);
    expect(s.remainingAfter).toBe(1600 - 1250 - 300 - 100);
  });

  it('loan estimate: borrowed money is an obligation, not income', () => {
    const est = loanEstimate(1200, 0, 12, 0);
    expect(est.monthlyPayment).toBe(100);
    expect(est.totalRepayment).toBe(1200);
    expect(est.totalCost).toBe(0);
    const withInterest = loanEstimate(2000, 12, 12, 50);
    expect(withInterest.totalRepayment).toBeGreaterThan(2050);
    expect(withInterest.totalCost).toBeCloseTo(withInterest.totalRepayment - 2000, 6);
    // principal never enters the budget as income
    expect(budgetSummary(fin).monthlyIncome).toBe(2000);
  });
});

describe('financing arrangement changes', () => {
  it('changing arrangement resets acknowledgments and only the owner can do it', () => {
    const s = seedState(); s.currentUserId = 'u-lena';
    A.ackCommitment(s, 'g-cart', 'c1', 'accepted'); A.demoOthersRespond(s, 'g-cart');
    s.currentUserId = 'u-maya';
    A.setArrangement(s, 'g-cart', 'individual'); // not owner — no-op
    expect(s.groups['g-cart'].arrangement).toBe('joint');
    s.currentUserId = 'u-lena';
    A.setArrangement(s, 'g-cart', 'individual');
    expect(s.groups['g-cart'].arrangement).toBe('individual');
    expect(s.groups['g-cart'].commitments[0].acks).toEqual({});
  });

  it('new groups default to individual loans and seeded finances stay private per user', () => {
    const s = seedState(); s.currentUserId = 'u-lena';
    const id = A.createGroup(s, { name: 'X', category: 'Education', description: '', goalTitle: 'Y', goalAmount: 1000, maxMembers: 3, beginnerFriendly: false });
    expect(s.groups[id].arrangement).toBe('individual');
    A.setMonthlyIncome(s, 2100); A.addBudgetLine(s, { label: 'Rent', amount: 700, kind: 'essential' });
    expect(s.users['u-lena'].finances?.monthlyIncome).toBe(2100);
    expect(s.users['u-maya'].finances?.monthlyIncome).not.toBe(2100);
  });
});

describe('commitment history (seed data)', () => {
  it('includes both repaid-as-agreed and failed/late repayment records', () => {
    const all = seedUsers.flatMap((u) => u.records);
    expect(all.some((r) => r.kind === 'completed' && /Repaid/.test(r.title))).toBe(true);
    expect(all.some((r) => (r.kind === 'late' || r.kind === 'unresolved'))).toBe(true);
    expect(new Set(all.map((r) => r.id)).size).toBe(all.length);
  });
  it('records carry no visibility setting, so history cannot be hidden from group members', () => {
    const all = seedUsers.flatMap((u) => u.records);
    expect(all.every((r) => !('visibility' in r))).toBe(true);
    expect((A as Record<string, unknown>).setRecordVisibility).toBeUndefined();
  });
});

describe('demo budget assistant (local templates over rules.ts math)', () => {
  const ctx: AssistantContext = { finances: fin, proposedMonthly: 200, incomeDropPct: 20, unexpectedExpense: 300, loan: { principal: 2000, aprPct: 12, months: 12, fees: 50 } };
  it('answers affordability from computed figures, without promising', () => {
    const a = explainBudget('Can I afford this proposed monthly contribution?', ctx);
    expect(a).toContain('$750');
    expect(a).not.toMatch(/you (can|will) (afford|be approved)|guaranteed|safe to borrow/i);
  });
  it('refuses to guess when income is missing', () => {
    expect(explainBudget('Can I afford this?', { ...ctx, finances: { lines: [] } })).toContain('no monthly income has been entered');
  });
  it('advisor commentary says looking OK when figures balance and survive a 20% drop', () => {
    const a = budgetAdvice(fin, 100); // remaining 650; 20% drop leaves 250 after proposal
    expect(a.status).toBe('ok');
    expect(a.headline).toContain('Looking OK');
    expect(a.points.join(' ')).not.toMatch(/guaranteed|safe to borrow|you will be approved/i);
  });
  it('advisor commentary flags a shortfall and names the largest other-spending line', () => {
    const a = budgetAdvice({ monthlyIncome: 1000, lines: [{ id: 'x', label: 'Rent', amount: 900, kind: 'essential' }, { id: 'y', label: 'Dining out', amount: 250, kind: 'other' }] }, 0);
    expect(a.status).toBe('check');
    expect(a.points.join(' ')).toContain('Dining out');
  });
  it('advisor commentary asks for income instead of commenting without it', () => {
    expect(budgetAdvice({ lines: [] }).status).toBe('incomplete');
  });
});
