import { useState } from 'react';
import * as A from '../actions';
import { Avatar, money, Notice, VerifBadge } from '../components/ui';
import { canViewHistory } from '../rules';
import { useStore } from '../store';
import type { RecordKind } from '../types';

const KIND: Record<RecordKind, string> = {
  completed: 'Completed as agreed', late: 'Late or missed', 'delayed-explained': 'Delayed, explained',
  renegotiated: 'Renegotiated', unresolved: 'Unresolved', disputed: 'Disputed',
};

export default function Profile({ id }: { id: string }) {
  const { state, update } = useStore();
  const me = state.currentUserId!;
  const u = state.users[id];
  const [resp, setResp] = useState<Record<string, string>>({});
  if (!u) return <p>Profile not found.</p>;
  const mine = u.id === me;
  const visible = canViewHistory(me) ? u.records : [];
  const act = (fn: (d: typeof state) => void) => update(fn);

  return (
    <>
      <div className="row"><Avatar name={u.name} /><div><h1>{u.name}</h1><p className="muted">{u.location}{u.beginner && ' · Newcomer'}</p></div></div>
      <p>{u.bio}</p>
      <div className="row wrap">
        <VerifBadge label="Identity" v={u.identity} />
        <VerifBadge label="Employment" v={u.employment} />
      </div>
      <p className="muted">Identity verification only suggests this is a real person. It says nothing about ability to repay. Missing information is not a negative signal.</p>
      <dl className="facts">
        <dt>Goal</dt><dd>{u.goal || '—'}</dd><dt>Experience (self-reported)</dt><dd>{u.experience || '—'}</dd><dt>Interests</dt><dd>{u.interests.join(', ') || '—'}</dd>
        <dt>Income</dt><dd>{mine ? (u.income ? `${money(u.income)} (self-reported, private by default)` : 'Not provided') : <em>Private. Shared only with groups the owner chooses.</em>}</dd>
      </dl>

      {mine && (
        <section className="card">
          <h2>Your privacy controls</h2>
          <label>Annual income (optional, USD)<input type="number" value={u.income ?? ''} onChange={(e) => act((d) => A.updateProfile(d, { income: e.target.value ? +e.target.value : undefined }))} /></label>
          <p className="muted">To share income with a specific group, open that group and use "Sharing your income with this group" at the top of its Chat tab — sharing is per group, off by default, and revocable there. Lenders only ever see it if you opt in during a referral.</p>
          {u.identity !== 'verified' && <button onClick={() => act((d) => A.requestVerification(d))}>Run identity verification</button>}
        </section>
      )}

      <section>
        <h2>Commitment history</h2>
        <Notice>No score and no ranking. These are individual events with context, visible to everyone in the community — including newcomers, before you share a group — and they can't be hidden, but the subject can respond to or dispute any record. Income and budgets stay private and are never shown here. A record about a small commitment doesn't show someone can repay a large loan.</Notice>
        {!visible.length && <p className="muted">No records yet.</p>}
        {visible.map((r) => (
          <article key={r.id} className={`card record k-${r.kind}`}>
            <div className="row between"><strong>{r.title}</strong><span className="badge">{KIND[r.kind]}</span></div>
            <small className="muted">{r.date}</small>
            <p>{r.context}</p>
            {r.response && <p className="response"><strong>{mine ? 'Your' : 'Their'} response:</strong> {r.response}</p>}
            {r.dispute && <p className="response"><strong>Disputed</strong> ({r.dispute.status}): {r.dispute.text}</p>}
            {mine && (
              <div className="record-tools">
                <input placeholder="Add your response" value={resp[r.id] ?? ''} onChange={(e) => setResp({ ...resp, [r.id]: e.target.value })} />
                <button onClick={() => { act((d) => A.respondToRecord(d, r.id, resp[r.id] ?? '')); }}>Respond</button>
                <button onClick={() => act((d) => A.disputeRecord(d, r.id, resp[r.id] || 'I believe this is inaccurate.'))}>Dispute as inaccurate</button>
              </div>
            )}
          </article>
        ))}
      </section>
    </>
  );
}
