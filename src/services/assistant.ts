import { budgetSummary, loanEstimate, scenarioSummary, type BudgetSummary, type LoanEstimate } from '../rules';
import type { PersonalFinances } from '../types';

const $ = (n: number) => '$' + Math.round(n).toLocaleString();

export interface AssistantContext {
  finances: PersonalFinances;
  proposedMonthly: number;
  incomeDropPct: number;
  unexpectedExpense: number;
  loan: { principal: number; aprPct: number; months: number; fees: number };
}

export const ASSISTANT_QUESTIONS = [
  'Can I afford this proposed monthly contribution?',
  'What happens if my income drops by 20%?',
  'Why is my remaining budget this month?',
  'Can you compare taking the loan vs. not borrowing?',
  'What fees or risks should I understand before agreeing?',
  'Would a non-loan option make more sense for a recurring expense?',
] as const;

export interface BudgetAdvice {
  status: 'ok' | 'check' | 'incomplete';
  headline: string;
  points: string[];
}

/**
 * Automatic advisor commentary on the budget as entered. Recomputed on every
 * change to the budget, so it always reflects the current figures. All numbers
 * come from rules.ts; wording never promises affordability or approval.
 */
export function budgetAdvice(finances: PersonalFinances, proposedMonthly = 0): BudgetAdvice {
  const base = budgetSummary(finances, proposedMonthly);
  if (base.incomplete) {
    return {
      status: 'incomplete',
      headline: 'Add your income to get advisor feedback',
      points: [
        'No monthly take-home income is entered yet, so remaining-budget figures would be a guess.',
        'Add your income and essential expenses above — the advisor will comment here as soon as you do, and again whenever your figures change.',
      ],
    };
  }

  const points: string[] = [];
  let status: BudgetAdvice['status'] = 'ok';
  const largestOther = finances.lines.filter((l) => l.kind === 'other').sort((a, b) => b.amount - a.amount)[0];
  const drop = scenarioSummary(finances, { incomeDropPct: 20, proposedMonthly });

  if (base.remainingBefore < 0) {
    status = 'check';
    points.push(`On these figures, outgoings (${$(base.totalOut)}/mo) exceed income (${$(base.monthlyIncome)}/mo) by ${$(-base.remainingBefore)}/mo before any new proposal. Adding a payment now would deepen that shortfall.`);
    if (largestOther) points.push(`The largest “other spending” line is ${largestOther.label} at ${$(largestOther.amount)}/mo — that's often the first place people look for room, though only you can judge what's essential.`);
    if (base.existingLoans > 0) points.push(`Existing loan payments already take ${$(base.existingLoans)}/mo. For a recurring shortfall, a new loan adds another recurring payment — a payment plan, assistance, or adjusting a recurring cost may fit better than borrowing.`);
  } else if (base.remainingAfter < 0) {
    status = 'check';
    points.push(`You have ${$(base.remainingBefore)}/mo left before proposals, so the proposed ${$(proposedMonthly)}/mo would put you ${$(-base.remainingAfter)}/mo short. A smaller amount or different timing is worth testing in the planning tools below.`);
  } else {
    points.push(`After essentials (${$(base.essential)}/mo), other spending (${$(base.other)}/mo), and existing loan payments (${$(base.existingLoans)}/mo), ${$(base.remainingBefore)}/mo is left${proposedMonthly > 0 ? `, and ${$(base.remainingAfter)}/mo would remain after your proposed ${$(proposedMonthly)}/mo` : ''}.`);
    if (drop.remainingAfter < 0) {
      status = 'check';
      points.push(`It fits as entered, but a 20% income drop (to ${$(drop.scenarioIncome)}/mo) would leave ${$(-drop.remainingAfter)}/mo short${proposedMonthly > 0 ? ' after that proposal' : ''} — the cushion is thin if income varies. Test your own drop in the planning tools below.`);
    } else if (proposedMonthly > 0) {
      points.push(`Even if income fell 20% (to ${$(drop.scenarioIncome)}/mo), ${$(drop.remainingAfter)}/mo would remain after your proposed ${$(proposedMonthly)}/mo, on these figures.`);
    }
    if (status === 'ok' && base.monthlyIncome > 0 && base.existingLoans / base.monthlyIncome > 0.3) {
      status = 'check';
      points.push(`Existing loan payments are ${$(base.existingLoans)}/mo — over 30% of income. Worth keeping in view before adding another payment, even though the current figures balance.`);
    }
    if (status === 'ok' && largestOther && base.other > base.essential) {
      status = 'check';
      points.push(`Other spending (${$(base.other)}/mo) is higher than essentials (${$(base.essential)}/mo), led by ${largestOther.label} at ${$(largestOther.amount)}/mo. That's not wrong — it's just the biggest lever if you ever need room.`);
    }
  }

  return {
    status,
    headline: status === 'ok' ? 'Looking OK on the figures you\'ve entered' : 'A few changes are worth considering',
    points,
  };
}

/**
 * DEMO assistant: a stand-in for the spec'd Muse budgeting copilot.
 * No AI/API is called — answers are deterministic templates filled only with
 * results from rules.ts math. It never invents figures, never decides for the
 * user, and never presents a loan as safe, affordable, or guaranteed.
 */
