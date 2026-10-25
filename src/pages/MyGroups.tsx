import { ARRANGEMENT_LABELS, STATE_LABELS } from '../rules';
import { useStore } from '../store';
import GroupCard from './GroupCard';

export default function MyGroups() {
  const { state } = useStore();
  const me = state.currentUserId!;
  const mine = Object.values(state.groups).filter((g) => g.memberIds.includes(me));
  const pending = Object.values(state.groups).filter((g) => g.requests.some((r) => r.userId === me));
  const owned = Object.values(state.groups).filter((g) => g.ownerId === me && g.requests.length);
  const awaitingMe = mine.flatMap((g) => g.commitments.filter((c) => !c.acks[me]).map((c) => ({ g, c })));
  const acceptedByAll = mine.flatMap((g) => g.commitments.filter((c) => g.memberIds.every((m) => c.acks[m] === 'accepted')).map((c) => ({ g, c })));

  return (
    <>
      <h1>My Groups</h1>
      <p className="muted">Your groups, proposals, and acknowledgements. A discussion or proposal is not an agreement, and an agreement here is not a lender-issued loan — loans only exist if a lender issues one.</p>
      {owned.length > 0 && <div className="notice info"><strong>Requests waiting on you</strong><div>{owned.map((g) => <a key={g.id} href={`#/group/${g.id}`}>{g.name} ({g.requests.length})</a>)}</div></div>}

      <h2>Proposals awaiting your decision</h2>
      {awaitingMe.map(({ g, c }) => (
        <div key={c.id} className="card">
          <strong>{c.title}</strong> <span className={`badge ${c.kind === 'financial' ? 'warnb' : 'good'}`}>{c.kind === 'financial' ? 'Financial' : 'Low-stakes'}</span>
          <p className="muted">in <a href={`#/group/${g.id}`}>{g.name}</a> · {ARRANGEMENT_LABELS[g.arrangement]} · {STATE_LABELS[g.state]}</p>
          <p className="muted">No decision recorded by you. Proposing bound nobody — accept or decline for yourself on the group's Rules &amp; commitments tab, after testing it in <a href="#/finances">My Finances</a> if it's financial.</p>
        </div>
      ))}
      {!awaitingMe.length && <p className="muted">Nothing is waiting on you.</p>}

      <h2>Commitments everyone has accepted</h2>
      {acceptedByAll.map(({ g, c }) => (
        <div key={c.id} className="card"><strong>{c.title}</strong><p className="muted">in <a href={`#/group/${g.id}`}>{g.name}</a> · {g.state === 'funded' ? 'Effective' : 'Agreed by all members, but not effective — nothing is owed unless a lender funds the group'}</p></div>
      ))}
      {!acceptedByAll.length && <p className="muted">None yet.</p>}

      <h2>Your groups</h2>
      <div className="grid">{mine.map((g) => <GroupCard key={g.id} g={g} />)}</div>
      {!mine.length && <p className="muted">You haven't joined a group yet. <a href="#/">Browse Discover Groups</a> — its Start here subsection is the beginner pathway.</p>}
      {pending.length > 0 && <><h2>Pending requests</h2><div className="grid">{pending.map((g) => <GroupCard key={g.id} g={g} />)}</div></>}
    </>
  );
}
