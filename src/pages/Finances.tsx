import { useState } from 'react';
import * as A from '../actions';
import { money, Notice } from '../components/ui';
import { ARRANGEMENT_LABELS, budgetSummary, loanEstimate, scenarioSummary } from '../rules';
import { ASSISTANT_QUESTIONS, budgetAdvice, explainBudget } from '../services/assistant';
import { useStore } from '../store';
import type { BudgetLineKind } from '../types';

const KIND_LABEL: Record<BudgetLineKind, string> = { essential: 'Essential', other: 'Other spending', 'existing-loan': 'Existing loan payment' };
const $ = (n: number) => (n < 0 ? '-' : '') + money(Math.abs(Math.round(n)));

/** Section 4: My Finances — private budget, advisor commentary, planning tools. */
export default function Finances() {
  const { state, update } = useStore();
  const me = state.users[state.currentUserId!];
  const f = me.finances ?? { lines: [] };
  const act = (fn: (d: typeof state) => void) => update(fn);

  const [proposed, setProposed] = useState(100);
  const [drop, setDrop] = useState(20);
  const [unexpected, setUnexpected] = useState(300);
  const [loan, setLoan] = useState({ principal: 2000, aprPct: 12, months: 12, fees: 50 });
  const [line, setLine] = useState({ label: '', amount: 100, kind: 'essential' as BudgetLineKind });
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);
  const [question, setQuestion] = useState('');

  const base = budgetSummary(f, proposed);
  const advice = budgetAdvice(f, proposed);
  const scen = scenarioSummary(f, { incomeDropPct: drop, unexpectedExpense: unexpected, proposedMonthly: proposed });
  const est = loanEstimate(loan.principal, loan.aprPct, loan.months, loan.fees);
  const withLoan = budgetSummary(f, est.monthlyPayment);
  const myFinancialCommitments = Object.values(state.groups)
    .filter((g) => g.memberIds.includes(me.id))
    .flatMap((g) => g.commitments.filter((c) => c.kind === 'financial').map((c) => ({ g, c })));

  const ask = (q: string) => {
    if (!q.trim()) return;
    setChat((c) => [...c, { q, a: explainBudget(q, { finances: f, proposedMonthly: proposed, incomeDropPct: drop, unexpectedExpense: unexpected, loan }) }]);
    setQuestion('');
  };

  return (
    <>
      <h1>My Finances</h1>
      <p className="muted">Your private budgeting dashboard. Only you can see this — it is never shared with a group, and no group action can change it. Figures are estimates you enter.</p>
      {base.incomplete && <Notice kind="warn" title="Income not entered yet">Add your monthly take-home income below. Until then, remaining-budget figures are incomplete and shouldn't be used to judge affordability.</Notice>}

      <section className="card">
        <h2>Monthly budget</h2>
        <label>Monthly take-home income (USD)
          <input type="number" min={0} value={f.monthlyIncome ?? ''} placeholder="e.g. 2000" onChange={(e) => act((d) => A.setMonthlyIncome(d, e.target.value ? +e.target.value : undefined))} />
        </label>
        <p className="muted">Borrowed money is not income — a loan is cash received plus a future repayment obligation, so it is never added here.</p>
        {f.lines.map((l) => (
          <div key={l.id} className="row between wrap">
            <span>{l.label} <span className="badge">{KIND_LABEL[l.kind]}</span></span>
            <span>{$ (l.amount)}/mo <button className="link" onClick={() => act((d) => A.removeBudgetLine(d, l.id))}>remove</button></span>
          </div>
        ))}
        {!f.lines.length && <p className="muted">No expenses entered yet.</p>}
        <form className="row wrap" onSubmit={(e) => { e.preventDefault(); act((d) => A.addBudgetLine(d, line)); setLine({ ...line, label: '' }); }}>
          <input style={{ flex: 2 }} placeholder="Expense label" value={line.label} onChange={(e) => setLine({ ...line, label: e.target.value })} required />
          <input style={{ flex: 1 }} type="number" min={1} value={line.amount} onChange={(e) => setLine({ ...line, amount: +e.target.value })} aria-label="Monthly amount" />
          <select style={{ flex: 1 }} value={line.kind} onChange={(e) => setLine({ ...line, kind: e.target.value as BudgetLineKind })}>
            {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button>Add</button>
        </form>
      </section>

      <section className="card advisor" aria-live="polite">
        <div className="row between wrap">
          <h2>Budget advisor</h2>
          <span className={`badge ${advice.status === 'ok' ? 'good' : advice.status === 'check' ? 'warnb' : ''}`}>{advice.status === 'ok' ? 'Looking OK' : advice.status === 'check' ? 'Worth a look' : 'Needs income'}</span>
        </div>
        <p><strong>{advice.headline}.</strong></p>
        <ul className="steps">
          {advice.points.map((p) => <li key={p}>{p}</li>)}
        </ul>
        <p className="muted">This commentary updates as you change your budget above. It explains the app's own arithmetic, states its assumptions, and never accepts anything, shares data, or promises a loan is safe or affordable. It is not a lender, financial adviser, or credit bureau — for a real decision, a qualified adviser can look at your full situation.</p>
        <h3>Ask the advisor</h3>
        <div className="row wrap">{ASSISTANT_QUESTIONS.map((q) => <button key={q} onClick={() => ask(q)}>{q}</button>)}</div>
        {chat.map((m, i) => <div key={i}><p className="answer"><strong>You:</strong> {m.q}</p><p className="response"><strong>Advisor:</strong> {m.a}</p></div>)}
        <form className="row" onSubmit={(e) => { e.preventDefault(); ask(question); }}>
          <input style={{ flex: 1 }} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about your budget…" aria-label="Ask the budget advisor" />
          <button className="primary">Ask</button>
        </form>
      </section>

      <h2>Planning tools</h2>
      <section className="card">
        <h2>Where it goes</h2>
        <div className="grid stats">
          <div><span className="stat">{$ (base.monthlyIncome)}</span><br /><span className="muted">Income / mo</span></div>
          <div><span className="stat">{$ (base.essential)}</span><br /><span className="muted">Essentials</span></div>
          <div><span className="stat">{$ (base.other)}</span><br /><span className="muted">Other spending</span></div>
          <div><span className="stat">{$ (base.existingLoans)}</span><br /><span className="muted">Existing loan payments</span></div>
          <div><span className="stat">{$ (base.remainingBefore)}</span><br /><span className="muted">Left before proposals</span></div>
          <div><span className="stat">{$ (base.remainingAfter)}</span><br /><span className="muted">Left after proposed {$(proposed)}/mo</span></div>
        </div>
        {base.remainingAfter < 0 && <Notice kind="warn" title="Shortfall on these figures">This proposed amount would leave you {$(base.remainingAfter)}/mo. That doesn't make you a bad borrower — it means this amount, on this income, doesn't fit. A smaller amount, different timing, or a non-loan option may fit better.</Notice>}
      </section>

      <div className="planning">
      <section className="card">
        <h2>What-if scenarios</h2>
        <div className="grid">
          <label>Your own proposed monthly contribution/payment (USD)
            <input type="number" min={0} value={proposed} onChange={(e) => setProposed(+e.target.value)} /></label>
          <label>Income drop to test (%)
            <input type="number" min={0} max={100} value={drop} onChange={(e) => setDrop(+e.target.value)} /></label>
          <label>One-off unexpected expense this month (USD)
            <input type="number" min={0} value={unexpected} onChange={(e) => setUnexpected(+e.target.value)} /></label>
        </div>
        <p>Scenario result: income <strong>{$ (scen.scenarioIncome)}/mo</strong>, outgoings <strong>{$ (scen.totalOut)}/mo</strong> (including the one-off expense), leaving <strong>{$ (scen.remainingAfter)}/mo</strong> after your proposed {$(proposed)}/mo.</p>
        <p className="muted">Only your own obligation is counted — never a whole group loan, unless you personally owe it all.</p>

        <h3>Your groups' financial proposals (for context, not added automatically)</h3>
        {myFinancialCommitments.map(({ g, c }) => (
          <p key={c.id}><a href={`#/group/${g.id}`}>{g.name}</a> · {c.title} — max exposure {money(c.maxExposure ?? 0)} ({ARRANGEMENT_LABELS[g.arrangement]}). Your decision: {c.acks[me.id] ?? 'none'}.
            {' '}<button className="link" onClick={() => setProposed(Math.max(1, Math.round((c.maxExposure ?? 0) / 12)))}>Test spreading that exposure over 12 months</button></p>
        ))}
        {!myFinancialCommitments.length && <p className="muted">No financial commitments have been proposed in your groups. Nothing is included until you test an amount yourself.</p>}
      </section>

      <section className="card">
        <h2>Loan calculator <span className="muted">(an estimate using numbers you enter — not a lender offer)</span></h2>
        <div className="grid">
          <label>Amount you personally would owe (USD)<input type="number" min={0} value={loan.principal} onChange={(e) => setLoan({ ...loan, principal: +e.target.value })} /></label>
          <label>APR (%)<input type="number" min={0} step={0.1} value={loan.aprPct} onChange={(e) => setLoan({ ...loan, aprPct: +e.target.value })} /></label>
          <label>Term (months)<input type="number" min={1} value={loan.months} onChange={(e) => setLoan({ ...loan, months: +e.target.value })} /></label>
          <label>Upfront fees (USD)<input type="number" min={0} value={loan.fees} onChange={(e) => setLoan({ ...loan, fees: +e.target.value })} /></label>
        </div>
        <p>Cash received now: <strong>{$(est.principal)}</strong> (this is not income). Estimated payment: <strong>{$(est.monthlyPayment)}/mo</strong>. Total repayment incl. fees: <strong>{$(est.totalRepayment)}</strong> — borrowing cost <strong>{$(est.totalCost)}</strong> above the amount received.</p>
        <p>With this payment instead of the proposal above, your remaining budget would be <strong>{$(withLoan.remainingAfter)}/mo</strong>.</p>
        <Notice kind="warn" title="APR isn't the full cost">Fees, repayment timing, and total repayment matter. A payment fitting today's budget can become unaffordable if income falls — check the scenario above. No lender has offered these terms, and approval is never guaranteed.</Notice>
      </section>
      </div>
    </>
  );
}