export function explainBudget(question: string, ctx: AssistantContext): string {
  const base: BudgetSummary = budgetSummary(ctx.finances, ctx.proposedMonthly);
  const loan: LoanEstimate = loanEstimate(ctx.loan.principal, ctx.loan.aprPct, ctx.loan.months, ctx.loan.fees);
  const q = question.toLowerCase();

  if (base.incomplete) {
    return 'I can\'t give a useful answer yet: no monthly income has been entered, so any "remaining budget" would be a guess. Add your monthly take-home income and at least your essential expenses above, then ask again. Everything you enter is an estimate you control — it is never shared with a group.';
  }

  if (q.includes('afford')) {
    if (base.remainingAfter >= 0) {
      return `Based only on the figures entered: income ${$ (base.monthlyIncome)}/mo minus essentials ${$(base.essential)}, other spending ${$(base.other)}, and existing loan payments ${$(base.existingLoans)} leaves ${$(base.remainingBefore)}/mo. After your own proposed ${$(base.proposedMonthly)}/mo, ${$(base.remainingAfter)}/mo would remain unallocated. That is arithmetic, not a promise it is affordable — it assumes income and expenses stay exactly as entered. Try the income-drop scenario before deciding, and remember only your own obligation is counted here, not a whole group loan.`;
    }
    return `On the figures entered, no: income ${$(base.monthlyIncome)}/mo minus essentials ${$(base.essential)}, other spending ${$(base.other)}, and existing loan payments ${$(base.existingLoans)} leaves ${$(base.remainingBefore)}/mo, so a proposed ${$(base.proposedMonthly)}/mo would put you ${$(-base.remainingAfter)}/mo short. Options people consider: a smaller amount, a longer timeline, reducing other spending, or a non-loan option. Nothing here obliges you to accept a commitment — declining is always allowed.`;
  }

  if (q.includes('income drops') || q.includes('drop')) {
    const s = scenarioSummary(ctx.finances, { incomeDropPct: 20, proposedMonthly: ctx.proposedMonthly });
    return `If income fell 20% (from ${$(base.monthlyIncome)} to ${$(s.scenarioIncome)}/mo) with the same spending, your remaining budget after your proposed ${$(ctx.proposedMonthly)}/mo would be ${$(s.remainingAfter)}/mo${s.remainingAfter < 0 ? ' — a shortfall' : ''}. This is why a payment that fits today can become unaffordable: the calculation assumes expenses don't fall with income. Building the scenario before you accept is the point — you can test your own drop percentage above.`;
  }

  if (q.includes('why is my remaining')) {
    return `Your remaining budget is income ${$(base.monthlyIncome)} minus essentials ${$(base.essential)}, other spending ${$(base.other)}, and existing loan payments ${$(base.existingLoans)} = ${$(base.remainingBefore)}/mo before any proposed contribution, and ${$(base.remainingAfter)}/mo after your proposed ${$(base.proposedMonthly)}/mo. If it looks lower than expected, check for an existing loan payment or a large "other" item — those are the usual causes. These are your entered estimates, not verified figures.`;
  }

  if (q.includes('compare') || q.includes('loan vs')) {
    const withLoan = budgetSummary(ctx.finances, loan.monthlyPayment);
    return `For the amount you personally would owe (${$(loan.principal)} at ${loan.aprPct}% APR over ${loan.months} months, ${$(loan.fees)} in fees): the estimated payment is ${$(loan.monthlyPayment)}/mo, total repayment ${$(loan.totalRepayment)}, so borrowing costs ${$(loan.totalCost)} above the amount received. The ${$(loan.principal)} received is cash now plus a future obligation — it is not income, so I haven't added it to your monthly income. With that payment, your remaining budget would be ${$(withLoan.remainingAfter)}/mo; without borrowing it stays ${$(base.remainingBefore)}/mo before other proposals. I can't say which is better for you, and no lender has offered these terms — this is a calculator using numbers you typed.`;
  }

  if (q.includes('fees') || q.includes('risks')) {
    return `Things to pin down before agreeing to anything: (1) APR is not the full cost — ask for fees, repayment timing, and total repayment; in your calculator scenario that's ${$(loan.totalCost)} above ${$(loan.principal)}. (2) Who owes what: individual loans mean only your debt; joint liability can mean covering someone else's missed payment. (3) What happens if income falls or an unexpected expense lands — run the scenarios above. (4) Whether you can decline privately; here, a group vote can never bind you. If a figure isn't known, treat the answer as incomplete rather than safe.`;
  }

  if (q.includes('non-loan') || q.includes('recurring')) {
    return `For a recurring monthly shortfall, borrowing usually deepens it: a new payment is itself a recurring expense, added on top of the gap it was meant to cover. Before borrowing for ongoing costs, people often check assistance programs, payment plans with the biller, community resources, or adjusting the recurring expense — I can't name specific programs or promise any exist for your situation. Borrowing tends to fit better for a one-off, time-limited cost with a clear repayment source. Your numbers: current remaining is ${$(base.remainingBefore)}/mo before proposals.`;
  }

  return `Here's your picture from the entered figures: income ${$(base.monthlyIncome)}/mo, outgoings ${$(base.totalOut)}/mo (essentials ${$(base.essential)}, other ${$(base.other)}, existing loans ${$(base.existingLoans)}), leaving ${$(base.remainingBefore)}/mo, or ${$(base.remainingAfter)}/mo after your proposed ${$(base.proposedMonthly)}/mo. Ask me about affordability, an income drop, comparing the loan scenario, fees and risks, or non-loan options — or use the calculators above; all the arithmetic is done by the app, not guessed.`;
}
