import { Avatar, Notice } from '../components/ui';
import { isMember } from '../rules';
import { useStore } from '../store';

/** Section 1: Community — social first. No borrowing, no financial disclosure. */
export default function Community() {
  const { state } = useStore();
  const me = state.currentUserId!;
  const groups = Object.values(state.groups).filter((g) => g.state !== 'closed');
  const mine = groups.filter((g) => isMember(g, me));
  const recent = mine
    .flatMap((g) => g.messages.map((m) => ({ g, m })))
    .sort((a, b) => b.m.ts - a.m.ts)
    .slice(0, 8);
  const polls = mine.flatMap((g) => g.polls.filter((p) => !p.closed).map((p) => ({ g, p })));
  const people = Object.values(state.users).filter((u) => u.id !== me);

  return (
    <>
      <h1>Community</h1>
      <p className="muted">Get to know people before money is ever discussed. Taking part socially never pressures you to borrow or to share private financial details.</p>

      <h2>Member introductions</h2>
      <div className="grid">
        {people.map((u) => (
          <div key={u.id} className="card">
            <div className="row"><Avatar name={u.name} /><div><a href={`#/profile/${u.id}`}><strong>{u.name}</strong></a>{u.beginner && ' · Newcomer'}<br /><small className="muted">{u.location}</small></div></div>
            <p>{u.bio || 'No introduction yet.'}</p>
            <p className="muted">Goal: {u.goal || '—'}</p>
            {u.interests.length > 0 && <p>{u.interests.map((i) => <span key={i} className="badge">{i}</span>)}</p>}
          </div>
        ))}
      </div>

      <h2>Conversation in your groups</h2>
      {!mine.length && <Notice>You haven't joined a group yet. <a href="#/">Discover Groups</a> (see its Start here subsection) — joining is social only and creates no financial obligation.</Notice>}
      <div className="chat" style={{ maxHeight: 'none' }}>
        {recent.map(({ g, m }) => (
          <div key={m.id} className={`msg ${m.announcement ? 'announce' : ''}`}>
            <small><strong>{state.users[m.userId]?.name}</strong> in <a href={`#/group/${g.id}`}>{g.name}</a> · {new Date(m.ts).toLocaleString()}</small>
            <div>{m.text}</div>
          </div>
        ))}
        {mine.length > 0 && !recent.length && <p className="muted">No messages yet. Open a group and say hello.</p>}
      </div>

      <h2>Open polls &amp; guided questions</h2>
      <Notice>Polls and questions help a group decide things like meeting times. A poll result can never commit anyone to a financial obligation.</Notice>
      {polls.map(({ g, p }) => (
        <div key={p.id} className="card"><strong>{p.question}</strong><p className="muted">in <a href={`#/group/${g.id}`}>{g.name}</a> · {Object.keys(p.votes).length} votes so far. Vote on the group's Get acquainted tab.</p></div>
      ))}
      {mine.map((g) => (
        <div key={g.id} className="card">
          <strong><a href={`#/group/${g.id}`}>{g.name}</a></strong>
          {g.questions.map((q) => <p key={q.id} className="answer"><em>{q.prompt}</em><br /><span className="muted">{Object.keys(q.answers).length} answer(s) — add yours on the group's Get acquainted tab.</span></p>)}
        </div>
      ))}
    </>
  );
}
