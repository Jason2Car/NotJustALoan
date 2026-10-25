import { useState } from 'react';
import * as A from '../actions';
import { Avatar, money, Notice, StateTracker, VerifBadge } from '../components/ui';
import { advanceChecks, ARRANGEMENT_EXPLAINERS, ARRANGEMENT_LABELS, canAdvance, commitmentFullyAccepted, commitmentsEffective, incomeVisibleTo, isMember, leaveKind, lenderFit, nextState, STATE_LABELS } from '../rules';
import { getLender, listLenders } from '../services/lenders';
import { useStore } from '../store';
import type { FinancingArrangement, Group } from '../types';

const TABS = ['Chat', 'Overview', 'Members', 'Get acquainted', 'Rules & commitments', 'Lenders'] as const;
type Tab = (typeof TABS)[number];

export default function GroupPage({ id }: { id: string }) {
  const { state, update } = useStore();
  const [tab, setTab] = useState<Tab>('Chat');
  const g = state.groups[id];
  const me = state.currentUserId!;
  if (!g) return <p>Group not found.</p>;
  const member = isMember(g, me);
  const act = (fn: (d: typeof state) => void) => update(fn);

  return (
    <>
      <div className="row between wrap">
        <div>
          <span className="badge">{g.category}</span> {g.beginnerFriendly && <span className="badge good">Beginner friendly</span>} <span className={`badge ${g.arrangement === 'joint' ? 'warnb' : ''}`}>{ARRANGEMENT_LABELS[g.arrangement]}</span>
          <h1>{g.name}</h1>
        </div>
        <span className="badge state big">{STATE_LABELS[g.state]}</span>
      </div>
      <StateTracker state={g.state} />
      {!member && <JoinBox g={g} />}
      <div className="tabs" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {tab === 'Overview' && <Overview g={g} member={member} act={act} />}
      {tab === 'Members' && <Members g={g} act={act} />}
      {tab === 'Chat' && <Chat g={g} member={member} act={act} />}
      {tab === 'Get acquainted' && <Acquainted g={g} member={member} act={act} />}
      {tab === 'Rules & commitments' && <Rules g={g} member={member} act={act} />}
      {tab === 'Lenders' && <Lenders g={g} member={member} act={act} />}
    </>
  );
}

type Act = (fn: (d: ReturnType<typeof useStore>['state']) => void) => void;
interface P { g: Group; act: Act; member?: boolean }

function JoinBox({ g }: { g: Group }) {
  const { state, update } = useStore();
  const me = state.currentUserId!;
  const [intro, setIntro] = useState('');
  const pending = g.requests.some((r) => r.userId === me);
  const full = g.memberIds.length >= g.maxMembers;
  if (commitmentsEffective(g) || g.state === 'closed') return <Notice>This group is no longer accepting members.</Notice>;
  if (pending) return <Notice title="Request sent">The group owner will review it. Joining is social only and creates no financial obligation.</Notice>;
  return (
    <div className="card">
      <h3>Request to join</h3>
      <p className="muted">Joining a group doesn't make you liable for anything. Financial commitments are separate, explained in full, and need your own explicit acceptance.</p>
      <textarea placeholder="Introduce yourself to the group (optional)" value={intro} onChange={(e) => setIntro(e.target.value)} />
      <button className="primary" disabled={full} onClick={() => update((d) => A.requestJoin(d, g.id, intro))}>{full ? 'Group is full' : 'Request to join'}</button>
    </div>
  );
}

function Overview({ g, member, act }: P) {
  const { state } = useStore();
  const me = state.currentUserId!;
  const isOwner = me === g.ownerId;
  const checks = advanceChecks(g);
  const next = nextState(g.state);
  const lk = leaveKind(g);
  return (
    <>
      <p>{g.description}</p>
      <p><strong>Goal:</strong> {g.goalTitle}{g.goalAmount > 0 && ` · target ${money(g.goalAmount)}`} · {g.memberIds.length}/{g.maxMembers} members</p>

      <section className="card">
        <h3>What sort of loan this group is planning</h3>
        <dl className="facts">
          <dt>Planned loan type</dt><dd><strong>{ARRANGEMENT_LABELS[g.arrangement]}</strong></dd>
          <dt>For</dt><dd>{g.goalTitle}</dd>
          <dt>Target amount</dt><dd>{g.goalAmount > 0 ? money(g.goalAmount) : 'No money — practice group'}</dd>
          <dt>Status</dt><dd>{g.state === 'funded' ? 'Funded' : 'Still exploring — no lender loan exists yet and nothing is owed'}</dd>
        </dl>
        <Notice kind={g.arrangement === 'joint' ? 'warn' : 'info'} title={ARRANGEMENT_LABELS[g.arrangement]}>{ARRANGEMENT_EXPLAINERS[g.arrangement]}</Notice>
        <p className="muted">Discussion, proposal, member agreement, and an actual lender-issued loan are different things. Right now this group is at “{STATE_LABELS[g.state]}”{g.state === 'funded' ? '' : ' — no lender loan exists and nothing is owed'}.</p>
        <p className="muted">See what a proposed payment would do to your own budget in <a href="#/finances">My Finances</a> — only your own obligation counts there.</p>
        {isOwner && !commitmentsEffective(g) && g.state !== 'closed' && (
          <label>Change arrangement (owner only; resets everyone's acknowledgments)
            <select value={g.arrangement} onChange={(e) => { if (confirm('Changing the arrangement resets all acknowledgments and referral consents. Continue?')) act((d) => A.setArrangement(d, g.id, e.target.value as FinancingArrangement)); }}>
              {(Object.keys(ARRANGEMENT_LABELS) as FinancingArrangement[]).map((a) => <option key={a} value={a}>{ARRANGEMENT_LABELS[a]}</option>)}
            </select>
          </label>
        )}
      </section>

      {member && next && (
        <section className="card">
          <h3>Next step: {STATE_LABELS[next]}</h3>
          <ul className="checks">{checks.map((c) => <li key={c.text} className={c.ok ? 'ok' : ''}>{c.ok ? '✓' : '○'} {c.text}</li>)}</ul>
          {isOwner
            ? <button className="primary" disabled={!canAdvance(g)} onClick={() => act((d) => A.advance(d, g.id))}>{next === 'submitted' ? 'Submit referral' : `Move to ${STATE_LABELS[next]}`}</button>
            : <p className="muted">Only the group owner moves the group forward, and only when these are met.</p>}
        </section>
      )}

      {g.state === 'submitted' && member && (
        <section className="card">
          <h3>Application submitted</h3>
          <p>The lender, not this app, decides. Use these buttons to preview each outcome.</p>
          <button onClick={() => act((d) => A.simulateLenderDecision(d, g.id, true))}>Lender approves and funds</button>{' '}
          <button onClick={() => act((d) => A.simulateLenderDecision(d, g.id, false))}>Lender declines</button>
        </section>
      )}
      {g.state === 'funded' && <Notice kind="warn" title="Funded">Commitments are now effective. Leaving the social group no longer ends any obligation to the lender or to other members. Contact the lender about repayment.</Notice>}

      {isOwner && g.requests.length > 0 && (
        <section className="card">
          <h3>Membership requests</h3>
          {g.requests.map((r) => (
            <div key={r.userId} className="row between wrap">
              <div><a href={`#/profile/${r.userId}`}>{state.users[r.userId].name}</a><p className="muted">{r.intro || 'No introduction.'}</p></div>
              <div><button className="primary" onClick={() => act((d) => A.decideRequest(d, g.id, r.userId, true))}>Admit</button> <button onClick={() => act((d) => A.decideRequest(d, g.id, r.userId, false))}>Decline</button></div>
            </div>
          ))}
          <p className="muted">Admitting someone resets everyone's earlier acknowledgments, since the group changed.</p>
        </section>
      )}

      {member && g.state !== 'closed' && (
        <section className="card">
          <h3>Leaving or changing the group</h3>
          {lk === 'free'
            ? <p>Before funding, leaving is just a social exit. No financial obligation exists yet. The remaining members will need to re-acknowledge.</p>
            : <p>This group is funded. You can't remove yourself here: leaving the chat would not release you from obligations to the lender or members.</p>}
          <button disabled={lk === 'blocked'} onClick={() => { if (confirm('Leave this group?')) act((d) => A.leaveGroup(d, g.id, me)); }}>Leave group</button>
          {isOwner && <button onClick={() => act((d) => A.closeGroup(d, g.id, 'cancelled'))}>Cancel group</button>}
          {isOwner && g.state === 'funded' && <button onClick={() => act((d) => A.closeGroup(d, g.id, 'completed'))}>Mark completed</button>}
        </section>
      )}

      {member && <section className="card preview">
        <h3>Preview controls</h3>
        <p className="muted">In a real group, other people respond for themselves. This button fills in their acknowledgments and answers so you can walk the whole flow alone. You can also switch person in the header.</p>
        <button onClick={() => act((d) => A.demoOthersRespond(d, g.id))}>Have other members respond</button>
      </section>}

      <h3>Activity</h3>
      <ul className="log">{[...g.log].reverse().map((l, i) => <li key={i}>{new Date(l.ts).toLocaleDateString()} · {l.text}</li>)}</ul>
    </>
  );
}

function Members({ g, act }: P) {
  const { state } = useStore();
  const me = state.currentUserId!;
  const isOwner = me === g.ownerId;
  return (
    <>
      <p className="muted">{g.memberIds.length} member{g.memberIds.length === 1 ? '' : 's'}. Income only shows if that member chose to share it with this group (they set that in this group's Chat tab).</p>
      <ul className="member-list">
        {g.memberIds.map((id) => {
          const u = state.users[id];
          const shown = incomeVisibleTo(u, me, g);
          return (
            <li key={id}>
              <Avatar name={u.name} />
              <div className="member-main">
                <div className="row wrap"><a href={`#/profile/${id}`}><strong>{u.name}</strong></a>{id === g.ownerId && <span className="badge">owner</span>}{u.beginner && <span className="badge good">Newcomer</span>}</div>
                <small className="muted">{u.goal}</small>
                <div className="row wrap"><VerifBadge label="Identity" v={u.identity} /><VerifBadge label="Employment" v={u.employment} /></div>
                <small className="muted">Income: {shown && u.income ? `${money(u.income)} (self-reported, shared with this group)` : 'private'} · {u.records.length} commitment records · <a href={`#/profile/${id}`}>View in context</a></small>
              </div>
              {isOwner && id !== me && !commitmentsEffective(g) && <button onClick={() => act((d) => A.removeMember(d, g.id, id))}>Remove member</button>}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Chat({ g, member, act }: P) {
  const { state } = useStore();
  const [text, setText] = useState('');
  const [ann, setAnn] = useState(false);
  const me = state.currentUserId!;
  const myUser = state.users[me];
  const sharingIncome = !!myUser?.sharedIncomeWith.includes(g.id);
  return (
    <>
      {member && (
        <section className="card">
          <h3>Sharing your income with this group</h3>
          <p className="muted">Your income is <strong>private by default</strong>. Sharing is per group and set here, in the chat of the group it's for — only current members of {g.name} could see it, and you can turn it off any time. Lenders don't see it unless you separately opt in during their application.</p>
          {myUser?.income ? (
            <label className="check">
              <input type="checkbox" checked={sharingIncome} onChange={(e) => act((d) => A.setIncomeShare(d, g.id, e.target.checked))} />
              Share my income ({money(myUser.income)}/year, self-reported) with members of {g.name} — currently {sharingIncome ? 'shared with this group' : 'private'}
            </label>
          ) : (
            <p className="muted">You haven't added an income yet, so there's nothing to share. Add it on your <a href="#/profile">Profile</a> (it stays private until you turn sharing on here).</p>
          )}
        </section>
      )}
      <div className="chat">
        {g.messages.map((m) => (
          <div key={m.id} className={`msg ${m.announcement ? 'announce' : ''} ${m.userId === me ? 'mine' : ''}`}>
            <small><strong>{state.users[m.userId]?.name}</strong>{m.announcement && ' · announcement'} · {new Date(m.ts).toLocaleString()}</small>
            <div>{m.text}</div>
          </div>
        ))}
        {!g.messages.length && <p className="muted">No messages yet. Say hello.</p>}
      </div>
      {member ? (
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; act((d) => A.postMessage(d, g.id, text.trim(), ann)); setText(''); }}>
          <input style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" aria-label="Message" />
          {me === g.ownerId && <label className="check"><input type="checkbox" checked={ann} onChange={(e) => setAnn(e.target.checked)} /> Announcement</label>}
          <button className="primary">Send</button>
        </form>
      ) : <p className="muted">Join the group to chat.</p>}
    </>
  );
}

function Acquainted({ g, member, act }: P) {
  const { state } = useStore();
  const me = state.currentUserId!;
  const [ans, setAns] = useState<Record<string, string>>({});
  const [pq, setPq] = useState(''); const [po, setPo] = useState('');
  return (
    <>
      <h3>Guided questions</h3>
      <p className="muted">Answer in your own words. There are no right answers, and you don't have to share anything you want to keep private.</p>
      {g.questions.map((q) => (
        <div key={q.id} className="card">
          <strong>{q.prompt}</strong>
          {Object.entries(q.answers).map(([uid, a]) => <p key={uid} className="answer"><em>{state.users[uid]?.name}:</em> {a}</p>)}
          {member && !q.answers[me] && (
            <div className="row"><input style={{ flex: 1 }} value={ans[q.id] ?? ''} onChange={(e) => setAns({ ...ans, [q.id]: e.target.value })} placeholder="Your answer" />
              <button onClick={() => { if (ans[q.id]?.trim()) act((d) => A.answerQuestion(d, g.id, q.id, ans[q.id].trim())); }}>Answer</button></div>
          )}
        </div>
      ))}

      <h3>Polls</h3>
      <Notice>Polls help a group decide things like meeting times. A poll result can never commit an individual to a financial obligation. Each person accepts those on the Rules &amp; commitments tab.</Notice>
      {g.polls.map((p) => {
        const total = Object.keys(p.votes).length;
        return (
          <div key={p.id} className="card">
            <strong>{p.question}</strong> {p.closed && <span className="badge">Closed</span>}
            {p.options.map((o, i) => {
              const n = Object.values(p.votes).filter((v) => v === i).length;
              return (
                <div key={i} className="poll-opt">
                  <button disabled={!member || p.closed} className={p.votes[me] === i ? 'on' : ''} onClick={() => act((d) => A.vote(d, g.id, p.id, i))}>{o}</button>
                  <div className="bar"><span style={{ width: total ? `${(n / total) * 100}%` : 0 }} /></div><small>{n}</small>
                </div>
              );
            })}
            {me === g.ownerId && !p.closed && <button className="link" onClick={() => act((d) => A.closePoll(d, g.id, p.id))}>Close poll</button>}
          </div>
        );
      })}
      {member && (
        <form className="card" onSubmit={(e) => { e.preventDefault(); const opts = po.split(',').map((s) => s.trim()).filter(Boolean); if (pq.trim() && opts.length >= 2) { act((d) => A.createPoll(d, g.id, pq.trim(), opts)); setPq(''); setPo(''); } }}>
          <strong>Start a poll</strong>
          <input value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Question" />
          <input value={po} onChange={(e) => setPo(e.target.value)} placeholder="Options, comma separated" />
          <button>Create poll</button>
        </form>
      )}
    </>
  );
}

function Rules({ g, member, act }: P) {
  const { state } = useStore();
  const me = state.currentUserId!;
  const [rule, setRule] = useState('');
  const [c, setC] = useState({ title: '', description: '', kind: 'low-stakes' as 'low-stakes' | 'financial', maxExposure: 500 });
  const [understood, setUnderstood] = useState<Record<string, boolean>>({});
  return (
    <>
      <h3>Group rules</h3>
      <p className="muted">Documented by the group. Consider a grace period, a resolution procedure, a maximum individual exposure, and what happens if someone can't pay. Changing rules resets acknowledgments.</p>
      <ul>{g.rules.map((r) => <li key={r.id}>{r.text} {member && <button className="link" onClick={() => act((d) => A.removeRule(d, g.id, r.id))}>remove</button>}</li>)}</ul>
      {!g.rules.length && <p className="muted">No rules yet.</p>}
      {member && <form className="row" onSubmit={(e) => { e.preventDefault(); if (rule.trim()) { act((d) => A.addRule(d, g.id, rule.trim())); setRule(''); } }}>
        <input style={{ flex: 1 }} value={rule} onChange={(e) => setRule(e.target.value)} placeholder="Add a rule" /><button>Add rule</button></form>}

      <h3>Proposed commitments</h3>
      <Notice kind="warn" title="Read before accepting a financial commitment">
        {g.arrangement === 'joint' && <><strong>This group is exploring joint liability.</strong> Depending on the lender's contract, you could be asked to cover another member's missed payments and be left unable to pay your own essential expenses. Read exactly who owes what before accepting. </>}
        {g.arrangement === 'individual' && <>This group is exploring <strong>individual loans</strong>: you would owe only your own loan, never another member's. </>}
        {g.arrangement === 'shared-fund' && <>This group is exploring a <strong>shared fund</strong>: the same money cannot be lent to everyone at once, and withdrawals, ownership, exits, and shortfalls need agreed rules first. This app holds no money. </>}
        Shared liability can mean you are asked to cover a partner's missed payments. If one member can't pay, losses can cascade to others. Collateral, guarantees, reserves, and written agreements <strong>do not guarantee</strong> anyone recovers money from someone who cannot pay. Accepting is voluntary. Nobody, including a majority vote, can bind you. You can test the impact privately in <a href="#/finances">My Finances</a> first.
      </Notice>
      {g.commitments.map((cm) => {
        const mine = cm.acks[me];
        const eff = commitmentsEffective(g);
        return (
          <div key={cm.id} className="card">
            <div className="row between"><strong>{cm.title}</strong><span className={`badge ${cm.kind === 'financial' ? 'warnb' : 'good'}`}>{cm.kind === 'financial' ? 'Financial' : 'Low-stakes'}</span></div>
            <p>{cm.description}</p>
            {cm.kind === 'financial' && <p><strong>Maximum possible exposure per member:</strong> {money(cm.maxExposure ?? 0)}. This figure is a group estimate. Actual obligations are set by the lender's agreement with you.</p>}
            <p className="muted">{eff ? 'Effective.' : 'Not effective: nothing is owed.'} Accepted by {g.memberIds.filter((m) => cm.acks[m] === 'accepted').length} of {g.memberIds.length}.</p>
            <ul className="acks">{g.memberIds.map((m) => <li key={m}>{state.users[m].name}: {cm.acks[m] === 'accepted' ? '✓ accepted' : cm.acks[m] === 'declined' ? '✗ declined' : 'no decision'}</li>)}</ul>
            {member && !eff && (
              <div>
                {cm.kind === 'financial' && <label className="check"><input type="checkbox" checked={!!understood[cm.id]} onChange={(e) => setUnderstood({ ...understood, [cm.id]: e.target.checked })} /> I understand that I could lose up to {money(cm.maxExposure ?? 0)}, that this may affect other members, and that nothing guarantees recovery.</label>}
                <button className="primary" disabled={(cm.kind === 'financial' && !understood[cm.id]) || mine === 'accepted'} onClick={() => act((d) => A.ackCommitment(d, g.id, cm.id, 'accepted'))}>{mine === 'accepted' ? 'You accepted' : 'I accept this commitment'}</button>{' '}
                <button disabled={mine === 'declined'} onClick={() => act((d) => A.ackCommitment(d, g.id, cm.id, 'declined'))}>{mine === 'declined' ? 'You declined' : 'I decline'}</button>
                {commitmentFullyAccepted(g, cm) && <span className="badge good"> Everyone accepted</span>}
              </div>
            )}
          </div>
        );
      })}
      {member && !commitmentsEffective(g) && (
        <form className="card" onSubmit={(e) => { e.preventDefault(); if (c.title.trim()) { act((d) => A.proposeCommitment(d, g.id, { ...c, maxExposure: c.kind === 'financial' ? c.maxExposure : undefined })); setC({ ...c, title: '', description: '' }); } }}>
          <strong>Propose a commitment</strong>
          <input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} placeholder="Title" />
          <textarea value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} placeholder="What exactly is being asked?" />
          <select value={c.kind} onChange={(e) => setC({ ...c, kind: e.target.value as 'low-stakes' | 'financial' })}><option value="low-stakes">Low-stakes (no money)</option><option value="financial">Financial</option></select>
          {c.kind === 'financial' && <label>Maximum exposure per member (USD)<input type="number" min={0} value={c.maxExposure} onChange={(e) => setC({ ...c, maxExposure: +e.target.value })} /></label>}
          <p className="muted">Proposing is only a proposal. It binds nobody until each person accepts for themselves.</p>
          <button>Propose</button>
        </form>
      )}
    </>
  );
}

function Lenders({ g, member, act }: P) {
  const { state } = useStore();
  const me = state.currentUserId!;
  const chosen = g.referral ? getLender(g.referral.lenderId) : undefined;
  const open = g.state === 'organizing' || g.state === 'ready';
  return (
    <>
      <Notice kind="warn" title="About these lenders">A group doesn't make approval more likely than applying alone. Each lender does its own underwriting and decides. Fit below describes published criteria. It is not a prediction.</Notice>
      {!open && !chosen && <p className="muted">Lender connections open once the group reaches Organizing.</p>}
      <div className="grid">
        {listLenders().map((l) => (
          <div key={l.id} className={`card ${chosen?.id === l.id ? 'chosen' : ''}`}>
            <div className="row between"><h3>{l.name}</h3></div>
            <p>{l.blurb}</p>
            <ul className="checks">{lenderFit(g, l).map((f) => <li key={f.text} className={f.ok ? 'ok' : ''}>{f.ok ? '✓' : '○'} {f.text}</li>)}</ul>
            <details><summary>Requirements</summary><ul>{l.requirements.map((r) => <li key={r}>{r}</li>)}</ul></details>
            {member && open && me === g.ownerId && <button disabled={chosen?.id === l.id} onClick={() => act((d) => A.chooseLender(d, g.id, l.id))}>{chosen?.id === l.id ? 'Selected' : 'Prepare referral'}</button>}
          </div>
        ))}
      </div>
      {chosen && g.referral && (
        <section className="card">
          <h3>Review what would be shared with {chosen.name}</h3>
          <ul>
            <li>Group name, goal and target: <strong>{g.name}</strong>, {g.goalTitle}, {money(g.goalAmount)}</li>
            <li>Members: {g.memberIds.map((m) => state.users[m].name).join(', ')}</li>
            <li>Identity verification status of each member</li>
            <li>{g.rules.length} group rules and {g.commitments.length} commitments (titles and exposure limits)</li>
          </ul>
          <p className="muted">Not shared: income (unless you've shared it with this group, and even then only with your separate opt-in during the lender's own application), chat history, poll answers, commitment records.</p>
          <p><strong>Consent:</strong> {g.referral.consents.length} of {g.memberIds.length} members have consented.</p>
          {member && !commitmentsEffective(g) && g.state !== 'submitted' && (
            <label className="check"><input type="checkbox" checked={g.referral.consents.includes(me)} onChange={(e) => act((d) => A.consentReferral(d, g.id, e.target.checked))} /> I consent to sharing this summary with {chosen.name}. I understand the lender decides and nothing is guaranteed.</label>
          )}
          {g.state === 'submitted' && <p>Referral submitted.</p>}
        </section>
      )}
    </>
  );
}
